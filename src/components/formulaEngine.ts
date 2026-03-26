// ═══════════════════════════════════════════════════════════════════════════════
// Formula Evaluation Engine
// Parses contentEditable DOM into AST and evaluates all 87 functions
// ═══════════════════════════════════════════════════════════════════════════════

// ── Types ────────────────────────────────────────────────────────────────────

export type FormulaValue = string | number | boolean | null | any[] | Record<string, any>;

/** A segment of formula output — either normal text or an error */
export interface FormulaSegment {
  text: string;
  isError: boolean;
}

/** Result from evaluateFormulaSegments */
export interface FormulaResult {
  segments: FormulaSegment[];
  errors: string[];  // Short human-readable error messages
}

export type ASTNode =
  | { kind: 'literal'; value: FormulaValue }
  | { kind: 'function'; name: string; args: ASTNode[][] }
  | { kind: 'operator'; op: string }
  | { kind: 'keyword'; name: string };

interface AvailableStep {
  id: string;
  name: string;
  fields: Record<string, any>;
}

// ── Error sentinel ───────────────────────────────────────────────────────────

const ERROR_PREFIX = '#ERROR:';
const ERR_OPEN = '{{ERR}}';
const ERR_CLOSE = '{{/ERR}}';

function isError(val: FormulaValue): boolean {
  return typeof val === 'string' && (val.startsWith(ERROR_PREFIX) || val.includes(ERR_OPEN));
}

function makeError(msg: string): string {
  return `${ERROR_PREFIX} ${msg}`;
}

/** Wrap a value in error markers so it renders red in preview */
function markBadValue(val: string): string {
  return `${ERR_OPEN}${val}${ERR_CLOSE}`;
}

/** Custom error class that carries the indices of ALL bad arguments */
class ArgError extends Error {
  badIndices: number[];
  shortMessage: string;
  constructor(badIndices: number[], shortMessage: string = '') {
    super(`Bad arguments at indices ${badIndices.join(', ')}`);
    this.badIndices = badIndices;
    this.shortMessage = shortMessage;
  }
}

/** Check if a value is a valid number (without throwing) */
function isValidNumber(val: FormulaValue): boolean {
  if (typeof val === 'number') return true;
  if (typeof val === 'boolean') return true;
  if (val === null || val === undefined) return true;
  if (typeof val === 'string') {
    if (isError(val)) return false;
    const trimmed = val.trim();
    if (trimmed === '') return true;
    return !isNaN(Number(trimmed));
  }
  if (Array.isArray(val)) return true;
  return false;
}

/** Validate ALL args are numeric, throw ArgError with ALL bad indices if any fail */
function requireAllNumbers(args: FormulaValue[], funcName: string = ''): number[] {
  const badIndices: number[] = [];
  const numbers: number[] = [];
  for (let i = 0; i < args.length; i++) {
    if (isValidNumber(args[i])) {
      numbers.push(toNumber(args[i]));
    } else {
      badIndices.push(i);
      numbers.push(0); // placeholder
    }
  }
  if (badIndices.length > 0) {
    const msg = funcName
      ? `${funcName}() expects numbers only`
      : `Expected numbers only`;
    throw new ArgError(badIndices, msg);
  }
  return numbers;
}

// ── Coercion Helpers ─────────────────────────────────────────────────────────

/** Strict: requires a single value to be numeric, throws ArgError if not */
function requireNumber(val: FormulaValue, argIndex: number, funcName: string = ''): number {
  if (!isValidNumber(val)) {
    const msg = funcName
      ? `${funcName}() expects numbers only`
      : `Expected numbers only`;
    throw new ArgError([argIndex], msg);
  }
  return toNumber(val);
}

function toNumber(val: FormulaValue): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (val === null || val === undefined) return 0;
  if (typeof val === 'string') {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }
  if (Array.isArray(val)) return val.length;
  return 0;
}

function toBoolean(val: FormulaValue): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') return val !== '';
  if (Array.isArray(val)) return val.length > 0;
  return true;
}

function toArray(val: FormulaValue): any[] {
  if (Array.isArray(val)) return val;
  if (val === null || val === undefined) return [];
  if (typeof val === 'object') return Object.values(val);
  return [val];
}

function toString(val: FormulaValue): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) return JSON.stringify(val);
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function formatOutput(val: FormulaValue): string {
  if (val === null) return 'null';
  if (val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) return JSON.stringify(val);
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

// ── DOM to AST Parser ────────────────────────────────────────────────────────

interface DOMNodeInfo {
  type: 'text' | 'tag' | 'br';
  text?: string;
  tagData?: any;
  pairId?: string;
  pairRole?: string;
  funcName?: string;
  element?: HTMLElement;
  resolvedValue?: FormulaValue;
}

function flattenDOM(editable: HTMLDivElement, availableSteps: AvailableStep[]): DOMNodeInfo[] {
  const nodes: DOMNodeInfo[] = [];

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text) nodes.push({ type: 'text', text });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;

    if (el.tagName === 'BR') {
      nodes.push({ type: 'br', text: '\n' });
      return;
    }

    if (el.hasAttribute('data-tag')) {
      const tagData = JSON.parse(el.getAttribute('data-tag') || '{}');
      const pairId = el.getAttribute('data-pair-id') || undefined;
      const pairRole = el.getAttribute('data-pair-role') || undefined;
      const funcName = el.getAttribute('data-func-name') || undefined;

      if (tagData.type === 'step') {
        // Resolve step value
        const step = availableSteps?.find(s => s.name === tagData.stepName || s.id === tagData.id);
        let val: FormulaValue = tagData.displayValue || '';
        if (step && tagData.path) {
          const pathParts = tagData.path.split('.');
          let current: any = step.fields;
          for (const p of pathParts) {
            if (current && typeof current === 'object' && p in current) {
              current = current[p];
            } else {
              current = undefined;
              break;
            }
          }
          if (current !== undefined) val = current; // preserve original type
        }
        nodes.push({ type: 'tag', tagData, resolvedValue: val });
      } else {
        nodes.push({ type: 'tag', tagData, pairId, pairRole, funcName, element: el });
      }
      return;
    }

    el.childNodes.forEach(walk);
  };

  editable.childNodes.forEach(walk);
  return nodes;
}

function parseNodesToAST(domNodes: DOMNodeInfo[]): ASTNode[] {
  const result: ASTNode[] = [];
  let i = 0;

  while (i < domNodes.length) {
    const node = domNodes[i];

    // Function open bracket
    if (node.pairRole === 'open' && node.pairId) {
      const pairId = node.pairId;
      const funcName = node.funcName || '';

      // Find matching close bracket
      let closeIdx = -1;
      let depth = 0;
      for (let j = i + 1; j < domNodes.length; j++) {
        if (domNodes[j].pairId === pairId && domNodes[j].pairRole === 'open') depth++;
        if (domNodes[j].pairId === pairId && domNodes[j].pairRole === 'close') {
          if (depth === 0) { closeIdx = j; break; }
          depth--;
        }
      }

      if (closeIdx === -1) {
        // No matching close, treat as literal
        result.push({ kind: 'literal', value: node.tagData?.value || '' });
        i++;
        continue;
      }

      // Collect inner nodes between open and close
      const innerNodes = domNodes.slice(i + 1, closeIdx);

      // Split on separators with same pairId
      const argGroups: DOMNodeInfo[][] = [[]];
      for (const inner of innerNodes) {
        if (inner.pairId === pairId && inner.pairRole === 'separator') {
          argGroups.push([]);
        } else {
          argGroups[argGroups.length - 1].push(inner);
        }
      }

      // Recursively parse each argument group
      const args = argGroups.map(group => parseNodesToAST(group));

      // Clean function name: remove trailing ( or )
      const cleanName = funcName.replace(/[()]/g, '').toLowerCase().replace(/_/g, '');

      result.push({ kind: 'function', name: cleanName, args });
      i = closeIdx + 1;
      continue;
    }

    // Skip stray separators/close brackets
    if (node.pairRole === 'separator' || node.pairRole === 'close') {
      i++;
      continue;
    }

    // Operator tag
    if (node.tagData?.type === 'operator') {
      result.push({ kind: 'operator', op: node.tagData.value });
      i++;
      continue;
    }

    // Keyword tag
    if (node.tagData?.type === 'keyword') {
      result.push({ kind: 'keyword', name: node.tagData.value?.toLowerCase() || '' });
      i++;
      continue;
    }

    // Step tag (resolved value)
    if (node.tagData?.type === 'step') {
      result.push({ kind: 'literal', value: node.resolvedValue ?? '' });
      i++;
      continue;
    }

    // Text node or BR
    if (node.type === 'text' || node.type === 'br') {
      const text = (node.text || '').replace(/\u00A0/g, ' ');
      if (text) result.push({ kind: 'literal', value: text });
      i++;
      continue;
    }

    // Variable tag or unknown
    if (node.tagData?.type === 'variable') {
      result.push({ kind: 'literal', value: node.tagData.value || '' });
      i++;
      continue;
    }

    // Fallback
    result.push({ kind: 'literal', value: node.tagData?.value || node.text || '' });
    i++;
  }

  return result;
}

// ── AST Evaluator ────────────────────────────────────────────────────────────

function evaluateNodes(nodes: ASTNode[]): FormulaValue {
  if (nodes.length === 0) return '';

  // Resolve all nodes to values, keeping operators
  const resolved: { value?: FormulaValue; op?: string }[] = [];
  for (const node of nodes) {
    if (node.kind === 'operator') {
      resolved.push({ op: node.op });
    } else {
      resolved.push({ value: evaluateNode(node) });
    }
  }

  // If no operators, concatenate as string or return single value
  const hasOperators = resolved.some(r => r.op !== undefined);
  if (!hasOperators) {
    if (resolved.length === 1) return resolved[0].value!;
    return resolved.map(r => toString(r.value!)).join('');
  }

  // Apply operator precedence
  return applyOperators(resolved);
}

function applyOperators(items: { value?: FormulaValue; op?: string }[]): FormulaValue {
  // Pass 1: not (unary prefix)
  let current = [...items];
  current = applyUnaryNot(current);

  // Pass 2: *, /, mod
  current = applyBinaryOps(current, ['*', '/', 'mod']);

  // Pass 3: +, -
  current = applyBinaryOps(current, ['+', '-']);

  // Pass 4: comparisons
  current = applyBinaryOps(current, ['=', '!=', '>', '<', '>=', '<=']);

  // Pass 5: and, or
  current = applyBinaryOps(current, ['and', 'or']);

  if (current.length === 1 && current[0].value !== undefined) return current[0].value;
  return current.map(r => r.op !== undefined ? r.op : toString(r.value!)).join('');
}

function applyUnaryNot(items: { value?: FormulaValue; op?: string }[]): { value?: FormulaValue; op?: string }[] {
  const result: { value?: FormulaValue; op?: string }[] = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].op === 'not' && i + 1 < items.length && items[i + 1].value !== undefined) {
      result.push({ value: !toBoolean(items[i + 1].value!) });
      i++;
    } else {
      result.push(items[i]);
    }
  }
  return result;
}

function applyBinaryOps(items: { value?: FormulaValue; op?: string }[], ops: string[]): { value?: FormulaValue; op?: string }[] {
  const result: { value?: FormulaValue; op?: string }[] = [];
  let i = 0;
  while (i < items.length) {
    if (items[i].op !== undefined && ops.includes(items[i].op!)) {
      // Binary op: combine with previous and next
      if (result.length > 0 && result[result.length - 1].value !== undefined && i + 1 < items.length && items[i + 1].value !== undefined) {
        const left = result.pop()!.value!;
        const right = items[i + 1].value!;
        try {
          // For arithmetic operators, validate both sides first
          const op = items[i].op!;
          if (['-', '*', '/', 'mod'].includes(op)) {
            const badIndices: number[] = [];
            if (!isValidNumber(left)) badIndices.push(0);
            if (!isValidNumber(right)) badIndices.push(1);
            if (badIndices.length > 0) {
              const leftText = formatOutput(left);
              const rightText = formatOutput(right);
              _collectedErrors.push(`"${op}" expects numbers only`);
              const markedLeft = badIndices.includes(0) ? markBadValue(leftText) : leftText;
              const markedRight = badIndices.includes(1) ? markBadValue(rightText) : rightText;
              result.push({ value: `${markedLeft} ${op} ${markedRight}` });
              i += 2;
              continue;
            }
          }
          result.push({ value: applyBinaryOp(op, left, right) });
        } catch (e: any) {
          if (e instanceof ArgError) {
            const badSet = new Set(e.badIndices);
            const leftText = formatOutput(left);
            const rightText = formatOutput(right);
            const markedLeft = badSet.has(0) ? markBadValue(leftText) : leftText;
            const markedRight = badSet.has(1) ? markBadValue(rightText) : rightText;
            result.push({ value: `${markedLeft} ${items[i].op!} ${markedRight}` });
          } else {
            result.push({ value: makeError(e.message || 'Operator error') });
          }
        }
        i += 2;
      } else {
        result.push(items[i]);
        i++;
      }
    } else {
      result.push(items[i]);
      i++;
    }
  }
  return result;
}

function applyBinaryOp(op: string, left: FormulaValue, right: FormulaValue): FormulaValue {
  switch (op) {
    case '+':
      if (typeof left === 'string' || typeof right === 'string') return toString(left) + toString(right);
      return toNumber(left) + toNumber(right);
    case '-': return requireNumber(left, 0) - requireNumber(right, 1);
    case '*': return requireNumber(left, 0) * requireNumber(right, 1);
    case '/': {
      const d = requireNumber(right, 1);
      return d === 0 ? makeError('Division by zero') : requireNumber(left, 0) / d;
    }
    case 'mod': {
      const d = requireNumber(right, 1);
      return d === 0 ? makeError('Division by zero') : requireNumber(left, 0) % d;
    }
    case '=': return left == right;
    case '!=': return left != right;
    case '>': return toNumber(left) > toNumber(right);
    case '<': return toNumber(left) < toNumber(right);
    case '>=': return toNumber(left) >= toNumber(right);
    case '<=': return toNumber(left) <= toNumber(right);
    case 'and': return toBoolean(left) && toBoolean(right);
    case 'or': return toBoolean(left) || toBoolean(right);
    default: return toString(left) + op + toString(right);
  }
}

function evaluateNode(node: ASTNode): FormulaValue {
  switch (node.kind) {
    case 'literal': return node.value;
    case 'keyword': return evaluateKeyword(node.name);
    case 'function': return evaluateFunction(node.name, node.args);
    case 'operator': return node.op;
  }
}

function evaluateKeyword(name: string): FormulaValue {
  switch (name) {
    case 'true': return true;
    case 'false': return false;
    case 'null': return null;
    case 'space': return ' ';
    case 'emptystring': return '';
    case 'newline': return '\n';
    default: return name;
  }
}

// ── Error collection (reset per evaluation) ──────────────────────────────────
let _collectedErrors: string[] = [];

// ── Function Implementations ─────────────────────────────────────────────────

function evaluateFunction(name: string, rawArgs: ASTNode[][]): FormulaValue {
  // For "if", use lazy evaluation
  if (name === 'if') return fnIf(rawArgs);
  if (name === 'switch') return fnSwitch(rawArgs);

  // Evaluate all args eagerly for other functions
  const args = rawArgs.map(argNodes => evaluateNodes(argNodes));

  try {
    // ── Text Functions ──
    switch (name) {
      case 'length': return fnLength(args);
      case 'lower': return toString(args[0] ?? '').toLowerCase();
      case 'upper': return toString(args[0] ?? '').toUpperCase();
      case 'trim': return toString(args[0] ?? '').trim();
      case 'substring': return fnSubstring(args);
      case 'replace': return fnReplace(args);
      case 'contains': return toString(args[0] ?? '').includes(toString(args[1] ?? ''));
      case 'split': return toString(args[0] ?? '').split(toString(args[1] ?? ','));
      case 'tostring': return toString(args[0] ?? '');
      case 'base64': {
        try { return btoa(toString(args[0] ?? '')); }
        catch { return makeError('Invalid input for base64'); }
      }

      // ── Math Functions ── (strict numeric validation)
      case 'sum': return fnSum(args);
      case 'average': return fnAverage(args);
      case 'min': { const nums = requireAllNumbers([args[0], args[1]], 'min'); return Math.min(nums[0], nums[1]); }
      case 'max': { const nums = requireAllNumbers([args[0], args[1]], 'max'); return Math.max(nums[0], nums[1]); }
      case 'round': return fnRound(args);
      case 'floor': return Math.floor(requireNumber(args[0] ?? 0, 0, 'floor'));
      case 'ceil': return Math.ceil(requireNumber(args[0] ?? 0, 0, 'ceil'));
      case 'parsenumber': {
        const n = parseFloat(toString(args[0] ?? ''));
        if (isNaN(n)) throw new ArgError([0], `parse_number() expects numbers only`);
        return n;
      }
      case 'sqrt': {
        const n = requireNumber(args[0] ?? 0, 0, 'sqrt');
        if (n < 0) throw new ArgError([0], 'sqrt() expects non-negative numbers only');
        return Math.sqrt(n);
      }
      case 'abs': return Math.abs(requireNumber(args[0] ?? 0, 0, 'abs'));
      case 'median': return fnMedian(args);
      case 'trunc': return Math.trunc(requireNumber(args[0] ?? 0, 0, 'trunc'));
      case 'stdevs': return fnStdevS(args);
      case 'stdevp': return fnStdevP(args);
      case 'formatnumber': return fnFormatNumber(args);

      // ── Date Functions ──
      case 'formatdate': return fnFormatDate(args);
      case 'adddays': return fnAddDays(args);
      case 'addhours': return fnAddHours(args);
      case 'now': return new Date().toISOString();
      case 'beginningofmonth': return fnBeginningOfMonth(args);
      case 'endofmonth': return fnEndOfMonth(args);
      case 'differenceindays': return fnDifferenceInDays(args);

      // ── List Functions ──
      case 'map': return fnMap(args);
      case 'filter': return fnFilter(args);
      case 'reduce': return fnReduce(args);
      case 'get': return fnGet(args);
      case 'join': return fnJoin(args);
      case 'flatten': return toArray(args[0]).flat();
      case 'unique': return [...new Set(toArray(args[0]))];
      case 'sort': return fnSort(args);

      // ── Logic Functions ──
      case 'ifempty': return fnIfEmpty(args);
      case 'pick': return fnPick(args);
      case 'omit': return fnOmit(args);

      default: return makeError(`Unknown function "${name}"`);
    }
  } catch (e: any) {
    // Reconstruct: functionname( {{ERR}}badarg1{{/ERR}} ; {{ERR}}badarg2{{/ERR}} ; arg3 )
    if (e instanceof ArgError) {
      // Collect short error message
      if (e.shortMessage) {
        _collectedErrors.push(e.shortMessage);
      }
      const badSet = new Set(e.badIndices);
      const argTexts = args.map((a, i) => {
        const text = formatOutput(a);
        return badSet.has(i) ? markBadValue(text) : text;
      });
      return `${name}( ${argTexts.join(' ; ')} )`;
    }
    const msg = e.message || 'Unknown error';
    _collectedErrors.push(`${name}(): ${msg}`);
    return makeError(`${name}() - ${msg}`);
  }
}

// ── Text Function Implementations ────────────────────────────────────────────

function fnLength(args: FormulaValue[]): number {
  const val = args[0];
  if (Array.isArray(val)) return val.length;
  return toString(val ?? '').length;
}

function fnSubstring(args: FormulaValue[]): string {
  const str = toString(args[0] ?? '');
  const start = toNumber(args[1] ?? 0);
  const end = args[2] !== undefined ? toNumber(args[2]) : undefined;
  return str.substring(start, end);
}

function fnReplace(args: FormulaValue[]): string {
  const str = toString(args[0] ?? '');
  const search = toString(args[1] ?? '');
  const replacement = toString(args[2] ?? '');
  return str.split(search).join(replacement);
}

// ── Math Function Implementations ────────────────────────────────────────────

function fnSum(args: FormulaValue[]): FormulaValue {
  const arr = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  const nums = requireAllNumbers(arr, 'sum');
  return nums.reduce((a, b) => a + b, 0);
}

function fnAverage(args: FormulaValue[]): FormulaValue {
  const arr = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  if (arr.length === 0) return 0;
  const nums = requireAllNumbers(arr, 'average');
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function fnRound(args: FormulaValue[]): FormulaValue {
  const nums = requireAllNumbers([args[0] ?? 0, args[1] ?? 0], 'round');
  const factor = Math.pow(10, nums[1]);
  return Math.round(nums[0] * factor) / factor;
}

function fnMedian(args: FormulaValue[]): FormulaValue {
  const raw = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  const arr = requireAllNumbers(raw, 'median');
  arr.sort((a, b) => a - b);
  if (arr.length === 0) return 0;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
}

function fnStdevS(args: FormulaValue[]): FormulaValue {
  const raw = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  const arr = requireAllNumbers(raw, 'stdev_s');
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function fnStdevP(args: FormulaValue[]): FormulaValue {
  const raw = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  const arr = requireAllNumbers(raw, 'stdev_p');
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

function fnFormatNumber(args: FormulaValue[]): FormulaValue {
  const nums = requireAllNumbers([args[0] ?? 0, args[1] ?? 0], 'format_number');
  return nums[0].toLocaleString(undefined, { minimumFractionDigits: nums[1], maximumFractionDigits: nums[1] });
}

// ── Date Function Implementations ────────────────────────────────────────────

function parseDate(val: FormulaValue): Date {
  if (val instanceof Date) return val;
  const d = new Date(toString(val));
  if (isNaN(d.getTime())) throw new Error(`Invalid date: "${toString(val)}"`);
  return d;
}

function fnFormatDate(args: FormulaValue[]): string {
  const date = parseDate(args[0] ?? '');
  const format = toString(args[1] ?? 'YYYY-MM-DD');
  return formatDateString(date, format);
}

function formatDateString(d: Date, fmt: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return fmt
    .replace('YYYY', String(d.getFullYear()))
    .replace('MM', pad(d.getMonth() + 1))
    .replace('DD', pad(d.getDate()))
    .replace('HH', pad(d.getHours()))
    .replace('mm', pad(d.getMinutes()))
    .replace('ss', pad(d.getSeconds()));
}

function fnAddDays(args: FormulaValue[]): string {
  const d = parseDate(args[0] ?? '');
  d.setDate(d.getDate() + toNumber(args[1] ?? 0));
  return d.toISOString();
}

function fnAddHours(args: FormulaValue[]): string {
  const d = parseDate(args[0] ?? '');
  d.setHours(d.getHours() + toNumber(args[1] ?? 0));
  return d.toISOString();
}

function fnBeginningOfMonth(args: FormulaValue[]): string {
  const d = args[0] ? parseDate(args[0]) : new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function fnEndOfMonth(args: FormulaValue[]): string {
  const d = args[0] ? parseDate(args[0]) : new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString();
}

function fnDifferenceInDays(args: FormulaValue[]): number {
  const d1 = parseDate(args[0] ?? '');
  const d2 = parseDate(args[1] ?? '');
  return Math.floor((d1.getTime() - d2.getTime()) / 86400000);
}

// ── List Function Implementations ────────────────────────────────────────────

function fnMap(args: FormulaValue[]): FormulaValue[] {
  const arr = toArray(args[0]);
  const fnName = toString(args[1] ?? '').toLowerCase().replace(/_/g, '');
  return arr.map(item => {
    switch (fnName) {
      case 'lower': return toString(item).toLowerCase();
      case 'upper': return toString(item).toUpperCase();
      case 'trim': return toString(item).trim();
      case 'tostring': return toString(item);
      case 'parsenumber': return parseFloat(toString(item));
      case 'abs': return Math.abs(toNumber(item));
      case 'floor': return Math.floor(toNumber(item));
      case 'ceil': return Math.ceil(toNumber(item));
      case 'round': return Math.round(toNumber(item));
      case 'sqrt': return Math.sqrt(toNumber(item));
      case 'length': return typeof item === 'string' ? item.length : Array.isArray(item) ? item.length : 0;
      default: return item;
    }
  });
}

function fnFilter(args: FormulaValue[]): FormulaValue[] {
  const arr = toArray(args[0]);
  const fnName = toString(args[1] ?? '').toLowerCase().replace(/_/g, '');
  return arr.filter(item => {
    switch (fnName) {
      case 'truthy': return toBoolean(item);
      case 'notempty': return toString(item) !== '';
      case 'isnumber': return !isNaN(Number(item));
      case 'isstring': return typeof item === 'string';
      default: return toBoolean(item);
    }
  });
}

function fnReduce(args: FormulaValue[]): FormulaValue {
  const arr = toArray(args[0]);
  const fnName = toString(args[1] ?? '').toLowerCase().replace(/_/g, '');
  const init = args[2] ?? 0;
  return arr.reduce((acc: any, item: any) => {
    switch (fnName) {
      case 'sum': case '+': return toNumber(acc) + toNumber(item);
      case 'multiply': case '*': return toNumber(acc) * toNumber(item);
      case 'concat': return toString(acc) + toString(item);
      default: return acc;
    }
  }, init);
}

function fnGet(args: FormulaValue[]): FormulaValue {
  const obj = args[0];
  const key = args[1];
  if (Array.isArray(obj)) {
    const idx = toNumber(key);
    return obj[idx] ?? null;
  }
  if (obj && typeof obj === 'object') {
    return (obj as Record<string, any>)[toString(key)] ?? null;
  }
  return null;
}

function fnJoin(args: FormulaValue[]): string {
  const arr = toArray(args[0]);
  const delimiter = toString(args[1] ?? ',');
  return arr.map(v => toString(v)).join(delimiter);
}

function fnSort(args: FormulaValue[]): FormulaValue[] {
  const arr = [...toArray(args[0])];
  return arr.sort((a, b) => {
    const na = Number(a), nb = Number(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return toString(a).localeCompare(toString(b));
  });
}

// ── Logic Function Implementations ───────────────────────────────────────────

function fnIf(rawArgs: ASTNode[][]): FormulaValue {
  const condition = rawArgs[0] ? evaluateNodes(rawArgs[0]) : false;
  if (toBoolean(condition)) {
    return rawArgs[1] ? evaluateNodes(rawArgs[1]) : '';
  }
  return rawArgs[2] ? evaluateNodes(rawArgs[2]) : '';
}

function fnSwitch(rawArgs: ASTNode[][]): FormulaValue {
  const value = rawArgs[0] ? evaluateNodes(rawArgs[0]) : null;
  const caseVal = rawArgs[1] ? evaluateNodes(rawArgs[1]) : null;
  const resultVal = rawArgs[2] ? evaluateNodes(rawArgs[2]) : '';
  if (value == caseVal) return resultVal;
  return '';
}

function fnIfEmpty(args: FormulaValue[]): FormulaValue {
  const val = args[0];
  if (val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
    return args[1] ?? '';
  }
  return val;
}

function fnPick(args: FormulaValue[]): FormulaValue {
  const obj = args[0];
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
  const keys = Array.isArray(args[1]) ? args[1].map(toString) : toString(args[1] ?? '').split(',').map(s => s.trim());
  const result: Record<string, any> = {};
  for (const k of keys) {
    if (k in (obj as Record<string, any>)) {
      result[k] = (obj as Record<string, any>)[k];
    }
  }
  return result;
}

function fnOmit(args: FormulaValue[]): FormulaValue {
  const obj = args[0];
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
  const keys = Array.isArray(args[1]) ? args[1].map(toString) : toString(args[1] ?? '').split(',').map(s => s.trim());
  const keysSet = new Set(keys);
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj as Record<string, any>)) {
    if (!keysSet.has(k)) result[k] = v;
  }
  return result;
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Split a raw output string into normal/error segments using {{ERR}}...{{/ERR}} markers and #ERROR: prefixes */
function splitIntoSegments(text: string): FormulaSegment[] {
  if (!text) return [];
  const segments: FormulaSegment[] = [];

  // Match both {{ERR}}...{{/ERR}} markers and #ERROR: prefixed messages
  const regex = /\{\{ERR\}\}([\s\S]*?)\{\{\/ERR\}\}|#ERROR:[^{]*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add normal text before the error
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), isError: false });
    }
    // Add the error segment — use captured group for {{ERR}} markers, or full match for #ERROR:
    const errorText = match[1] !== undefined ? match[1] : match[0].trim();
    segments.push({ text: errorText, isError: true });
    lastIndex = match.index + match[0].length;
  }
  // Add remaining normal text
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isError: false });
  }
  return segments.length > 0 ? segments : [{ text, isError: false }];
}

/** Evaluate formula and return structured result with segments + error messages */
export function evaluateFormulaSegments(
  editable: HTMLDivElement,
  availableSteps: AvailableStep[]
): FormulaResult {
  _collectedErrors = []; // reset
  try {
    const domNodes = flattenDOM(editable, availableSteps || []);
    const ast = parseNodesToAST(domNodes);
    if (ast.length === 0) return { segments: [], errors: [] };
    const result = evaluateNodes(ast);
    const output = formatOutput(result);
    return { segments: splitIntoSegments(output), errors: [..._collectedErrors] };
  } catch (e: any) {
    _collectedErrors.push(e.message || 'Evaluation failed');
    return {
      segments: [{ text: makeError(e.message || 'Evaluation failed'), isError: true }],
      errors: [..._collectedErrors]
    };
  }
}

/** Evaluate formula and return plain string (backward compat) */
export function evaluateFormula(
  editable: HTMLDivElement,
  availableSteps: AvailableStep[]
): string {
  const { segments } = evaluateFormulaSegments(editable, availableSteps);
  return segments.map(s => s.text).join('');
}

import { useRef, useImperativeHandle, forwardRef, KeyboardEvent, useState, useEffect, useCallback, ReactNode } from 'react';
import ReactDOM from 'react-dom';
import { DataTag, DataTagValue } from './DataTag';
import { getAppIconSvg, twColorToHex, getAppColorHex } from './app-icon-registry';
import { getTagTooltip, getStepTagTooltip, TagTooltipData } from './tag-tooltip-registry';
import { TagTooltipPortal } from './TagTooltip';
import { ChevronRight, Copy, Check, ExternalLink } from 'lucide-react';

// ─── Slash menu item registry ──────────────────────────────────────────────────
// All slash command items for the TagInput autocomplete dropdown
interface SlashMenuItem {
  id: string;
  label: string;
  section: string;
  type: 'function' | 'operator' | 'keyword' | 'variable' | 'step';
  category: string;
  isPair?: boolean;
  // Step-specific fields
  stepData?: {
    appId: string;
    stepName: string;
    stepColor: string;
    stepNumber: number;
    stepIcon: string;
    path: string;
    fieldValue: any;
  };
}

const FORMULA_ITEMS: SlashMenuItem[] = [
  // Text
  ...['length()', 'lower()', 'upper()', 'trim()', 'substring()', 'replace()', 'contains()', 'split()', 'toString()', 'base64()'].map(fn => ({
    id: `text_${fn}`, label: fn, section: 'Text', type: 'function' as const, category: 'text', isPair: fn.endsWith('()'),
  })),
  ...['space', 'emptystring', 'newline'].map(kw => ({
    id: `text_${kw}`, label: kw, section: 'Text', type: 'keyword' as const, category: 'text',
  })),
  // Math & Date
  ...['sum()', 'average()', 'min()', 'max()', 'round()', 'floor()', 'ceil()', 'parseNumber()', 'sqrt()', 'abs()', 'median()', 'trunc()', 'stdevS()', 'stdevP()', 'formatNumber()'].map(fn => ({
    id: `math_${fn}`, label: fn, section: 'Math & Date', type: 'function' as const, category: 'math', isPair: fn.endsWith('()'),
  })),
  ...['*', '/', 'mod', '+', '-'].map(op => ({
    id: `math_op_${op}`, label: op, section: 'Math & Date', type: 'operator' as const, category: 'math',
  })),
  ...['formatDate()', 'addDays()', 'addHours()', 'now()', 'beginning_of_month()', 'end_of_month()', 'differenceInDays()'].map(fn => ({
    id: `date_${fn}`, label: fn, section: 'Math & Date', type: 'function' as const, category: 'date', isPair: fn.endsWith('()'),
  })),
  // Lists
  ...['length()', 'map()', 'filter()', 'reduce()', 'sum()', 'average()', 'get()', 'join()', 'split()', 'flatten()', 'unique()', 'sort()'].map(fn => ({
    id: `lists_${fn}`, label: fn, section: 'Lists', type: 'function' as const, category: 'lists', isPair: fn.endsWith('()'),
  })),
  // Logic
  ...['if()', 'ifempty()', 'switch()', 'get()', 'pick()', 'omit()'].map(fn => ({
    id: `logic_${fn}`, label: fn, section: 'Logic', type: 'function' as const, category: 'logic', isPair: fn.endsWith('()'),
  })),
  ...['=', '!=', '>', '<', '>=', '<=', 'and', 'or', 'not'].map(op => ({
    id: `logic_op_${op}`, label: op, section: 'Logic', type: 'operator' as const, category: 'logic',
  })),
  ...['true', 'false', 'null'].map(kw => ({
    id: `logic_kw_${kw}`, label: kw, section: 'Logic', type: 'keyword' as const, category: 'logic',
  })),
];

// ─── Function separator (;) arity map ──────────────────────────────────────────
// How many ; separators each function needs between its arguments.
export const FUNCTION_SEPARATORS: Record<string, number> = {
  // Text
  substring: 2,     // substring(str; start; end)
  replace: 2,       // replace(str; search; replacement)
  contains: 1,      // contains(str; substr)
  split: 1,         // split(str; delimiter)
  // Math
  min: 1,           // min(a; b)
  max: 1,           // max(a; b)
  round: 1,         // round(num; decimals)
  formatNumber: 1,  // formatNumber(num; decimals)
  // Date
  formatDate: 1,       // formatDate(date; format)
  addDays: 1,          // addDays(date; days)
  addHours: 1,         // addHours(date; hours)
  differenceInDays: 1, // differenceInDays(date1; date2)
  // Lists
  map: 1,           // map(list; fn)
  filter: 1,        // filter(list; fn)
  reduce: 2,        // reduce(list; fn; init)
  get: 1,           // get(obj; key)
  join: 1,          // join(list; delimiter)
  // Logic
  if: 2,            // if(cond; then; else)
  ifempty: 1,       // ifempty(value; default)
  switch: 2,        // switch(value; case; result)
  pick: 1,          // pick(obj; keys)
  omit: 1,          // omit(obj; keys)
};

// Module-level: shared across all TagInput instances for cross-field tag moves
let globalDraggedTag: { element: HTMLElement; sourceEditable: HTMLDivElement } | null = null;
let globalDraggedPairNodes: { nodes: Node[]; sourceEditable: HTMLDivElement } | null = null;
let pairIdCounter = 0;
const generatePairId = () => `pair-${Date.now()}-${++pairIdCounter}`;

// ─── Type-based color definitions ──────────────────────────────────────────────
// Each tag type has consistent colors across popover and input field
const TAG_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  function: { bg: '#f3e8ff', border: '#c084fc', text: '#7c3aed' },   // purple
  operator: { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' },   // blue
  keyword:  { bg: '#fef3c7', border: '#fbbf24', text: '#b45309' },   // amber
  variable: { bg: '#f3e8ff', border: '#c084fc', text: '#7c3aed' },   // purple (same as function)
};

// Hover "filled" style for function pair elements — solid purple to highlight matching pair
const PAIR_HOVER_STYLE = { bg: '#c084fc', border: '#a855f7', text: '#ffffff' }; // purple-400 / purple-500 / white

// Build a set of known function names (lowercase) from FORMULA_ITEMS for inline conversion
const KNOWN_FUNCTION_NAMES: Map<string, SlashMenuItem> = new Map();
FORMULA_ITEMS.forEach(item => {
  if (item.isPair) {
    const cleanName = item.label.replace('()', '').toLowerCase();
    if (!KNOWN_FUNCTION_NAMES.has(cleanName)) {
      KNOWN_FUNCTION_NAMES.set(cleanName, item);
    }
  }
});

// Build lists of known operators/keywords for inline conversion on Space
// Symbol operators sorted by length descending so >= matches before >
const KNOWN_SYMBOL_OPERATORS: { symbol: string; item: SlashMenuItem }[] = [];
const KNOWN_WORD_TAGS: Map<string, SlashMenuItem> = new Map();
FORMULA_ITEMS.forEach(item => {
  if (item.isPair) return; // skip functions
  if (item.type === 'operator' || item.type === 'keyword') {
    const label = item.label;
    if (/^[^a-zA-Z]+$/.test(label)) {
      if (!KNOWN_SYMBOL_OPERATORS.some(s => s.symbol === label)) {
        KNOWN_SYMBOL_OPERATORS.push({ symbol: label, item });
      }
    } else {
      const lower = label.toLowerCase();
      if (!KNOWN_WORD_TAGS.has(lower)) {
        KNOWN_WORD_TAGS.set(lower, item);
      }
    }
  }
});
KNOWN_SYMBOL_OPERATORS.sort((a, b) => b.symbol.length - a.symbol.length);

interface TagInputProps {
  placeholder?: string;
  className?: string;
  onFocus?: (e: React.FocusEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
  type?: string;
  rows?: number;
  multiline?: boolean;
  disabled?: boolean;
  availableSteps?: Array<{
    id: string;
    name: string;
    appId?: string;
    icon: ReactNode;
    color: string;
    fields: Record<string, any>;
  }>;
}

export const TagInput = forwardRef<any, TagInputProps>((
  {
    placeholder,
    className,
    onFocus,
    onBlur,
    type = 'text',
    rows = 1,
    multiline = false,
    disabled = false,
    availableSteps
  },
  ref
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const skipNextFocusRef = useRef(false);
  const draggedTagRef = useRef<HTMLElement | null>(null);
  const draggedPairNodesRef = useRef<Node[]>([]);
  const dropIndicatorRef = useRef<HTMLDivElement>(null);
  const dropTargetRef = useRef<{ refNode: Node; position: 'before' | 'after' } | null>(null);

  // Track recently deleted pair bracket info so typing ( or ) can restore it
  const deletedPairInfoRef = useRef<{
    pairId: string;
    funcName: string;
    tagId: string;
    tagType: string;
    deletedRole: 'open' | 'close' | 'separator';
  } | null>(null);

  // ── Slash menu state ─────────────────────────────────────────────────────────
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashSearch, setSlashSearch] = useState('');
  const [slashSelectedIdx, setSlashSelectedIdx] = useState(0);
  const slashAnchorRef = useRef<{ node: Node; offset: number } | null>(null);
  const slashMenuRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const isSelectingInBannerRef = useRef(false);
  const slashItemRefs = useRef<Map<number, HTMLElement>>(new Map());
  const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  // ── Tag tooltip state (for inline tags + slash menu items) ──────────────────
  const [tagTooltip, setTagTooltip] = useState<{
    data: TagTooltipData;
    rect: DOMRect;
    placement: 'top' | 'left';
  } | null>(null);
  const tagTooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTagTooltip = useCallback((data: TagTooltipData, rect: DOMRect, placement: 'top' | 'left' = 'top') => {
    if (tagTooltipTimer.current) clearTimeout(tagTooltipTimer.current);
    tagTooltipTimer.current = setTimeout(() => {
      setTagTooltip({ data, rect, placement });
    }, 380);
  }, []);

  const hideTagTooltip = useCallback(() => {
    if (tagTooltipTimer.current) {
      clearTimeout(tagTooltipTimer.current);
      tagTooltipTimer.current = null;
    }
    setTagTooltip(null);
  }, []);

  // ── Focus state for preview banner ──────────────────────────────────────────
  const [isFocused, setIsFocused] = useState(false);
  const [bannerScrolled, setBannerScrolled] = useState(false);
  const [previewOutput, setPreviewOutput] = useState('');
  const [hasFunctions, setHasFunctions] = useState(false);
  const [copied, setCopied] = useState(false);

  /** Check if the field contains any function tags */
  const hasFunctionTags = useCallback((): boolean => {
    if (!editableRef.current) return false;
    const tags = editableRef.current.querySelectorAll('[data-tag]');
    for (const tag of tags) {
      try {
        const tagData = JSON.parse(tag.getAttribute('data-tag') || '{}');
        // Check for function, operator, or keyword tags (not step tags)
        if (tagData.type === 'function' || tagData.type === 'operator' || tagData.type === 'keyword') {
          return true;
        }
      } catch {}
      // Also check for pair brackets
      if (tag.hasAttribute('data-pair-role')) {
        return true;
      }
    }
    return false;
  }, []);

  /** Walk the contentEditable DOM and extract evaluated output text (tags → display values) */
  const getEvaluatedOutput = useCallback((): string => {
    if (!editableRef.current) return '';
    const parts: string[] = [];
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        parts.push(node.textContent || '');
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as HTMLElement;
      // Tag element
      if (el.hasAttribute('data-tag')) {
        try {
          const tagData = JSON.parse(el.getAttribute('data-tag') || '{}');
          if (tagData.type === 'step') {
            // Data step tag → StepNumber. StepName.path = displayValue
            const stepNum = tagData.stepNumber ? `${tagData.stepNumber}. ` : '';
            const stepName = tagData.stepName || '';
            const path = tagData.path || '';
            // Try to find actual value from availableSteps
            const step = availableSteps?.find(s => s.name === stepName || s.id === tagData.id);
            let val = tagData.displayValue || '';
            if (step && path) {
              const pathParts = path.split('.');
              let current: any = step.fields;
              for (const p of pathParts) {
                if (current && typeof current === 'object' && p in current) {
                  current = current[p];
                } else {
                  current = undefined;
                  break;
                }
              }
              if (current !== undefined) val = String(current);
            }
            parts.push(val || `${stepNum}${stepName}.${path}`);
          } else {
            // Function/operator/keyword tag
            parts.push(tagData.value || '');
          }
        } catch {
          parts.push(el.textContent || '');
        }
        return;
      }
      // Recurse into children (for non-tag elements like line breaks, etc.)
      if (el.tagName === 'BR') { parts.push('\n'); return; }
      el.childNodes.forEach(walk);
    };
    editableRef.current.childNodes.forEach(walk);
    return parts.join('');
  }, [availableSteps]);

  // Build full searchable items list (formula functions only, no data step tags)
  const getSlashMenuItems = useCallback((): SlashMenuItem[] => {
    return [...FORMULA_ITEMS];
  }, []);

  // Filter items based on search
  const getFilteredItems = useCallback(() => {
    const all = getSlashMenuItems();
    if (!slashSearch.trim()) return [];
    const q = slashSearch.toLowerCase();
    return all.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.section.toLowerCase().includes(q)
    );
  }, [slashSearch, getSlashMenuItems]);

  // Group filtered items by section
  const getGroupedItems = useCallback(() => {
    const filtered = getFilteredItems();
    const groups: { section: string; items: SlashMenuItem[] }[] = [];
    const sectionOrder = ['Text', 'Math & Date', 'Lists', 'Logic'];
    const map = new Map<string, SlashMenuItem[]>();
    for (const item of filtered) {
      if (!map.has(item.section)) map.set(item.section, []);
      map.get(item.section)!.push(item);
    }
    for (const sec of sectionOrder) {
      if (map.has(sec)) groups.push({ section: sec, items: map.get(sec)! });
    }
    return groups;
  }, [getFilteredItems]);

  // Close slash menu on blur (with delay to allow item clicks)
  const closeSlashMenuTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper: re-ensure all tag elements inside the editor remain draggable after DOM moves
  const ensureTagsDraggable = () => {
    if (!editableRef.current) return;
    editableRef.current.querySelectorAll('[data-tag]').forEach(el => {
      const htmlEl = el as HTMLElement;
      htmlEl.contentEditable = 'false';
      htmlEl.draggable = true;
      htmlEl.setAttribute('draggable', 'true');
      // Clear any stuck drag styles
      htmlEl.style.opacity = '';
      htmlEl.style.pointerEvents = '';
    });
    // Also clean up any leftover text wrappers from aborted drags
    editableRef.current.querySelectorAll('[data-pair-text-wrapper]').forEach(wrapper => {
      const parent = wrapper.parentNode;
      while (wrapper.firstChild) {
        parent?.insertBefore(wrapper.firstChild, wrapper);
      }
      parent?.removeChild(wrapper);
    });
  };

  // ── Apply uniform color to all function bracket tags + attach pair hover listeners ──
  const updateNestingColors = () => {
    if (!editableRef.current) return;
    const editable = editableRef.current;
    const fc = TAG_TYPE_COLORS.function;
    const elements = editable.querySelectorAll('[data-pair-role]');

    elements.forEach(el => {
      const htmlEl = el as HTMLElement;
      const container = htmlEl.firstElementChild as HTMLElement | null;
      if (!container) return;

      // Apply uniform base color (no depth variation)
      container.style.background = fc.bg;
      container.style.borderColor = fc.border;
      container.style.color = fc.text;

      // Skip if hover listeners already attached
      if (htmlEl.dataset.pairHover === '1') return;
      htmlEl.dataset.pairHover = '1';

      const applyStyle = (style: { bg: string; border: string; text: string }, targets: NodeListOf<Element> | Element[]) => {
        targets.forEach(t => {
          const c = (t as HTMLElement).firstElementChild as HTMLElement | null;
          if (c) {
            c.style.background = style.bg;
            c.style.borderColor = style.border;
            c.style.color = style.text;
          }
        });
      };

      htmlEl.addEventListener('mouseenter', () => {
        const pairId = htmlEl.getAttribute('data-pair-id');
        if (!pairId) return;
        const siblings = editable.querySelectorAll(`[data-pair-id="${pairId}"]`);
        applyStyle(PAIR_HOVER_STYLE, siblings);
      });

      htmlEl.addEventListener('mouseleave', () => {
        const pairId = htmlEl.getAttribute('data-pair-id');
        if (!pairId) return;
        const siblings = editable.querySelectorAll(`[data-pair-id="${pairId}"]`);
        applyStyle(fc, siblings);
      });
    });
    
    // Update data tag styling after updating bracket colors
    updateDataTagStyling();
  };

  // Helper: check if a tag element is positioned between function bracket pair
  const isTagInsideFunctionBrackets = (tagElement: HTMLElement): boolean => {
    if (!editableRef.current) return false;
    
    const children = Array.from(editableRef.current.childNodes);
    const tagIdx = children.indexOf(tagElement);
    if (tagIdx === -1) return false;

    // Find the nearest open bracket before this tag
    let openBracket: HTMLElement | null = null;
    for (let i = tagIdx - 1; i >= 0; i--) {
      const child = children[i];
      if (child instanceof HTMLElement && child.getAttribute('data-pair-role') === 'open') {
        openBracket = child;
        break;
      }
    }

    if (!openBracket) return false;

    const pairId = openBracket.getAttribute('data-pair-id');
    if (!pairId) return false;

    // Find the matching close bracket
    for (let i = tagIdx + 1; i < children.length; i++) {
      const child = children[i];
      if (child instanceof HTMLElement && 
          child.getAttribute('data-pair-id') === pairId && 
          child.getAttribute('data-pair-role') === 'close') {
        return true; // Tag is between open and close of same pair
      }
    }

    return false;
  };

  // ── Update styling for data tags based on whether they're inside function brackets ──
  const updateDataTagStyling = () => {
    if (!editableRef.current) return;
    
    // Find all data step tags (not function/operator/keyword tags)
    const allTags = editableRef.current.querySelectorAll('[data-tag]');
    
    allTags.forEach(el => {
      const htmlEl = el as HTMLElement;
      try {
        const tagData = JSON.parse(htmlEl.getAttribute('data-tag') || '{}');
        
        // Only update data step tags
        if (tagData.type === 'step') {
          const isInside = isTagInsideFunctionBrackets(htmlEl);
          
          // Reconstruct the tag value object
          const tagValue: DataTagValue = {
            type: 'step',
            id: tagData.id,
            appId: tagData.appId,
            stepName: tagData.stepName,
            stepIcon: tagData.stepIcon,
            stepColor: tagData.stepColor,
            stepNumber: tagData.stepNumber,
            path: tagData.path,
            displayValue: tagData.displayValue,
          } as any;
          
          // Update innerHTML with appropriate styling
          htmlEl.innerHTML = createTagHTML(tagValue, isInside);
          
          // Update wrapper styling based on position
          if (isInside) {
            // Inside brackets: remove chip classes, apply purple background to wrapper
            htmlEl.className = 'inline cursor-move font-mono text-xs';
            htmlEl.style.color = TAG_TYPE_COLORS.function.text;
            htmlEl.style.background = TAG_TYPE_COLORS.function.bg;
            htmlEl.style.padding = '0';
            htmlEl.style.border = 'none';
            htmlEl.style.borderRadius = '0';
          } else {
            // Outside brackets: restore chip classes
            htmlEl.className = 'inline-flex items-center cursor-move';
            htmlEl.style.color = '';
            htmlEl.style.background = '';
            htmlEl.style.padding = '';
            htmlEl.style.border = '';
            htmlEl.style.borderRadius = '';
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    });
  };

  // Helper: find the innermost pair whose open/close brackets surround the cursor.
  // Returns null if the cursor is not between any pair's brackets.
  const findCursorPairContext = (): { pairId: string; tagId: string; tagType: string } | null => {
    if (!editableRef.current) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.getRangeAt(0).collapsed) return null;
    const cursorRange = sel.getRangeAt(0);

    // Build map of open/close bracket elements per pair-id
    const brackets = editableRef.current.querySelectorAll('[data-pair-id][data-pair-role]');
    const pairMap = new Map<string, { open?: HTMLElement; close?: HTMLElement }>();
    brackets.forEach(el => {
      const pid = el.getAttribute('data-pair-id')!;
      const role = el.getAttribute('data-pair-role')!;
      if (role === 'open' || role === 'close') {
        if (!pairMap.has(pid)) pairMap.set(pid, {});
        pairMap.get(pid)![role as 'open' | 'close'] = el as HTMLElement;
      }
    });

    const children = Array.from(editableRef.current.childNodes);
    let bestMatch: { pairId: string; tagId: string; tagType: string } | null = null;
    let bestOpenIdx = -1; // track innermost (latest open bracket position)

    for (const [pid, pair] of pairMap) {
      if (!pair.open || !pair.close) continue;

      // Range comparisons: cursor must be after open and before close
      const afterOpen = document.createRange();
      afterOpen.setStartAfter(pair.open);
      afterOpen.collapse(true);
      const beforeClose = document.createRange();
      beforeClose.setStartBefore(pair.close);
      beforeClose.collapse(true);

      const cursorAfterOpen = cursorRange.compareBoundaryPoints(Range.START_TO_START, afterOpen) >= 0;
      const cursorBeforeClose = cursorRange.compareBoundaryPoints(Range.START_TO_START, beforeClose) <= 0;

      if (cursorAfterOpen && cursorBeforeClose) {
        const openIdx = children.indexOf(pair.open);
        if (openIdx > bestOpenIdx) {
          bestOpenIdx = openIdx;
          let tagId = '';
          let tagType = 'function';
          try {
            const td = JSON.parse(pair.open.getAttribute('data-tag') || '{}');
            tagId = td.id || '';
            tagType = td.type || 'function';
          } catch {}
          bestMatch = { pairId: pid, tagId, tagType };
        }
      }
    }

    return bestMatch;
  };

  // Helper: check if a DOM node is inside a tag element
  const isInsideTag = (node: Node): boolean => {
    let current: Node | null = node;
    while (current && current !== editableRef.current) {
      if (current instanceof HTMLElement && current.hasAttribute('data-tag')) {
        return true;
      }
      current = current.parentNode;
    }
    return false;
  };

  // Helper: find the closest tag ancestor of a node (up to editableRef)
  const findClosestTag = (node: Node): HTMLElement | null => {
    let current: Node | null = node;
    while (current && current !== editableRef.current) {
      if (current instanceof HTMLElement && current.hasAttribute('data-tag')) {
        return current;
      }
      current = current.parentNode;
    }
    return null;
  };

  // Helper: collect all sibling nodes between open and close bracket (inclusive)
  const collectPairNodes = (pairId: string): Node[] => {
    if (!editableRef.current) return [];
    const children = Array.from(editableRef.current.childNodes);
    let openIdx = -1;
    let closeIdx = -1;
    for (let i = 0; i < children.length; i++) {
      const n = children[i];
      if (n instanceof HTMLElement && n.getAttribute('data-pair-id') === pairId) {
        if (n.getAttribute('data-pair-role') === 'open') openIdx = i;
        if (n.getAttribute('data-pair-role') === 'close') closeIdx = i;
      }
    }
    if (openIdx === -1 || closeIdx === -1 || openIdx >= closeIdx) return [];
    return children.slice(openIdx, closeIdx + 1);
  };

  // Helper: resolve drop position from a drag event, snapping to node edges
  const resolveDropPosition = (clientX: number, clientY: number): {
    indicatorLeft: number;
    indicatorTop: number;
    indicatorHeight: number;
    target: { refNode: Node; position: 'before' | 'after' };
  } | null => {
    if (!editableRef.current || !containerRef.current) return null;

    let range: Range | null = null;
    if ((document as any).caretRangeFromPoint) {
      range = (document as any).caretRangeFromPoint(clientX, clientY);
    } else if ((document as any).caretPositionFromPoint) {
      const point = (document as any).caretPositionFromPoint(clientX, clientY);
      if (point) {
        range = document.createRange();
        range.setStart(point.offsetNode, point.offset);
        range.collapse(true);
      }
    }

    if (!range || !editableRef.current.contains(range.commonAncestorContainer)) return null;

    const containerRect = containerRef.current.getBoundingClientRect();

    // Determine which direct child node of editableRef we're hovering over
    let targetNode: Node | null = null;
    const caretNode = range.startContainer;

    // If caret is inside a tag, find the tag element
    const tagAncestor = findClosestTag(caretNode);
    if (tagAncestor) {
      // Don't snap to the dragged tag itself or any pair nodes being dragged
      if (tagAncestor === draggedTagRef.current) return null;
      if (draggedPairNodesRef.current.includes(tagAncestor)) return null;
      targetNode = tagAncestor;
    } else if (caretNode === editableRef.current) {
      const children = editableRef.current.childNodes;
      if (children.length === 0) {
        const editableRect = editableRef.current.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(editableRef.current);
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
        const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
        const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
        const isMultiline = computedStyle.whiteSpace !== 'nowrap';
        const innerHeight = editableRect.height - paddingTop - paddingBottom;
        const maxIndicatorHeight = 16;
        const actualHeight = Math.min(innerHeight, maxIndicatorHeight);
        const verticalOffset = isMultiline
          ? paddingTop
          : paddingTop + (innerHeight - actualHeight) / 2;
        return {
          indicatorLeft: editableRect.left - containerRect.left + paddingLeft,
          indicatorTop: editableRect.top - containerRect.top + verticalOffset,
          indicatorHeight: actualHeight,
          target: { refNode: editableRef.current, position: 'before' },
        };
      }
      const offset = range.startOffset;
      if (offset >= children.length) {
        targetNode = children[children.length - 1];
      } else {
        targetNode = children[offset];
      }
    } else {
      let current: Node | null = caretNode;
      while (current && current.parentNode !== editableRef.current) {
        current = current.parentNode;
      }
      targetNode = current || caretNode;
    }

    if (!targetNode) return null;

    // Don't snap to the dragged tag itself or any pair nodes being dragged
    if (targetNode === draggedTagRef.current) return null;
    if (draggedPairNodesRef.current.includes(targetNode)) return null;

    let nodeRect: DOMRect;
    if (targetNode.nodeType === Node.TEXT_NODE) {
      const textRange = document.createRange();
      textRange.selectNodeContents(targetNode);
      nodeRect = textRange.getBoundingClientRect();
    } else {
      nodeRect = (targetNode as HTMLElement).getBoundingClientRect();
    }

    if (nodeRect.width === 0 && nodeRect.height === 0) {
      const editableRect = editableRef.current.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(editableRef.current);
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
      const isMultiline = computedStyle.whiteSpace !== 'nowrap';
      const innerHeight = editableRect.height - paddingTop - paddingBottom;
      const maxIndicatorHeight = 16;
      const actualHeight = Math.min(innerHeight, maxIndicatorHeight);
      const verticalOffset = isMultiline
        ? paddingTop
        : paddingTop + (innerHeight - actualHeight) / 2;
      return {
        indicatorLeft: editableRect.left - containerRect.left + paddingLeft,
        indicatorTop: editableRect.top - containerRect.top + verticalOffset,
        indicatorHeight: actualHeight,
        target: { refNode: targetNode, position: 'before' },
      };
    }

    const midX = nodeRect.left + nodeRect.width / 2;
    const snapLeft = clientX < midX;

    return {
      indicatorLeft: (snapLeft ? nodeRect.left : nodeRect.right) - containerRect.left,
      indicatorTop: nodeRect.top - containerRect.top,
      indicatorHeight: nodeRect.height,
      target: { refNode: targetNode, position: snapLeft ? 'before' : 'after' },
    };
  };

  // Helper: insert a node at a resolved drop target position
  const insertNodeAtTarget = (node: Node, target: { refNode: Node; position: 'before' | 'after' }) => {
    if (!editableRef.current) return;
    const { refNode, position } = target;
    
    if (refNode === editableRef.current) {
      if (position === 'before') {
        editableRef.current.prepend(node);
      } else {
        editableRef.current.appendChild(node);
      }
    } else {
      const parent = refNode.parentNode || editableRef.current;
      if (position === 'before') {
        parent.insertBefore(node, refNode);
      } else {
        parent.insertBefore(node, refNode.nextSibling);
      }
    }
  };

  // دالة لإدراج نص عادي (للـ AI filling)
  function insertText(text: string, skipFocus?: boolean) {
    if (!editableRef.current) return;
    
    if (skipFocus) {
      skipNextFocusRef.current = true;
    }
    
    editableRef.current.textContent = text;
    
    if (skipFocus) return;
    
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(editableRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  // دالة لإدراج tag جديد في موضع الكيرسر
  function insertTag(tag: DataTagValue) {
    if (!editableRef.current) return;

    editableRef.current.focus();
    
    const selection = window.getSelection();
    if (!selection) return;
    
    let range: Range;
    
    if (selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(editableRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const tagSpan = createTagSpanElement(tag);
    
    range.deleteContents();
    range.insertNode(tagSpan);
    
    const space = document.createTextNode('\u00A0');
    tagSpan.parentNode?.insertBefore(space, tagSpan.nextSibling);
    
    range.setStartAfter(space);
    range.setEndAfter(space);
    selection.removeAllRanges();
    selection.addRange(range);
    
    editableRef.current.focus();
    updateNestingColors();
    
    // Update preview output after inserting tag
    const hasFuncs = hasFunctionTags();
    const preview = getEvaluatedOutput();
    console.log('➕ InsertTag - hasFunctionTags:', hasFuncs, 'previewOutput:', preview);
    setHasFunctions(hasFuncs);
    setPreviewOutput(preview);
  }

  // Insert a paired function tag as two separate linked bracket tags with cursor between.
  // If separatorCount > 0, also insert ; separator tags between the brackets.
  function insertTagPair(openTag: DataTagValue, closeTag: DataTagValue, separatorCount: number = 0) {
    if (!editableRef.current) return;

    editableRef.current.focus();

    const selection = window.getSelection();
    if (!selection) return;

    let range: Range;

    if (selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(editableRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const pairId = generatePairId();
    const openSpan = createPairBracketElement(openTag, pairId, 'open');
    const closeSpan = createPairBracketElement(closeTag, pairId, 'close');

    // Build separator elements
    const separators: HTMLSpanElement[] = [];
    for (let i = 0; i < separatorCount; i++) {
      const sepTag: DataTagValue = { type: (openTag as any).type || 'function', id: (openTag as any).id, value: ';' } as any;
      separators.push(createPairBracketElement(sepTag, pairId, 'separator'));
    }

    // Insert at cursor in reverse order (insertNode pushes existing content forward)
    range.deleteContents();
    range.insertNode(closeSpan);
    for (let i = separators.length - 1; i >= 0; i--) {
      range.insertNode(separators[i]);
    }
    range.insertNode(openSpan);

    // Add trailing space after close bracket
    const trailingSpace = document.createTextNode('\u00A0');
    closeSpan.parentNode?.insertBefore(trailingSpace, closeSpan.nextSibling);

    // Place cursor between open bracket and first separator (or close bracket)
    const newRange = document.createRange();
    newRange.setStartAfter(openSpan);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    editableRef.current.focus();
    updateNestingColors();
    
    // Update preview output after inserting tag pair
    const hasFuncs = hasFunctionTags();
    const preview = getEvaluatedOutput();
    console.log('➕ InsertTagPair - hasFunctionTags:', hasFuncs, 'previewOutput:', preview);
    setHasFunctions(hasFuncs);
    setPreviewOutput(preview);
  }

  // ── Slash menu action helpers (must be after insertTag/insertTagPair) ─────────

  // Delete the slash trigger text ("/search") from the editor
  const deleteSlashText = () => {
    if (!editableRef.current || !slashAnchorRef.current) return;
    const { node, offset } = slashAnchorRef.current;
    if (node.nodeType !== Node.TEXT_NODE || !node.parentNode) return;
    const text = node.textContent || '';
    const sel = window.getSelection();
    let cursorOffset = text.length;
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0);
      if (r.startContainer === node) cursorOffset = r.startOffset;
    }
    const slashStart = offset - 1;
    const before = text.substring(0, slashStart);
    const after = text.substring(cursorOffset);
    node.textContent = before + after;
    if (sel) {
      const r = document.createRange();
      r.setStart(node, Math.min(slashStart, node.textContent.length));
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
    }
  };

  // Select a slash menu item
  const selectSlashItem = (item: SlashMenuItem) => {
    deleteSlashText();
    hideTagTooltip();
    setSlashMenuOpen(false);
    setSlashSearch('');
    slashAnchorRef.current = null;

    if (item.type === 'step' && item.stepData) {
      insertTag({
        type: 'step',
        id: item.category,
        appId: item.stepData.appId,
        stepName: item.stepData.stepName,
        stepIcon: item.stepData.stepIcon,
        stepColor: item.stepData.stepColor,
        stepNumber: item.stepData.stepNumber,
        path: item.stepData.path,
        displayValue: String(item.stepData.fieldValue),
      } as any);
    } else if (item.isPair) {
      const cleanName = item.label.replace('()', '');
      const sepCount = FUNCTION_SEPARATORS[cleanName] || 0;
      insertTagPair(
        { type: item.type, id: item.category, value: `${cleanName}(`, displayValue: `${cleanName}(` } as any,
        { type: item.type, id: item.category, value: ')', displayValue: ')' } as any,
        sepCount,
      );
    } else {
      insertTag({
        type: item.type,
        id: item.category,
        value: item.label,
        displayValue: item.label,
      } as any);
    }
  };

  // Track input events for slash menu
  const handleInputForSlash = () => {
    if (!editableRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const r = sel.getRangeAt(0);
    if (!r.collapsed) return;

    const node = r.startContainer;
    const offset = r.startOffset;

    if (node.nodeType !== Node.TEXT_NODE) {
      if (slashMenuOpen) {
        setSlashMenuOpen(false);
        setSlashSearch('');
        slashAnchorRef.current = null;
      }
      return;
    }

    const text = node.textContent || '';

    if (slashMenuOpen && slashAnchorRef.current) {
      if (slashAnchorRef.current.node === node) {
        const slashOffset = slashAnchorRef.current.offset - 1;
        if (offset >= slashAnchorRef.current.offset) {
          const searchStr = text.substring(slashAnchorRef.current.offset, offset);
          if (searchStr.startsWith(' ') || searchStr.startsWith('\u00A0')) {
            setSlashMenuOpen(false);
            setSlashSearch('');
            slashAnchorRef.current = null;
          } else {
            setSlashSearch(searchStr);
            setSlashSelectedIdx(0);
          }
        } else if (offset <= slashOffset) {
          setSlashMenuOpen(false);
          setSlashSearch('');
          slashAnchorRef.current = null;
        } else {
          setSlashSearch('');
          setSlashSelectedIdx(0);
        }
      } else {
        setSlashMenuOpen(false);
        setSlashSearch('');
        slashAnchorRef.current = null;
      }
      return;
    }

    // Detect new "/" typed
    if (offset > 0 && text[offset - 1] === '/') {
      const charBefore = offset >= 2 ? text[offset - 2] : null;
      if (charBefore === null || charBefore === ' ' || charBefore === '\u00A0') {
        slashAnchorRef.current = { node, offset };
        setSlashMenuOpen(true);
        setSlashSearch('');
        setSlashSelectedIdx(0);
      }
    }
  };

  // Reset selected index when filtered items change
  useEffect(() => {
    setSlashSelectedIdx(0);
  }, [slashSearch]);



  // Update slash menu position on scroll/resize
  useEffect(() => {
    if (!slashMenuOpen || !containerRef.current) return;

    const updatePos = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSlashMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };

    updatePos();

    // Listen on all scrollable ancestors + window
    const scrollables: (Element | Window)[] = [window];
    let el: HTMLElement | null = containerRef.current.parentElement;
    while (el) {
      const style = getComputedStyle(el);
      if (/(auto|scroll)/.test(style.overflow + style.overflowY + style.overflowX)) {
        scrollables.push(el);
      }
      el = el.parentElement;
    }

    scrollables.forEach(s => s.addEventListener('scroll', updatePos, { passive: true }));
    window.addEventListener('resize', updatePos, { passive: true });

    return () => {
      scrollables.forEach(s => s.removeEventListener('scroll', updatePos));
      window.removeEventListener('resize', updatePos);
    };
  }, [slashMenuOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (slashMenuOpen) {
      const el = slashItemRefs.current.get(slashSelectedIdx);
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [slashSelectedIdx, slashMenuOpen]);

  // Initial update of data tag styling on mount
  useEffect(() => {
    updateNestingColors();
  }, []);

  // دالة لإنشاء HTML للـ tag
  const createTagHTML = (tag: DataTagValue, isInsideFunctionBrackets: boolean = false): string => {
    // 1. Function/Operator/Keyword/Variable Token Renderer
    if (tag.type === 'function' || tag.type === 'operator' || tag.type === 'keyword' || tag.type === 'variable') {
      const c = TAG_TYPE_COLORS[tag.type] || TAG_TYPE_COLORS.function;
      return `
        <span class="inline-flex items-center gap-1 py-0 rounded-none mx-0.5 align-middle transition-colors" style="background:${c.bg};color:${c.text};font-size:14px;padding-left:2px;padding-right:2px">
          <span>${tag.value.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').replace(/ /g, '_').toLowerCase()}</span>
        </span>
      `;
    }

    // Regular data tag styling (outside and inside function brackets)
    const appId = tag.appId || tag.id;
    const bgHex = getAppColorHex(appId) !== '#6b7280'
      ? getAppColorHex(appId)
      : twColorToHex(tag.stepColor);

    const iconSvg = getAppIconSvg(appId, 10);
    
    const numberPrefix = tag.stepNumber != null ? `${tag.stepNumber}. ` : '';
    const label = `${numberPrefix}${tag.stepName}.${tag.path}`;
    
    return `
      <span class="inline-flex items-center gap-1 px-2 py-0 bg-white border border-gray-300 text-gray-900 text-xs rounded-md whitespace-nowrap">
        <span style="width:12px;height:12px;display:inline-flex;align-items:center;justify-content:center;border-radius:3px;color:white;background:${bgHex};flex-shrink:0">${iconSvg}</span>
        <span>${label}</span>
      </span>
    `;
  };

  // Helper: create a draggable tag span element from tag data
  const createTagSpanElement = (tag: DataTagValue): HTMLSpanElement => {
    const tagSpan = document.createElement('span');
    tagSpan.contentEditable = 'false';
    tagSpan.draggable = true;
    tagSpan.className = 'inline-flex items-center cursor-move';
    
    if (tag.type === 'function' || tag.type === 'operator' || tag.type === 'keyword' || tag.type === 'variable') {
      tagSpan.setAttribute('data-tag', JSON.stringify({
        type: tag.type,
        id: tag.id,
        value: tag.value
      }));
    } else {
      const iconStr = typeof tag.stepIcon === 'string' ? tag.stepIcon : '⚙';
      tagSpan.setAttribute('data-tag', JSON.stringify({
        type: 'step',
        id: tag.id,
        appId: tag.appId,
        stepName: tag.stepName,
        stepColor: tag.stepColor,
        stepNumber: tag.stepNumber,
        stepIcon: iconStr,
        path: tag.path
      }));
    }
    
    tagSpan.innerHTML = createTagHTML(tag);
    return tagSpan;
  };

  // Helper: create a single bracket tag element (open or close) linked by pairId
  const createPairBracketElement = (tag: DataTagValue, pairId: string, role: 'open' | 'close' | 'separator'): HTMLSpanElement => {
    const tagSpan = document.createElement('span');
    tagSpan.contentEditable = 'false';
    tagSpan.draggable = true;
    tagSpan.className = 'inline-flex items-center cursor-move';

    const value = (tag as any).value || (role === 'open' ? 'fn(' : role === 'separator' ? ';' : ')');
    // Derive function name: strip trailing ( from open value, or use id
    const funcName = role === 'open'
      ? value.replace(/\($/, '')
      : role === 'separator'
        ? ';'
        : ((tag as any).id || 'fn').replace(/_close$/, '');

    tagSpan.setAttribute('data-tag', JSON.stringify({
      type: tag.type || 'function',
      id: (tag as any).id,
      value: value
    }));
    tagSpan.setAttribute('data-pair-id', pairId);
    tagSpan.setAttribute('data-pair-role', role);
    tagSpan.setAttribute('data-func-name', funcName);

    const fc = TAG_TYPE_COLORS.function;
    tagSpan.innerHTML = `
      <span class="inline-flex items-center gap-1 py-0 rounded-none mx-0.5 align-middle transition-colors" style="background:${fc.bg};color:${fc.text};font-size:14px;padding-left:2px;padding-right:2px">
        <span>${value.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').replace(/ /g, '_').toLowerCase()}</span>
      </span>
    `;

    return tagSpan;
  };

  // Expose methods للمكونات الخارجية
  useImperativeHandle(ref, () => ({
    insertTag,
    insertTagPair,
    insertText,
    focus: () => editableRef.current?.focus(),
    blur: () => editableRef.current?.blur(),
    getBoundingClientRect: () => containerRef.current?.getBoundingClientRect(),
    getValue: () => editableRef.current?.textContent || '',
    getElement: () => containerRef.current,
  }));

  const handleFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    if (skipNextFocusRef.current) {
      skipNextFocusRef.current = false;
      return;
    }
    
    setIsFocused(true);
    const hasFuncs = hasFunctionTags();
    const preview = getEvaluatedOutput();
    console.log('🔍 Focus - hasFunctionTags:', hasFuncs, 'previewOutput:', preview);
    setHasFunctions(hasFuncs); // Check if field has functions
    setPreviewOutput(preview); // Update preview on focus
    
    // حفظ ref في الـ DOM element نفسه
    if (containerRef.current) {
      (containerRef.current as any).__tagInputInstance = {
        insertTag,
        insertTagPair,
        insertText,
        focus: () => editableRef.current?.focus(),
        blur: () => editableRef.current?.blur(),
        getBoundingClientRect: () => containerRef.current?.getBoundingClientRect(),
        getValue: () => editableRef.current?.textContent || '',
      };
    }
    
    if (onFocus && containerRef.current) {
      const syntheticEvent = {
        ...e,
        currentTarget: containerRef.current as any
      };
      onFocus(syntheticEvent as any);
    }
    updateNestingColors();
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (isSelectingInBannerRef.current) {
      isSelectingInBannerRef.current = false;
      editableRef.current?.focus();
      return;
    }
    if (bannerRef.current && e.relatedTarget && bannerRef.current.contains(e.relatedTarget as Node)) {
      editableRef.current?.focus();
      return;
    }
    setIsFocused(false);
    
    // Close slash menu with delay to allow clicking items
    if (slashMenuOpen) {
      closeSlashMenuTimeout.current = setTimeout(() => {
        setSlashMenuOpen(false);
        setSlashSearch('');
        slashAnchorRef.current = null;
      }, 200);
    }
    if (onBlur && containerRef.current) {
      const syntheticEvent = {
        ...e,
        currentTarget: containerRef.current as any
      };
      onBlur(syntheticEvent as any);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const tagElement = target.closest('[data-tag]') as HTMLElement;
    
    if (!tagElement) return;

    // Hide tooltip immediately when dragging starts
    hideTagTooltip();

    const pairId = tagElement.getAttribute('data-pair-id');
    
    // ── Pair bracket drag: move entire pair (open + content + close) as one ──
    if (pairId && editableRef.current) {
      const pairNodes = collectPairNodes(pairId);
      if (pairNodes.length === 0) return;

      draggedPairNodesRef.current = pairNodes;
      draggedTagRef.current = tagElement;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/x-tag-move', 'true');
      e.dataTransfer.setData('application/x-tag-pair-move', pairId);

      // Find the open bracket to extract function name for drag preview
      const openBracket = pairNodes.find(n =>
        n instanceof HTMLElement &&
        n.getAttribute('data-pair-role') === 'open'
      ) as HTMLElement | undefined;

      let funcName = 'fn';
      if (openBracket) {
        try {
          const tagData = JSON.parse(openBracket.getAttribute('data-tag') || '{}');
          // Strip trailing ( from value like "length("
          funcName = (tagData.value || 'fn').replace(/\($/, '');
        } catch {}
      }

      // Check if there's any content between the brackets (skip separators)
      const hasContent = pairNodes.some((n, i) => {
        if (i === 0 || i === pairNodes.length - 1) return false; // skip open/close brackets
        if (n instanceof HTMLElement && n.getAttribute('data-pair-role') === 'separator') return false; // skip separators
        if (n instanceof HTMLElement) return true;
        if (n.nodeType === Node.TEXT_NODE && n.textContent && n.textContent.trim()) return true;
        return false;
      });

      // Create drag preview showing function name + "..." if it has content
      const dragEl = document.createElement('span');
      const fc = TAG_TYPE_COLORS.function;
      dragEl.style.cssText = `display:inline-flex;align-items:center;gap:4px;padding:2px 6px;background:${fc.bg};border:1px solid ${fc.border};color:${fc.text};border-radius:6px;white-space:nowrap;font-size:12px;font-family:monospace;position:fixed;top:-1000px;left:-1000px;z-index:99999;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,0.15);`;
      dragEl.textContent = hasContent ? `${funcName} ...` : funcName;
      document.body.appendChild(dragEl);
      e.dataTransfer.setDragImage(dragEl, 0, 0);
      requestAnimationFrame(() => document.body.removeChild(dragEl));

      // Track globally for cross-field moves
      globalDraggedPairNodes = { nodes: pairNodes, sourceEditable: editableRef.current };

      // Dim all pair nodes (including text nodes between brackets)
      setTimeout(() => {
        pairNodes.forEach(n => {
          if (n instanceof HTMLElement) {
            n.style.opacity = '0.3';
            n.style.pointerEvents = 'none';
          } else if (n.nodeType === Node.TEXT_NODE && n.textContent && n.textContent.trim()) {
            // Wrap text nodes in a temporary span so we can dim them visually
            const wrapper = document.createElement('span');
            wrapper.setAttribute('data-pair-text-wrapper', 'true');
            wrapper.style.opacity = '0.3';
            wrapper.style.pointerEvents = 'none';
            n.parentNode?.insertBefore(wrapper, n);
            wrapper.appendChild(n);
          }
        });
      }, 0);
      return;
    }

    // ── Regular single tag drag ──
    draggedTagRef.current = tagElement;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tagElement.innerText);
    
    const tagDataAttr = tagElement.getAttribute('data-tag');
    if (tagDataAttr) {
      e.dataTransfer.setData('application/x-tag-data', tagDataAttr);
      e.dataTransfer.setData('application/x-tag-move', 'true');
    }
    
    if (editableRef.current) {
      globalDraggedTag = { element: tagElement, sourceEditable: editableRef.current };
    }
    
    setTimeout(() => {
      if (tagElement) tagElement.style.opacity = '0.3';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    // Restore pair nodes: unwrap text wrappers and restore opacity
    if (draggedPairNodesRef.current.length > 0) {
      // First unwrap any text wrappers added during drag
      if (editableRef.current) {
        const wrappers = editableRef.current.querySelectorAll('[data-pair-text-wrapper]');
        wrappers.forEach(wrapper => {
          const parent = wrapper.parentNode;
          while (wrapper.firstChild) {
            parent?.insertBefore(wrapper.firstChild, wrapper);
          }
          parent?.removeChild(wrapper);
        });
      }
      // Restore opacity on remaining pair nodes
      draggedPairNodesRef.current.forEach(n => {
        if (n instanceof HTMLElement) {
          n.style.opacity = '1';
          n.style.pointerEvents = '';
        }
      });
      draggedPairNodesRef.current = [];
    }
    if (draggedTagRef.current) {
      draggedTagRef.current.style.opacity = '1';
      draggedTagRef.current = null;
    }
    globalDraggedTag = null;
    globalDraggedPairNodes = null;

    // Re-ensure all tags remain draggable after browser contentEditable normalization
    ensureTagsDraggable();
    updateNestingColors();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    const hasExternalTagData = e.dataTransfer.types.includes('application/x-tag-data');
    const hasExternalTagPair = e.dataTransfer.types.includes('application/x-tag-pair');
    const isInternalDrag = !!draggedTagRef.current;
    const isCrossFieldDrag = (!!globalDraggedTag && globalDraggedTag.sourceEditable !== editableRef.current) ||
                             (!!globalDraggedPairNodes && globalDraggedPairNodes.sourceEditable !== editableRef.current);
    
    if (!isInternalDrag && !isCrossFieldDrag && !hasExternalTagData && !hasExternalTagPair) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = (isInternalDrag || isCrossFieldDrag) ? 'move' : 'copy';

    if (!dropIndicatorRef.current) return;

    const result = resolveDropPosition(e.clientX, e.clientY);

    if (result) {
      dropTargetRef.current = result.target;
      const el = dropIndicatorRef.current;
      el.style.display = 'block';
      el.style.height = `${result.indicatorHeight}px`;
      el.style.top = `${result.indicatorTop}px`;
      el.style.left = `${result.indicatorLeft - 1}px`;
    } else {
      dropTargetRef.current = null;
      dropIndicatorRef.current.style.display = 'none';
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    // No-op
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
       if (dropIndicatorRef.current) dropIndicatorRef.current.style.display = 'none';
       dropTargetRef.current = null;
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dropIndicatorRef.current) dropIndicatorRef.current.style.display = 'none';

    if (!editableRef.current) {
      dropTargetRef.current = null;
      draggedTagRef.current = null;
      draggedPairNodesRef.current = [];
      globalDraggedTag = null;
      globalDraggedPairNodes = null;
      return;
    }

    const result = resolveDropPosition(e.clientX, e.clientY);
    const target = result?.target || dropTargetRef.current;

    // ── 1. Internal pair reorder (same field) ──
    if (draggedPairNodesRef.current.length > 0 && editableRef.current.contains(draggedPairNodesRef.current[0])) {
      // First unwrap any text wrappers added during drag
      const wrappers = editableRef.current.querySelectorAll('[data-pair-text-wrapper]');
      wrappers.forEach(wrapper => {
        const parent = wrapper.parentNode;
        while (wrapper.firstChild) {
          parent?.insertBefore(wrapper.firstChild, wrapper);
        }
        parent?.removeChild(wrapper);
      });

      // Re-collect pair nodes after unwrapping (DOM may have changed)
      const pairId = draggedTagRef.current?.getAttribute('data-pair-id');
      const pairNodes = pairId ? collectPairNodes(pairId) : [];
      
      // Restore opacity
      pairNodes.forEach(n => {
        if (n instanceof HTMLElement) {
          n.style.opacity = '1';
          n.style.pointerEvents = '';
        }
      });

      if (target && pairNodes.length > 0) {
        // Remove all pair nodes from DOM
        pairNodes.forEach(n => { if (n.parentNode) n.parentNode.removeChild(n); });
        
        // Insert all pair nodes at target position in order
        let insertRef: Node = pairNodes[0];
        insertNodeAtTarget(insertRef, target);
        for (let i = 1; i < pairNodes.length; i++) {
          insertRef.parentNode?.insertBefore(pairNodes[i], insertRef.nextSibling);
          insertRef = pairNodes[i];
        }

        const sel = window.getSelection();
        if (sel) {
          const lastNode = pairNodes[pairNodes.length - 1];
          const newRange = document.createRange();
          newRange.setStartAfter(lastNode);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
      }
      
      ensureTagsDraggable();
      updateNestingColors();
      dropTargetRef.current = null;
      draggedTagRef.current = null;
      draggedPairNodesRef.current = [];
      globalDraggedTag = null;
      globalDraggedPairNodes = null;
      return;
    }

    // ── 2. Internal single tag reorder (same field) ──
    const draggedElement = draggedTagRef.current;
    if (draggedElement && editableRef.current.contains(draggedElement) && draggedPairNodesRef.current.length === 0) {
       draggedElement.style.opacity = '1';

       if (target) {
         if (draggedElement.parentNode) {
           draggedElement.parentNode.removeChild(draggedElement);
         }

         insertNodeAtTarget(draggedElement, target);

         const sel = window.getSelection();
         if (sel) {
           const newRange = document.createRange();
           newRange.setStartAfter(draggedElement);
           newRange.collapse(true);
           sel.removeAllRanges();
           sel.addRange(newRange);
         }
       }
       
       ensureTagsDraggable();
       updateNestingColors();
       dropTargetRef.current = null;
       draggedTagRef.current = null;
       globalDraggedTag = null;
       return;
    }
    
    // ���─ 3. Cross-field pair move ──
    if (globalDraggedPairNodes && globalDraggedPairNodes.sourceEditable !== editableRef.current) {
      const pairNodes = [...globalDraggedPairNodes.nodes];
      pairNodes.forEach(n => { if (n instanceof HTMLElement) n.style.opacity = '1'; });

      // Remove from source field
      pairNodes.forEach(n => { if (n.parentNode) n.parentNode.removeChild(n); });

      if (target) {
        let insertRef: Node = pairNodes[0];
        insertNodeAtTarget(insertRef, target);
        for (let i = 1; i < pairNodes.length; i++) {
          insertRef.parentNode?.insertBefore(pairNodes[i], insertRef.nextSibling);
          insertRef = pairNodes[i];
        }
      } else {
        pairNodes.forEach(n => editableRef.current!.appendChild(n));
      }

      const lastNode = pairNodes[pairNodes.length - 1];
      const space = document.createTextNode('\u00A0');
      lastNode.parentNode?.insertBefore(space, lastNode.nextSibling);

      const sel = window.getSelection();
      if (sel) {
        const newRange = document.createRange();
        newRange.setStartAfter(space);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }

      editableRef.current.focus();
      updateNestingColors();
      dropTargetRef.current = null;
      draggedTagRef.current = null;
      draggedPairNodesRef.current = [];
      globalDraggedTag = null;
      globalDraggedPairNodes = null;
      return;
    }

    // ── 4. Cross-field single tag move ──
    if (globalDraggedTag && globalDraggedTag.sourceEditable !== editableRef.current) {
      const { element: sourceElement } = globalDraggedTag;
      sourceElement.style.opacity = '1';
      
      if (sourceElement.parentNode) {
        sourceElement.parentNode.removeChild(sourceElement);
      }
      
      if (target) {
        insertNodeAtTarget(sourceElement, target);
      } else {
        editableRef.current.appendChild(sourceElement);
      }
      
      const space = document.createTextNode('\u00A0');
      sourceElement.parentNode?.insertBefore(space, sourceElement.nextSibling);
      
      const sel = window.getSelection();
      if (sel) {
        const newRange = document.createRange();
        newRange.setStartAfter(space);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
      
      editableRef.current.focus();
      updateNestingColors();
      dropTargetRef.current = null;
      draggedTagRef.current = null;
      globalDraggedTag = null;
      return;
    }
    
    // ── 5. External paired function tag drop (from DataSelector) ──
    const pairData = e.dataTransfer.getData('application/x-tag-pair');
    const isMove = e.dataTransfer.getData('application/x-tag-move') === 'true';
    
    if (pairData && !isMove) {
      try {
        const parsed = JSON.parse(pairData) as { open: DataTagValue; close: DataTagValue; separatorCount?: number };
        const { open, close } = parsed;
        const sepCount = parsed.separatorCount || 0;
        const pairId = generatePairId();
        const openSpan = createPairBracketElement(open, pairId, 'open');
        const closeSpan = createPairBracketElement(close, pairId, 'close');

        // Build separator elements
        const separators: HTMLSpanElement[] = [];
        for (let i = 0; i < sepCount; i++) {
          const sepTag: DataTagValue = { type: (open as any).type || 'function', id: (open as any).id, value: ';' } as any;
          separators.push(createPairBracketElement(sepTag, pairId, 'separator'));
        }

        if (target) {
          insertNodeAtTarget(openSpan, target);
          // Insert separators then close after open
          let lastNode: Node = openSpan;
          for (const sep of separators) {
            lastNode.parentNode?.insertBefore(sep, lastNode.nextSibling);
            lastNode = sep;
          }
          lastNode.parentNode?.insertBefore(closeSpan, lastNode.nextSibling);
        } else {
          editableRef.current.appendChild(openSpan);
          separators.forEach(sep => editableRef.current!.appendChild(sep));
          editableRef.current.appendChild(closeSpan);
        }

        // Trailing space after close bracket
        const trailingSpace = document.createTextNode('\u00A0');
        closeSpan.parentNode?.insertBefore(trailingSpace, closeSpan.nextSibling);

        // Place cursor between open bracket and first separator (or close)
        const sel = window.getSelection();
        if (sel) {
          const newRange = document.createRange();
          newRange.setStartAfter(openSpan);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
        editableRef.current.focus();
        updateNestingColors();
      } catch (err) {
        console.error('Failed to parse external tag pair data:', err);
      }

      dropTargetRef.current = null;
      draggedTagRef.current = null;
      globalDraggedTag = null;
      return;
    }

    // ── 6. External single tag drop (from DataSelector, ExpandedDataSelector, etc.) ──
    const externalData = e.dataTransfer.getData('application/x-tag-data');
    
    if (externalData && !isMove) {
      try {
        const tagData = JSON.parse(externalData) as DataTagValue;
        const tagSpan = createTagSpanElement(tagData);
        
        if (target) {
          insertNodeAtTarget(tagSpan, target);
        } else {
          editableRef.current.appendChild(tagSpan);
        }
        
        const space = document.createTextNode('\u00A0');
        tagSpan.parentNode?.insertBefore(space, tagSpan.nextSibling);
        
        const sel = window.getSelection();
        if (sel) {
          const newRange = document.createRange();
          newRange.setStartAfter(space);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
        
        editableRef.current.focus();
        updateNestingColors();
        
        // Update preview output after drag & drop
        const hasFuncs = hasFunctionTags();
        const preview = getEvaluatedOutput();
        console.log('🎯 Drop - hasFunctionTags:', hasFuncs, 'previewOutput:', preview);
        setHasFunctions(hasFuncs);
        setPreviewOutput(preview);
      } catch (err) {
        console.error('Failed to parse external tag data:', err);
      }
    }
    
    dropTargetRef.current = null;
    draggedTagRef.current = null;
    globalDraggedTag = null;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // ── Slash menu keyboard navigation ──
    if (slashMenuOpen) {
      const flatItems = getFilteredItems();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashSelectedIdx(prev => Math.min(prev + 1, flatItems.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashSelectedIdx(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (flatItems[slashSelectedIdx]) {
          selectSlashItem(flatItems[slashSelectedIdx]);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashMenuOpen(false);
        setSlashSearch('');
        slashAnchorRef.current = null;
        return;
      }
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        // Space after "/" cancels the slash menu and inserts a space
        setSlashMenuOpen(false);
        setSlashSearch('');
        slashAnchorRef.current = null;
        // Manually insert a space at the current cursor position
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const spaceNode = document.createTextNode('\u00A0');
          range.insertNode(spaceNode);
          range.setStartAfter(spaceNode);
          range.setEndAfter(spaceNode);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        return;
      }
      if (e.key === 'Backspace') {
        // Check if we're about to delete the "/"
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && slashAnchorRef.current) {
          const r = sel.getRangeAt(0);
          if (r.startContainer === slashAnchorRef.current.node && r.startOffset <= slashAnchorRef.current.offset - 1 + 1) {
            if (r.startOffset === slashAnchorRef.current.offset) {
              // About to delete the slash itself — close menu
              // Let the backspace happen naturally then close
              setTimeout(() => {
                setSlashMenuOpen(false);
                setSlashSearch('');
                slashAnchorRef.current = null;
              }, 0);
            }
          }
        }
      }
    }

    // Ctrl+A or Cmd+A to select all
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      const selection = window.getSelection();
      const range = document.createRange();
      if (editableRef.current) {
        range.selectNodeContents(editableRef.current);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      return;
    }

    // ── Auto-restore deleted bracket: typing ( or ) recreates the missing pair bracket tag ──
    if ((e.key === '(' || e.key === ')') && editableRef.current) {
      // Strategy 1: Check saved deleted pair info (immediate re-type after deletion)
      const saved = deletedPairInfoRef.current;
      if (saved) {
        const typedRole: 'open' | 'close' = e.key === '(' ? 'open' : 'close';
        if (typedRole === saved.deletedRole) {
          e.preventDefault();
          deletedPairInfoRef.current = null;

          const value = typedRole === 'open' ? `${saved.funcName}(` : ')';
          const tagData: DataTagValue = {
            type: saved.tagType as any,
            id: saved.tagId,
            value,
          } as any;
          const newBracket = createPairBracketElement(tagData, saved.pairId, typedRole);

          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(newBracket);
            range.setStartAfter(newBracket);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          }
          updateNestingColors();
          return;
        }
      }

      // Strategy 2: Scan for any orphaned bracket in the editor (partner missing)
      const missingRole: 'open' | 'close' = e.key === '(' ? 'open' : 'close';
      const brackets = editableRef.current.querySelectorAll('[data-pair-id][data-pair-role]');
      const pairMap = new Map<string, { open?: HTMLElement; close?: HTMLElement }>();
      brackets.forEach(el => {
        const pid = el.getAttribute('data-pair-id')!;
        const role = el.getAttribute('data-pair-role') as 'open' | 'close';
        if (!pairMap.has(pid)) pairMap.set(pid, {});
        pairMap.get(pid)![role] = el as HTMLElement;
      });

      // Find first orphan where the typed bracket role is missing
      let orphanPairId: string | null = null;
      let orphanPartner: HTMLElement | null = null;
      for (const [pid, pair] of pairMap) {
        if (missingRole === 'open' && pair.close && !pair.open) {
          orphanPairId = pid;
          orphanPartner = pair.close;
          break;
        }
        if (missingRole === 'close' && pair.open && !pair.close) {
          orphanPairId = pid;
          orphanPartner = pair.open;
          break;
        }
      }

      if (orphanPairId && orphanPartner) {
        e.preventDefault();
        deletedPairInfoRef.current = null;

        const funcName = orphanPartner.getAttribute('data-func-name') || 'fn';
        let tagId = '';
        let tagType = 'function';
        try {
          const td = JSON.parse(orphanPartner.getAttribute('data-tag') || '{}');
          tagId = td.id || '';
          tagType = td.type || 'function';
        } catch {}

        const value = missingRole === 'open' ? `${funcName}(` : ')';
        const tagData: DataTagValue = { type: tagType as any, id: tagId, value } as any;
        const newBracket = createPairBracketElement(tagData, orphanPairId, missingRole);

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(newBracket);
          range.setStartAfter(newBracket);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        updateNestingColors();
        return;
      }

      // Strategy 3: Inline function name conversion — user typed "sum(" directly
      const sel3 = window.getSelection();
      if (sel3 && sel3.rangeCount > 0) {
        const r3 = sel3.getRangeAt(0);
        if (r3.collapsed && r3.startContainer.nodeType === Node.TEXT_NODE) {
          const textNode = r3.startContainer as Text;
          const textBefore = textNode.textContent?.substring(0, r3.startOffset) || '';
          // Extract the word immediately before cursor (no spaces)
          const wordMatch = textBefore.match(/([a-zA-Z_]\w*)$/);
          if (wordMatch) {
            const word = wordMatch[1];
            const matchedItem = KNOWN_FUNCTION_NAMES.get(word.toLowerCase());
            if (matchedItem) {
              e.preventDefault();
              // Remove the typed function name from the text node
              const wordStart = r3.startOffset - word.length;
              const before = textNode.textContent?.substring(0, wordStart) || '';
              const after = textNode.textContent?.substring(r3.startOffset) || '';
              textNode.textContent = before + after;
              // Place cursor at the removal point
              const insertRange = document.createRange();
              insertRange.setStart(textNode, wordStart);
              insertRange.collapse(true);
              sel3.removeAllRanges();
              sel3.addRange(insertRange);
              // If the text node is now empty, remove it and set cursor in editable
              if (textNode.textContent === '') {
                const parent = textNode.parentNode;
                const idx = Array.from(parent!.childNodes).indexOf(textNode);
                textNode.remove();
                const rr = document.createRange();
                rr.setStart(parent!, idx);
                rr.collapse(true);
                sel3.removeAllRanges();
                sel3.addRange(rr);
              }
              // Insert the tag pair
              const cleanName = matchedItem.label.replace('()', '');
              const sepCount = FUNCTION_SEPARATORS[cleanName] || 0;
              insertTagPair(
                { type: matchedItem.type, id: matchedItem.category, value: `${cleanName}(`, displayValue: `${cleanName}(` } as any,
                { type: matchedItem.type, id: matchedItem.category, value: ')', displayValue: ')' } as any,
                sepCount,
              );
              return;
            }
          }
        }
      }
    }

    // ── Auto-restore or create separator: typing , or ; inside a pair's brackets ──
    if ((e.key === ',' || e.key === ';') && editableRef.current) {
      // Strategy 1: Restore a recently deleted separator
      const saved = deletedPairInfoRef.current;
      if (saved && saved.deletedRole === 'separator') {
        e.preventDefault();
        deletedPairInfoRef.current = null;

        const tagData: DataTagValue = {
          type: saved.tagType as any,
          id: saved.tagId,
          value: ';',
        } as any;
        const newSep = createPairBracketElement(tagData, saved.pairId, 'separator');

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(newSep);
          range.setStartAfter(newSep);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        updateNestingColors();
        return;
      }

      // Strategy 2: Cursor is inside a pair's brackets → insert a NEW separator tag
      const pairCtx = findCursorPairContext();
      if (pairCtx) {
        e.preventDefault();
        const tagData: DataTagValue = {
          type: pairCtx.tagType as any,
          id: pairCtx.tagId,
          value: ';',
        } as any;
        const newSep = createPairBracketElement(tagData, pairCtx.pairId, 'separator');

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(newSep);
          range.setStartAfter(newSep);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        updateNestingColors();
        return;
      }
    }

    // Clear deleted pair info on any other key (not ( ) , ;)
    if (e.key !== '(' && e.key !== ')' && e.key !== ',' && e.key !== ';') {
      deletedPairInfoRef.current = null;
    }

    // Insert non-breaking space to prevent HTML whitespace collapsing
    if (e.key === ' ') {
      e.preventDefault();

      // ── Inline operator/keyword conversion on Space ──
      const selSpace = window.getSelection();
      if (selSpace && selSpace.rangeCount > 0 && editableRef.current) {
        const rSpace = selSpace.getRangeAt(0);
        if (rSpace.collapsed && rSpace.startContainer.nodeType === Node.TEXT_NODE) {
          const textNode = rSpace.startContainer as Text;
          const textBefore = textNode.textContent?.substring(0, rSpace.startOffset) || '';

          let matched: { start: number; length: number; item: SlashMenuItem } | null = null;

          // 1. Try word-based match (and, or, not, true, false, null, mod, etc.)
          const wordMatch = textBefore.match(/([a-zA-Z_]\w*)$/);
          if (wordMatch) {
            const word = wordMatch[1];
            const found = KNOWN_WORD_TAGS.get(word.toLowerCase());
            if (found) {
              const charBefore = rSpace.startOffset - word.length > 0
                ? textNode.textContent?.[rSpace.startOffset - word.length - 1]
                : null;
              if (charBefore === null || charBefore === ' ' || charBefore === '\u00A0') {
                matched = { start: rSpace.startOffset - word.length, length: word.length, item: found };
              }
            }
          }

          // 2. Try symbol operator match (>=, !=, <=, =, >, <, *, /, +, -)
          if (!matched) {
            for (const { symbol, item } of KNOWN_SYMBOL_OPERATORS) {
              if (textBefore.endsWith(symbol)) {
                const startIdx = rSpace.startOffset - symbol.length;
                const charBefore = startIdx > 0 ? textNode.textContent?.[startIdx - 1] : null;
                if (charBefore === null || charBefore === ' ' || charBefore === '\u00A0') {
                  matched = { start: startIdx, length: symbol.length, item };
                  break;
                }
              }
            }
          }

          if (matched) {
            const before = textNode.textContent?.substring(0, matched.start) || '';
            const after = textNode.textContent?.substring(matched.start + matched.length) || '';
            textNode.textContent = before + after;

            const insertRange = document.createRange();
            if (textNode.textContent === '') {
              const parent = textNode.parentNode;
              const idx = Array.from(parent!.childNodes).indexOf(textNode);
              textNode.remove();
              insertRange.setStart(parent!, idx);
            } else {
              insertRange.setStart(textNode, matched.start);
            }
            insertRange.collapse(true);
            selSpace.removeAllRanges();
            selSpace.addRange(insertRange);

            insertTag({
              type: matched.item.type,
              id: matched.item.category,
              value: matched.item.label,
              displayValue: matched.item.label,
            } as any);
            return;
          }
        }
      }

      // Default: just insert non-breaking space
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const spaceNode = document.createTextNode('\u00A0');
        range.insertNode(spaceNode);
        range.setStartAfter(spaceNode);
        range.setEndAfter(spaceNode);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      return;
    }
    
    // منع Enter في حقول single-line
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      return;
    }
    
    // السماح بـ Enter في الحقول multiline لإنشاء سطر جديد
    if (e.key === 'Enter' && multiline && !slashMenuOpen) {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        // Insert first <br> to break the line
        const br = document.createElement('br');
        range.insertNode(br);
        
        // Check if we need a second <br> (at end of content or before another <br>)
        const nextSibling = br.nextSibling;
        if (!nextSibling || nextSibling.nodeName === 'BR') {
          const br2 = document.createElement('br');
          br.parentNode?.insertBefore(br2, br.nextSibling);
          range.setStartAfter(br);
        } else {
          range.setStartAfter(br);
        }
        
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      return;
    }
    
    // حذف الـ tag عند الضغط على Backspace أو Delete
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        if (range.collapsed) {
          const containerNode = range.startContainer;
          const offset = range.startOffset;

          // Resolve the tag element adjacent to the cursor
          let targetElement: HTMLElement | null = null;

          if (e.key === 'Backspace') {
            if (containerNode === editableRef.current) {
              // Cursor is directly inside the editable div — look at child before offset
              const child = offset > 0 ? containerNode.childNodes[offset - 1] : null;
              if (child && child.nodeType === Node.ELEMENT_NODE) {
                targetElement = child as HTMLElement;
              }
            } else if (offset === 0) {
              // Cursor at start of a text node — look at previous sibling
              const prev = containerNode.previousSibling;
              if (prev && prev.nodeType === Node.ELEMENT_NODE) {
                targetElement = prev as HTMLElement;
              }
            }
          } else {
            // Delete key
            if (containerNode === editableRef.current) {
              const child = containerNode.childNodes[offset] || null;
              if (child && child.nodeType === Node.ELEMENT_NODE) {
                targetElement = child as HTMLElement;
              }
            } else {
              const next = containerNode.nextSibling;
              if (next && next.nodeType === Node.ELEMENT_NODE) {
                targetElement = next as HTMLElement;
              }
            }
          }

          if (targetElement && targetElement.hasAttribute('data-tag')) {
            e.preventDefault();
            const pairId = targetElement.getAttribute('data-pair-id');
            const pairRole = targetElement.getAttribute('data-pair-role') as 'open' | 'close' | 'separator' | null;
            if (pairId && pairRole) {
              if (pairRole === 'open') {
                // Deleting the main/open bracket
                const closeBracket = editableRef.current?.querySelector(`[data-pair-id="${pairId}"][data-pair-role="close"]`);
                
                if (!closeBracket) {
                  // Orphaned open bracket (close was already deleted) — just remove the tag
                  targetElement.remove();
                } else {
                  // Check if there's meaningful content between the brackets (skip separators)
                  const pairNodes = collectPairNodes(pairId);
                  const hasContent = pairNodes.some((n, i) => {
                    if (i === 0 || i === pairNodes.length - 1) return false; // skip open/close
                    if (n instanceof HTMLElement && n.getAttribute('data-pair-role') === 'separator') return false; // skip separators
                    if (n instanceof HTMLElement && n.hasAttribute('data-tag')) return true;
                    if (n.nodeType === Node.TEXT_NODE && n.textContent && n.textContent.replace(/\u00A0/g, '').trim()) return true;
                    return false;
                  });
                  if (hasContent) {
                    // Has content: remove brackets + separators, keep other content
                    targetElement.remove();
                    closeBracket.remove();
                    // Also remove all separator tags in this pair
                    pairNodes.forEach(n => {
                      if (n instanceof HTMLElement && n.getAttribute('data-pair-role') === 'separator') {
                        n.remove();
                      }
                    });
                  } else {
                    // No content: remove everything (open + separators + empty nodes + close)
                    pairNodes.forEach(n => n.parentNode?.removeChild(n));
                  }
                }
              } else if (pairRole === 'separator') {
                // Deleting a separator: save info for auto-restore on , or ; re-type
                const funcName = targetElement.getAttribute('data-func-name') || '';
                let tagId = '';
                let tagType = 'function';
                try {
                  const td = JSON.parse(targetElement.getAttribute('data-tag') || '{}');
                  tagId = td.id || '';
                  tagType = td.type || 'function';
                } catch {}
                deletedPairInfoRef.current = { pairId, funcName, tagId, tagType, deletedRole: 'separator' };
                targetElement.remove();
              } else {
                // Deleting the close bracket only: save info for auto-restore on re-type
                const funcName = targetElement.getAttribute('data-func-name') || 'fn';
                let tagId = '';
                let tagType = 'function';
                try {
                  const td = JSON.parse(targetElement.getAttribute('data-tag') || '{}');
                  tagId = td.id || '';
                  tagType = td.type || 'function';
                } catch {}
                deletedPairInfoRef.current = { pairId, funcName, tagId, tagType, deletedRole: pairRole };
                targetElement.remove();
              }
            } else {
              targetElement.remove();
            }
            updateNestingColors();
            
            // Update preview output after deleting tag
            const hasFuncs = hasFunctionTags();
            const preview = getEvaluatedOutput();
            console.log('🗑️ Delete - hasFunctionTags:', hasFuncs, 'previewOutput:', preview);
            setHasFunctions(hasFuncs);
            setPreviewOutput(preview);
          }
        }
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const handleEditorInput = () => {
    handleInputForSlash();
    updateNestingColors();
    
    // Clean up empty contentEditable to show placeholder
    if (editableRef.current) {
      const textContent = editableRef.current.textContent || '';
      if (textContent.trim() === '') {
        editableRef.current.innerHTML = '';
      }
    }
    
    // Update preview output whenever content changes
    if (isFocused) {
      const hasFuncs = hasFunctionTags();
      const preview = getEvaluatedOutput();
      console.log('⌨️ Input - hasFunctionTags:', hasFuncs, 'previewOutput:', preview);
      setHasFunctions(hasFuncs); // Check if field has functions
      setPreviewOutput(preview);
    }
  };

  // ── Slash menu portal rendering ──────────────────────────────────────────────
  const renderSlashMenu = () => {
    if (!slashMenuOpen || !containerRef.current) return null;

    const groups = getGroupedItems();
    const flatItems = getFilteredItems();

    // Style variants for tag pills
    const typeStyles: Record<string, { bg: string; text: string }> = {
      function: { bg: 'bg-purple-100', text: 'text-purple-700' },
      operator: { bg: 'bg-blue-100', text: 'text-blue-700' },
      keyword: { bg: 'bg-amber-100', text: 'text-amber-700' },
      variable: { bg: 'bg-purple-100', text: 'text-purple-700' },
    };

    let globalIdx = 0;

    return ReactDOM.createPortal(
      <div
        ref={slashMenuRef}
        className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
        style={{
          position: 'fixed',
          top: slashMenuPos.top,
          left: slashMenuPos.left,
          width: slashMenuPos.width,
          zIndex: 99999,
        }}
        onMouseDown={(e) => {
          e.preventDefault(); // prevent blur
          if (closeSlashMenuTimeout.current) {
            clearTimeout(closeSlashMenuTimeout.current);
            closeSlashMenuTimeout.current = null;
          }
        }}
      >
        {/* Results */}
        <div className="max-h-[240px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {flatItems.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-gray-400">{slashSearch.trim() ? 'No results found' : 'Type to search functions…'}</p>
            </div>
          ) : (
            groups.map(group => (
              <div key={group.section}>
                <div className="px-3 pt-2.5 pb-1">
                  <span className="text-[10px] uppercase text-gray-400 tracking-wider">{group.section}</span>
                </div>
                {group.items.map(item => {
                  const idx = globalIdx++;
                  const isSelected = idx === slashSelectedIdx;
                  const s = typeStyles[item.type] || typeStyles.function;

                  if (item.type === 'step' && item.stepData) {
                    const sd = item.stepData;
                    const bgHex = getAppColorHex(sd.appId) !== '#6b7280'
                      ? getAppColorHex(sd.appId)
                      : twColorToHex(sd.stepColor);
                    const iconSvg = getAppIconSvg(sd.appId, 10);

                    return (
                      <button
                        key={item.id}
                        ref={el => { if (el) slashItemRefs.current.set(idx, el); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                          isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => selectSlashItem(item)}
                        onMouseEnter={() => {
                          setSlashSelectedIdx(idx);
                          const td = getStepTagTooltip(sd.stepName, sd.path);
                          const el = slashItemRefs.current.get(idx);
                          if (el) showTagTooltip(td, el.getBoundingClientRect(), 'left');
                        }}
                        onMouseLeave={() => hideTagTooltip()}
                      >
                        <span
                          className="inline-flex items-center justify-center rounded shrink-0"
                          style={{ width: 16, height: 16, background: bgHex, color: 'white' }}
                          dangerouslySetInnerHTML={{ __html: iconSvg }}
                        />
                        <span className="text-xs text-gray-700 truncate">
                          <span className="text-gray-400 mr-0.5">{sd.stepNumber}.</span>
                          {sd.stepName}.<span className="text-gray-900">{sd.path}</span>
                        </span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      ref={el => { if (el) slashItemRefs.current.set(idx, el); }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                        isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => selectSlashItem(item)}
                      onMouseEnter={() => {
                        setSlashSelectedIdx(idx);
                        const td = getTagTooltip(item.label);
                        const el = slashItemRefs.current.get(idx);
                        if (td && el) showTagTooltip(td, el.getBoundingClientRect(), 'left');
                      }}
                      onMouseLeave={() => hideTagTooltip()}
                    >
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono ${s.bg} ${s.text}`}>
                        {(item.isPair ? item.label.replace('()', '') : item.label).replace(/([a-z])([A-Z])/g, '$1_$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').replace(/ /g, '_').toLowerCase()}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-gray-400">Press</span>
            <kbd className="text-[10px] px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-500">↵</kbd>
            <span className="text-[11px] text-gray-400">to apply</span>
          </div>
          <a href="#" className="flex items-center gap-1 text-[12px] text-purple-500 hover:text-purple-700 hover:underline">See All<ExternalLink size={11} /></a>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div ref={containerRef} className={`relative ${isFocused ? 'z-50' : 'z-0'}`} style={{ isolation: 'isolate' }} data-tag-input="true">
      <style dangerouslySetInnerHTML={{
        __html: `
          .tag-input-editable:empty:before {
            content: attr(data-placeholder);
            color: #9ca3af;
            pointer-events: none;
            position: absolute;
          }
          .tag-input-editable:focus {
            outline: none;
          }
          @keyframes dropIndicatorPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .drop-indicator-line {
            animation: dropIndicatorPulse 1s ease-in-out infinite;
          }
          /* Allow selection highlight to flow through contentEditable=false tag elements */
          .tag-input-editable [data-tag]::selection,
          .tag-input-editable [data-tag] *::selection {
            background: rgba(59,130,246,0.35);
          }
          .tag-input-editable::selection {
            background: rgba(59,130,246,0.35);
          }
        `
      }} />
      
      <div
        ref={editableRef}
        contentEditable={!disabled}
        onFocus={disabled ? undefined : handleFocus}
        onBlur={disabled ? undefined : handleBlur}
        onKeyDown={disabled ? undefined : handleKeyDown}
        onPaste={disabled ? undefined : handlePaste}
        onDragStart={disabled ? undefined : handleDragStart}
        onDragEnter={disabled ? undefined : handleDragEnter}
        onDragOver={disabled ? undefined : handleDragOver}
        onDrop={disabled ? undefined : handleDrop}
        onDragEnd={disabled ? undefined : handleDragEnd}
        onDragLeave={disabled ? undefined : handleDragLeave}
        onInput={disabled ? undefined : handleEditorInput}
        onMouseOver={(e) => {
          // Event delegation for [data-tag] tooltip inside contentEditable
          const target = (e.target as HTMLElement).closest?.('[data-tag]') as HTMLElement | null;
          if (!target) { hideTagTooltip(); return; }
          try {
            const tagData = JSON.parse(target.getAttribute('data-tag') || '{}');
            let tooltipData: TagTooltipData | null = null;
            if (tagData.type === 'step') {
              tooltipData = getStepTagTooltip(tagData.stepName || '', tagData.path || '');
            } else {
              tooltipData = getTagTooltip(tagData.value || '');
            }
            if (tooltipData) {
              showTagTooltip(tooltipData, target.getBoundingClientRect(), 'top');
            }
          } catch {}
        }}
        onMouseOut={(e) => {
          const related = e.relatedTarget as HTMLElement | null;
          if (!related || !related.closest?.('[data-tag]')) {
            hideTagTooltip();
          }
        }}
        className={`tag-input-editable relative z-20 ${className} ${disabled ? 'cursor-not-allowed bg-gray-100 text-gray-700' : 'bg-white'}`}
        data-placeholder={placeholder}
        style={{
          minHeight: multiline ? `${rows * 1.5}em` : '38px',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          fontFamily: 'inherit',
        }}
        suppressContentEditableWarning
      />

      {/* Preview results banner - shown when field is focused and has function tags */}
      {isFocused && hasFunctions && (
        <div 
          ref={bannerRef}
          className="absolute left-0 right-0 bg-green-50 border border-gray-400 border-t-0 rounded-b-md pt-0 shadow-sm z-10 flex flex-col"
          style={{ top: 'calc(100% - 11px)', maxHeight: '200px' }}
          onMouseDown={() => { isSelectingInBannerRef.current = true; }}
          onMouseUp={() => { isSelectingInBannerRef.current = false; }}
        >
          <div className="sticky top-0 bg-green-50 z-10 pt-[20px]" onMouseDown={(e) => e.preventDefault()}>
          <div className="flex items-center justify-between mb-1 px-2">
            <div className="flex items-center gap-0.5">
              <ChevronRight size={14} className="text-green-600" strokeWidth={3} />
              <span className="text-xs font-semibold text-gray-900">String Preview</span>
            </div>
            <button
              onClick={async () => {
                const textToCopy = previewOutput.replace(/\u00A0/g, ' ');
                try {
                  await navigator.clipboard.writeText(textToCopy);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch (err) {
                  console.error('Failed to copy:', err);
                }
              }}
              className="flex items-center p-1 rounded hover:bg-green-100 transition-colors text-gray-700 hover:text-gray-900"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check size={14} className="text-black" />
              ) : (
                <Copy size={14} />
              )}
            </button>
          </div>
          {bannerScrolled && <div className="border-t border-gray-300" />}
          </div>
          <div
            className="overflow-y-auto px-2 pb-1"
            style={{ overscrollBehavior: 'contain' }}
            onWheel={(e) => e.stopPropagation()}
            onScroll={(e) => setBannerScrolled((e.currentTarget as HTMLDivElement).scrollTop > 0)}
          >
            <span className="text-gray-800 whitespace-pre-wrap break-words" style={{ fontFamily: 'inherit', fontSize: '12px', lineHeight: '1' }}>
              {previewOutput && previewOutput.replace(/\u00A0/g, ' ').replace(/^\s+$/g, '').length > 0 ? previewOutput.replace(/\u00A0/g, ' ') : <span className="text-gray-400 italic">Empty</span>}
            </span>
          </div>
        </div>
      )}
      
      <div 
         ref={dropIndicatorRef}
         className="absolute pointer-events-none hidden z-10 drop-indicator-line"
         style={{ top: 0, left: 0, height: '20px', width: '2px' }}
      >
        {/* Top dot */}
        <div
          className="absolute rounded-full bg-purple-600"
          style={{ width: '6px', height: '6px', top: '-2px', left: '50%', transform: 'translateX(-50%)' }}
        />
        {/* Line body */}
        <div
          className="absolute bg-purple-600 rounded-full"
          style={{ width: '2px', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', boxShadow: '0 0 6px 1px rgba(147, 51, 234, 0.5)' }}
        />
        {/* Bottom dot */}
        <div
          className="absolute rounded-full bg-purple-600"
          style={{ width: '6px', height: '6px', bottom: '-2px', left: '50%', transform: 'translateX(-50%)' }}
        />
      </div>

      {/* Slash command menu */}
      {renderSlashMenu()}

      {/* Tag tooltip portal */}
      {tagTooltip && (
        <TagTooltipPortal
          data={tagTooltip.data}
          anchorRect={tagTooltip.rect}
          placement={tagTooltip.placement}
        />
      )}
    </div>
  );
});
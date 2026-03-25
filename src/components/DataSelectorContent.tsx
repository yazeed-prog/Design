import { ChevronDown, ChevronRight, Search, Database, GripVertical, Type, Calculator, List, GitBranch } from 'lucide-react';
import { useState, ReactNode, useRef, useEffect, isValidElement, cloneElement } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getAppIconSvg, getAppColorHex, twColorToHex } from './app-icon-registry';
import ReactDOM from 'react-dom';
import { getTagTooltip, getStepTagTooltip } from './tag-tooltip-registry';
import { useTagTooltip } from './TagTooltip';
import { FUNCTION_SEPARATORS } from './TagInput';


// ─── Portal tooltip that escapes overflow clipping ─────────────────────────────
function PortalTooltip({ label, targetRef, visible }: { label: string; targetRef: React.RefObject<HTMLElement | null>; visible: boolean }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (visible && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setPos({
        top: rect.top - 6,
        left: rect.left + rect.width / 2,
      });
    }
  }, [visible, targetRef]);

  if (!visible || !pos) return null;

  return ReactDOM.createPortal(
    <span
      style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translate(-50%, -100%)' }}
      className="px-2 py-1 rounded-md bg-gray-900 text-white text-[11px] whitespace-nowrap pointer-events-none z-[99999] shadow-lg"
    >
      {label}
    </span>,
    document.body
  );
}

// ─── Reusable draggable tag pill ───────────────────────────────────────────────
function DraggableTag({
  label,
  type,
  category,
  onClick,
  variant = 'function',
}: {
  label: string;
  type: 'function' | 'operator' | 'keyword' | 'variable';
  category: string;
  onClick: () => void;
  variant?: 'function' | 'operator' | 'keyword' | 'variable';
}) {
  const styles: Record<string, { bg: string; text: string; grip: string; hover: string; dragBg: string; dragBorder: string; dragText: string }> = {
    function: { bg: 'bg-purple-100', text: 'text-purple-700', grip: 'text-purple-400', hover: 'hover:bg-purple-200', dragBg: 'bg-purple-50', dragBorder: 'border-purple-500', dragText: 'text-purple-700' },
    operator: { bg: 'bg-blue-100', text: 'text-blue-700', grip: 'text-blue-400', hover: 'hover:bg-blue-200', dragBg: 'bg-blue-50', dragBorder: 'border-blue-200', dragText: 'text-blue-700' },
    keyword: { bg: 'bg-amber-100', text: 'text-amber-700', grip: 'text-amber-400', hover: 'hover:bg-amber-200', dragBg: 'bg-amber-50', dragBorder: 'border-amber-200', dragText: 'text-amber-700' },
    variable: { bg: 'bg-purple-100', text: 'text-purple-700', grip: 'text-purple-400', hover: 'hover:bg-purple-200', dragBg: 'bg-purple-50', dragBorder: 'border-purple-200', dragText: 'text-purple-700' },
  };
  const s = styles[variant];

  // Detect function pair (label ends with "()")
  const isFunctionPair = label.endsWith('()');
  const cleanName = isFunctionPair ? label.replace('()', '') : label; // e.g. "length"
  const funcOpenValue = isFunctionPair ? cleanName + '(' : label; // e.g. "length(" — used in TagInput
  const closeBracket = ')';

  const tagTooltip = useTagTooltip(350);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = () => {
    const data = getTagTooltip(label);
    if (data && btnRef.current) {
      tagTooltip.show(data, btnRef.current.getBoundingClientRect(), 'top');
    }
  };
  const handleMouseLeave = () => {
    tagTooltip.hide();
  };

  const handleDragStart = (e: React.DragEvent) => {
    tagTooltip.hide();
    if (isFunctionPair) {
      // Paired function drag: send both open and close tag data
      const sepCount = FUNCTION_SEPARATORS[cleanName] || 0;
      const pairData = JSON.stringify({
        open: { type, id: category, value: funcOpenValue, displayValue: funcOpenValue },
        close: { type, id: category, value: closeBracket, displayValue: closeBracket },
        separatorCount: sepCount,
      });
      e.dataTransfer.setData('application/x-tag-pair', pairData);
      e.dataTransfer.setData('text/plain', cleanName);
      e.dataTransfer.effectAllowed = 'copyMove';

      // Drag preview showing just the function name (no brackets)
      const dragEl = document.createElement('span');
      dragEl.className = `inline-flex items-center gap-1 px-1.5 py-0.5 ${s.dragBg} border ${s.dragBorder} ${s.dragText} rounded-md whitespace-nowrap`;
      dragEl.style.cssText = 'font-size:12px;font-family:monospace;position:fixed;top:-1000px;left:-1000px;z-index:99999;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
      dragEl.textContent = cleanName;
      document.body.appendChild(dragEl);
      e.dataTransfer.setDragImage(dragEl, 0, 0);
      requestAnimationFrame(() => document.body.removeChild(dragEl));
    } else {
      const tagData = JSON.stringify({ type, id: category, value: label, displayValue: label });
      e.dataTransfer.setData('application/x-tag-data', tagData);
      e.dataTransfer.setData('text/plain', label);
      e.dataTransfer.effectAllowed = 'copyMove';

      const dragEl = document.createElement('span');
      dragEl.className = `inline-flex items-center gap-1 px-1.5 py-0.5 ${s.dragBg} border ${s.dragBorder} ${s.dragText} rounded-md whitespace-nowrap`;
      dragEl.style.cssText = 'font-size:12px;font-family:monospace;position:fixed;top:-1000px;left:-1000px;z-index:99999;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
      dragEl.textContent = label;
      document.body.appendChild(dragEl);
      e.dataTransfer.setDragImage(dragEl, 0, 0);
      requestAnimationFrame(() => document.body.removeChild(dragEl));
    }
  };

  // Render paired function tags — show clean name only (no brackets in popover)
  if (isFunctionPair) {
    return (
      <>
        <button
          ref={btnRef}
          draggable
          onDragStart={handleDragStart}
          onClick={onClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`inline-flex items-center gap-0.5 pl-0.5 pr-1.5 py-0.5 rounded-md ${s.bg} ${s.text} text-xs font-mono ${s.hover} transition-colors select-none cursor-move`}
        >
          <span className={`${s.grip} flex items-center`}>
            <GripVertical size={10} />
          </span>
          {cleanName}
        </button>
        {tagTooltip.render()}
      </>
    );
  }

  return (
    <>
      <button
        ref={btnRef}
        draggable
        onDragStart={handleDragStart}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`inline-flex items-center gap-0.5 pl-0.5 pr-1.5 py-0.5 rounded-md ${s.bg} ${s.text} text-xs font-mono ${s.hover} transition-colors select-none cursor-move`}
      >
        <span className={`${s.grip} flex items-center`}>
          <GripVertical size={10} />
        </span>
        {label}
      </button>
      {tagTooltip.render()}
    </>
  );
}

// ─── Field item (used in Data tab) ─────────────────────────────────────────────
function FieldItem({ field, step, stepNumber, onFieldClick, showInsertButton = true }: { field: { name: string; value: any }, step: any, stepNumber: number, onFieldClick: (step: any, fieldName: string, fieldValue: any, type?: 'step' | 'function' | 'operator' | 'keyword' | 'variable') => void, showInsertButton?: boolean }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const fieldBtnRef = useRef<HTMLButtonElement>(null);
  const fieldTooltip = useTagTooltip(450);

  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
      }
    };
    
    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [field.value]);

  const getValueDisplay = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value.toString();
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object') return '{...}';
    return String(value);
  };

  const handleDragStart = (e: React.DragEvent) => {
    fieldTooltip.hide();
    const iconStr = typeof step.icon === 'string' ? step.icon : '⚙';
    const tagData = JSON.stringify({
      type: 'step',
      id: step.id,
      appId: step.appId || step.id,
      stepName: step.name,
      stepColor: step.color,
      stepNumber: stepNumber,
      stepIcon: iconStr,
      path: field.name,
      displayValue: String(field.value)
    });
    e.dataTransfer.setData('application/x-tag-data', tagData);
    e.dataTransfer.setData('text/plain', `${step.name}.${field.name}`);
    e.dataTransfer.effectAllowed = 'copyMove';

    const appId = step.appId || step.id;
    const bgHex = getAppColorHex(appId) !== '#6b7280'
      ? getAppColorHex(appId)
      : twColorToHex(step.color);
    const iconSvg = getAppIconSvg(appId, 10);

    const dragEl = document.createElement('span');
    dragEl.className = 'inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-300 text-gray-900 rounded-md whitespace-nowrap';
    dragEl.style.cssText = 'font-size:12px;position:fixed;top:-1000px;left:-1000px;z-index:99999;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,0.15);';

    dragEl.innerHTML = `<span style="width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;border-radius:3px;color:white;background:${bgHex};flex-shrink:0">${iconSvg}</span><span>${stepNumber}. ${step.name}.${field.name}</span>`;
    document.body.appendChild(dragEl);
    e.dataTransfer.setDragImage(dragEl, 0, 0);
    requestAnimationFrame(() => document.body.removeChild(dragEl));
  };

  return (
    <>
    <button
      ref={fieldBtnRef}
      draggable
      onDragStart={handleDragStart}
      onClick={() => onFieldClick(step, field.name, field.value, 'step')}
      onMouseEnter={() => {
        const data = getStepTagTooltip(step.name, field.name, stepNumber, field.value);
        if (fieldBtnRef.current) fieldTooltip.show(data, fieldBtnRef.current.getBoundingClientRect(), 'left');
      }}
      onMouseLeave={() => fieldTooltip.hide()}
      className={`w-full flex items-center px-1 py-1.5 hover:bg-gray-100 rounded-md transition-colors text-left group relative overflow-hidden select-none cursor-move ${isTruncated ? 'scroll-on-hover' : ''}`}
    >
      <span className="overflow-hidden w-0 group-hover:w-3.5 transition-all duration-200 ease-out shrink-0 flex items-center">
        <span className="text-gray-300 group-hover:text-gray-400 flex items-center">
          <GripVertical size={12} />
        </span>
      </span>
      <span className="text-[12px] font-medium group-hover:text-gray-700 shrink-0 relative z-10 bg-white group-hover:bg-gray-100 ml-1" style={{ color: 'hsl(257, 74%, 57%)' }}>
        {field.name}:
      </span>
      <span className="flex-1 min-w-0 overflow-hidden pr-1 relative">
        <span 
          ref={textRef}
          className="text-[12px] text-gray-500 whitespace-nowrap text-ellipsis overflow-hidden scrolling-text block"
        >
          {getValueDisplay(field.value)}
        </span>
      </span>
      {showInsertButton && (
        <span 
          className="text-[12px] opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-0 bottom-0 bg-gray-100 pl-1 pr-3 flex items-center text-gray-700" 
        >
          Insert
        </span>
      )}
    </button>
    {fieldTooltip.render()}
    </>
  );
}

// ─── Section header for formula tabs ───────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return <h4 className="text-[10px] uppercase text-gray-400 font-semibold mb-2 tracking-wider">{title}</h4>;
}

// ─── Tab type ─────────────────────────────────────────────────────────────────
type TabKey = 'data' | 'text' | 'math_date' | 'lists' | 'logic';

// ─── Main component ────────────────────────────────────────────────────────────
interface DataSelectorContentProps {
  availableSteps: Array<{
    id: string;
    name: string;
    icon: ReactNode;
    color: string;
    fields: Record<string, any>;
  }>;
  onFieldClick: (step: any, fieldName: string, fieldValue: any, type?: 'step' | 'function' | 'operator' | 'keyword' | 'variable') => void;
  maxHeight?: string;
  showInsertButton?: boolean;
  hideDataTab?: boolean;
}

export function DataSelectorContent({ availableSteps, onFieldClick, maxHeight = '320px', showInsertButton = true, hideDataTab = false }: DataSelectorContentProps) {
  const [openStepId, setOpenStepId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabKey>(hideDataTab ? 'text' : 'data');
  const hasMounted = useRef(false);

  // Mark as mounted
  useEffect(() => {
    requestAnimationFrame(() => {
      hasMounted.current = true;
    });
  }, []);

  // Auto-open if only one step exists
  useEffect(() => {
    if (availableSteps.length === 1 && !openStepId) {
      setOpenStepId(availableSteps[0].id);
    }
  }, [availableSteps]);

  // Function to flatten nested objects into field list
  const getFieldsList = (fields: Record<string, any>) => {
    const result: Array<{ name: string; value: any }> = [];
    const traverse = (obj: any, prefix: string = '') => {
      if (!obj || typeof obj !== 'object') return;
      Object.entries(obj).forEach(([key, value]) => {
        const fieldName = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          traverse(value, fieldName);
        } else {
          result.push({ name: fieldName, value });
        }
      });
    };
    traverse(fields);
    return result;
  };

  // ─── Tab definitions ──────────────────────────────────────────────────────────
  const allTabs: Array<{ key: TabKey; icon: any; label: string }> = [
    { key: 'data', icon: Database, label: 'Data' },
    { key: 'text', icon: Type, label: 'Text' },
    { key: 'math_date', icon: Calculator, label: 'Math & Date' },
    { key: 'lists', icon: List, label: 'Lists' },
    { key: 'logic', icon: GitBranch, label: 'Logic' },
  ];
  const visibleTabs = allTabs.filter((tab) => !(hideDataTab && tab.key === 'data'));

  return (
    <div className="flex flex-col h-full" style={{ maxHeight }}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db #f3f4f6;
        }
        
        @keyframes scroll-text {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        
        .scroll-on-hover:hover .scrolling-text {
          animation: scroll-text 8s linear infinite;
        }
      `}</style>

      {/* ─── Tab Bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white z-20 flex items-center justify-start gap-0.5 border-b border-gray-200 mb-1 shrink-0 px-[6px] pt-[6px] pb-[0px] overflow-x-auto no-scrollbar">
        <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <TabButton
              key={tab.key}
              tabKey={tab.key}
              label={tab.label}
              icon={Icon}
              isActive={isActive}
              hasMounted={hasMounted}
              onClick={() => setActiveTab(tab.key)}
            />
          );
        })}
      </div>

      {/* ─── Search bar (Data tab only) ──────────────────────────────────── */}
      {activeTab === 'data' && (
        <div className="px-1 pb-0 bg-white z-10 shrink-0 border-b border-gray-200">
          <div className="relative mb-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={(e) => e.stopPropagation()}
              placeholder="Search data..."
              className="w-full pl-8 pr-2 py-1.5 text-xs border-none focus:outline-none transition-colors bg-transparent"
            />
          </div>
        </div>
      )}

      {/* ─── Tab Content ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 rounded-b-xl">

        {/* ── DATA TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'data' && (
          <>
            {availableSteps.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-400">No previous steps</p>
              </div>
            ) : (
              <div className="p-[4px]">
                {availableSteps
                  .map((step, stepIndex) => {
                    const fieldsList = getFieldsList(step.fields);
                    const filteredFields = searchQuery.trim()
                      ? fieldsList.filter((field) =>
                          field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          step.name.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                      : fieldsList;

                    if (filteredFields.length === 0) return null;
                  
                    return (
                      <div key={step.id} className="mb-px">
                        <button
                          onClick={() => setOpenStepId(openStepId === step.id ? null : step.id)}
                          onMouseDown={(e) => e.preventDefault()}
                          className={`w-full flex items-center justify-between gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors text-left ${openStepId === step.id ? 'bg-gray-50' : ''}`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className={`w-5 h-5 ${step.color} rounded flex items-center justify-center shrink-0`} style={{ color: 'white' }}>
                              {isValidElement(step.icon) ? cloneElement(step.icon as React.ReactElement<any>, { size: 12 }) : <span style={{ fontSize: '9px' }}>{step.icon}</span>}
                            </div>
                            <span className="text-[12px] text-gray-900 truncate">
                              <span className="mr-1">{stepIndex + 1}.</span>
                              {step.name}
                            </span>
                          </div>
                          {openStepId === step.id ? (
                            <ChevronDown size={16} className="text-gray-400 shrink-0" />
                          ) : (
                            <ChevronRight size={16} className="text-gray-400 shrink-0" />
                          )}
                        </button>

                        {openStepId === step.id && (
                          <div className="mt-0.5 space-y-px">
                            {filteredFields.map((field) => (
                              <FieldItem key={field.name} field={field} step={step} stepNumber={stepIndex + 1} onFieldClick={onFieldClick} showInsertButton={showInsertButton} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                  .filter(Boolean)}
                
                {searchQuery.trim() && 
                 availableSteps.every((step) => {
                   const fieldsList = getFieldsList(step.fields);
                   const filteredFields = fieldsList.filter((field) =>
                     field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                     step.name.toLowerCase().includes(searchQuery.toLowerCase())
                   );
                   return filteredFields.length === 0;
                 }) && (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-400">No fields found</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── TEXT TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'text' && (
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <SectionHeader title="Functions" />
                <div className="flex flex-wrap gap-1.5">
                  {['length()', 'lower()', 'upper()', 'trim()', 'substring()', 'replace()', 'contains()', 'split()', 'toString()', 'base64()'].map((fn) => (
                    <DraggableTag key={fn} label={fn} type="function" category="text" variant="function" onClick={() => onFieldClick({ id: 'text', name: 'Text' }, fn.replace('()', ''), fn, 'function')} />
                  ))}
                </div>
              </div>
              <div>
                <SectionHeader title="Keywords" />
                <div className="flex flex-wrap gap-1.5">
                  {['space', 'emptystring', 'newline'].map((kw) => (
                    <DraggableTag key={kw} label={kw} type="keyword" category="text" variant="keyword" onClick={() => onFieldClick({ id: 'text', name: 'Text' }, kw, kw, 'function')} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MATH & DATE TAB ────────────────────────────────────────────── */}
        {activeTab === 'math_date' && (
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <SectionHeader title="Math Functions" />
                <div className="flex flex-wrap gap-1.5">
                  {['sum()', 'average()', 'min()', 'max()', 'round()', 'floor()', 'ceil()', 'parseNumber()', 'sqrt()', 'abs()', 'median()', 'trunc()', 'stdevS()', 'stdevP()', 'formatNumber()'].map((fn) => (
                    <DraggableTag key={fn} label={fn} type="function" category="math" variant="function" onClick={() => onFieldClick({ id: 'math', name: 'Math' }, fn.replace('()', ''), fn, 'function')} />
                  ))}
                </div>
              </div>
              <div>
                <SectionHeader title="Math Operators" />
                <div className="flex flex-wrap gap-1.5">
                  {['*', '/', 'mod', '+', '-'].map((op) => (
                    <DraggableTag key={op} label={op} type="operator" category="math" variant="operator" onClick={() => onFieldClick({ id: 'math', name: 'Math' }, op, op, 'operator')} />
                  ))}
                </div>
              </div>
              <div>
                <SectionHeader title="Date Functions" />
                <div className="flex flex-wrap gap-1.5">
                  {['formatDate()', 'addDays()', 'addHours()', 'now()', 'beginning_of_month()', 'end_of_month()', 'differenceInDays()'].map((fn) => (
                    <DraggableTag key={fn} label={fn} type="function" category="date" variant="function" onClick={() => onFieldClick({ id: 'date', name: 'Date' }, fn.replace('()', ''), fn, 'function')} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── LISTS TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'lists' && (
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <SectionHeader title="Functions" />
                <div className="flex flex-wrap gap-1.5">
                  {['length()', 'map()', 'filter()', 'reduce()', 'sum()', 'average()', 'get()', 'join()', 'split()', 'flatten()', 'unique()', 'sort()'].map((fn) => (
                    <DraggableTag key={fn} label={fn} type="function" category="lists" variant="function" onClick={() => onFieldClick({ id: 'lists', name: 'Lists' }, fn.replace('()', ''), fn, 'function')} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── LOGIC TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'logic' && (
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <SectionHeader title="Functions" />
                <div className="flex flex-wrap gap-1.5">
                  {['if()', 'ifempty()', 'switch()', 'get()', 'pick()', 'omit()'].map((fn) => (
                    <DraggableTag key={fn} label={fn} type="function" category="logic" variant="function" onClick={() => onFieldClick({ id: 'logic', name: 'Logic' }, fn.replace('()', ''), fn, 'function')} />
                  ))}
                </div>
              </div>
              <div>
                <SectionHeader title="Operators" />
                <div className="flex flex-wrap gap-1.5">
                  {['=', '!=', '>', '<', '>=', '<=', 'and', 'or', 'not'].map((op) => (
                    <DraggableTag key={op} label={op} type="operator" category="logic" variant="operator" onClick={() => onFieldClick({ id: 'logic', name: 'Logic' }, op, op, 'operator')} />
                  ))}
                </div>
              </div>
              <div>
                <SectionHeader title="Keywords" />
                <div className="flex flex-wrap gap-1.5">
                  {['true', 'false', 'null'].map((kw) => (
                    <DraggableTag key={kw} label={kw} type="keyword" category="logic" variant="keyword" onClick={() => onFieldClick({ id: 'logic', name: 'Logic' }, kw, kw, 'function')} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab Button Component ──────────────────────────────────────────────────────
interface TabButtonProps {
  tabKey: TabKey;
  label: string;
  icon: any;
  isActive: boolean;
  hasMounted: React.MutableRefObject<boolean>;
  onClick: () => void;
}

function TabButton({ tabKey, label, icon: Icon, isActive, hasMounted, onClick }: TabButtonProps) {
  const btnRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      ref={btnRef}
      className="relative shrink-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.button
        onClick={onClick}
        className={`flex items-center border-b-2 rounded-t-sm overflow-hidden ${
          isActive
            ? 'border-gray-900 text-gray-900'
            : 'border-transparent text-gray-400 hover:bg-gray-50 hover:text-gray-600'
        }`}
        initial={false}
        animate={{
          paddingLeft: isActive ? 2 : 5,
          paddingRight: isActive ? 2 : 5,
          paddingTop: 6,
          paddingBottom: 8,
        }}
        transition={hasMounted.current ? { type: 'spring', bounce: 0, duration: 0.6 } : { duration: 0 }}
      >
        <Icon size={14} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
        <AnimatePresence initial={false}>
          {isActive && (
            <motion.span
              key="label"
              initial={{ width: 0, opacity: 0, marginLeft: 0 }}
              animate={{ width: 'auto', opacity: 1, marginLeft: 4 }}
              exit={{ width: 0, opacity: 0, marginLeft: 0 }}
              transition={hasMounted.current ? { delay: 0.1, type: 'spring', bounce: 0, duration: 0.6 } : { duration: 0 }}
              className="overflow-hidden whitespace-nowrap font-medium text-[13px]"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      {!isActive && <PortalTooltip label={label} targetRef={btnRef} visible={hovered} />}
    </div>
  );
}
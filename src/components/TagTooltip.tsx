import { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { TagTooltipData } from './tag-tooltip-registry';
import { CornerDownRight } from 'lucide-react';

// ─── Portal tooltip that shows description + examples for tags ──────────────────

/**
 * Parses an example string into styled segments.
 * E.g. 'length("hello") → 5' → { funcName: 'length', args: '("hello")', result: '5' }
 * E.g. 'price * quantity → 49.98' → { funcName: null, expression: 'price * quantity', result: '49.98' }
 */
function parseExample(ex: string) {
  // Split on arrow
  const arrowIdx = ex.indexOf('→');
  const expression = arrowIdx >= 0 ? ex.slice(0, arrowIdx).trim() : ex.trim();
  const result = arrowIdx >= 0 ? ex.slice(arrowIdx + 1).trim() : null;

  // Try to extract a leading function name: word( or word_word(
  const funcMatch = expression.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\(/);
  if (funcMatch) {
    // Find the matching closing paren
    let depth = 0;
    let closeIdx = -1;
    for (let i = funcMatch[1].length; i < expression.length; i++) {
      if (expression[i] === '(') depth++;
      else if (expression[i] === ')') {
        depth--;
        if (depth === 0) { closeIdx = i; break; }
      }
    }
    const innerContent = closeIdx >= 0
      ? expression.slice(funcMatch[1].length + 1, closeIdx)
      : expression.slice(funcMatch[1].length + 1);
    const trailing = closeIdx >= 0 ? expression.slice(closeIdx + 1) : '';

    return {
      funcName: funcMatch[1],
      innerContent,
      hasCloseParen: closeIdx >= 0,
      trailing,
      rest: null,
      expression,
      result,
    };
  }

  return { funcName: null, rest: null, innerContent: null, hasCloseParen: false, trailing: '', expression, result };
}

/**
 * Highlights operators and keywords in orange-300 within a text segment.
 */
const OPERATORS_KEYWORDS_RE = /(\b(?:and|or|not|true|false|null)\b|!=|>=|<=|[=><])/g;

function highlightTokens(text: string, keyPrefix: string = '') {
  const parts = text.split(OPERATORS_KEYWORDS_RE);
  return parts.map((part, i) => {
    if (OPERATORS_KEYWORDS_RE.test(part)) {
      // Reset lastIndex since we use .test()
      OPERATORS_KEYWORDS_RE.lastIndex = 0;
      return <span key={`${keyPrefix}${i}`} className="text-orange-300">{part}</span>;
    }
    OPERATORS_KEYWORDS_RE.lastIndex = 0;
    return <span key={`${keyPrefix}${i}`} className="text-white">{part}</span>;
  });
}

/**
 * Renders inner content of a function call with commas and operators/keywords in orange.
 */
function renderInnerContent(content: string) {
  // Split on commas, keeping them as separators
  const parts = content.split(/(,)/);
  return parts.map((part, i) =>
    part === ',' ? (
      <span key={i} className="text-orange-300">,</span>
    ) : (
      <span key={i}>{highlightTokens(part, `inner-${i}-`)}</span>
    )
  );
}

interface TagTooltipPortalProps {
  data: TagTooltipData;
  anchorRect: DOMRect;
  placement?: 'top' | 'left';
}

function TagTooltipPortal({ data, anchorRect, placement = 'top' }: TagTooltipPortalProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    // Wait one frame so the tooltip element is mounted & measured
    requestAnimationFrame(() => {
      const el = tooltipRef.current;
      if (!el) return;
      const tRect = el.getBoundingClientRect();

      if (placement === 'left') {
        // Position to the left of the anchor, vertically centered
        let top = anchorRect.top + anchorRect.height / 2 - tRect.height / 2;
        let left = anchorRect.left - tRect.width - 10;
        // Clamp to viewport
        if (left < 8) left = anchorRect.right + 10; // fallback to right
        if (top < 8) top = 8;
        if (top + tRect.height > window.innerHeight - 8) top = window.innerHeight - tRect.height - 8;
        setPos({ top, left });
      } else {
        // Position above the anchor, horizontally centered
        let top = anchorRect.top - tRect.height - 10;
        let left = anchorRect.left + anchorRect.width / 2 - tRect.width / 2;
        // Clamp
        if (left < 8) left = 8;
        if (left + tRect.width > window.innerWidth - 8) left = window.innerWidth - tRect.width - 8;
        if (top < 8) {
          top = anchorRect.bottom + 10; // fallback below
        }
        setPos({ top, left });
      }
    });
  }, [anchorRect, placement]);

  return ReactDOM.createPortal(
    <div
      ref={tooltipRef}
      className="pointer-events-none z-[999999]"
      style={{
        position: 'fixed',
        top: pos ? pos.top : -9999,
        left: pos ? pos.left : -9999,
        opacity: pos ? 1 : 0,
        transition: 'opacity 0.12s ease',
      }}
    >
      <div
        className="bg-black text-white rounded-lg px-3 py-2.5 shadow-xl"
        style={{ maxWidth: 300, minWidth: 180 }}
      >
        {/* Description */}
        <p className="text-[12px] leading-relaxed mb-2">{data.description}</p>

        {/* Examples */}
        {data.examples.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
              {data.examples.length > 1 ? 'Examples' : 'Example'}
            </p>
            {data.examples.map((ex, i) => {
              const parsed = parseExample(ex);
              return (
                <div key={i} className="space-y-1">
                  {/* Expression */}
                  <div className="text-[11px] font-mono font-medium rounded px-2 py-1.5 leading-snug" style={{ backgroundColor: '#2a2a2a' }}>
                    {parsed.funcName ? (
                      <>
                        <span className="text-orange-300">{parsed.funcName}</span>
                        <span className="text-orange-300">(</span>
                        {renderInnerContent(parsed.innerContent)}
                        {parsed.hasCloseParen && <span className="text-orange-300">)</span>}
                        {parsed.trailing && <span className="text-white">{parsed.trailing}</span>}
                      </>
                    ) : (
                      <span>{highlightTokens(parsed.expression, 'expr-')}</span>
                    )}
                  </div>
                  {/* Result */}
                  {parsed.result && (
                    <div className="text-[11px] font-mono rounded px-2 py-1.5 leading-snug text-white flex items-center gap-1.5" style={{ backgroundColor: '#2a2a2a' }}>
                      <CornerDownRight size={12} className="text-gray-300 shrink-0" />
                      <span>{parsed.result}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Hook for showing tooltip on hover with delay ───────────────────────────────

export function useTagTooltip(delay = 400) {
  const [tooltip, setTooltip] = useState<{
    data: TagTooltipData;
    rect: DOMRect;
    placement: 'top' | 'left';
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((data: TagTooltipData, rect: DOMRect, placement: 'top' | 'left' = 'top') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setTooltip({ data, rect, placement });
    }, delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setTooltip(null);
  }, []);

  const render = useCallback(() => {
    if (!tooltip) return null;
    return <TagTooltipPortal data={tooltip.data} anchorRect={tooltip.rect} placement={tooltip.placement} />;
  }, [tooltip]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { show, hide, render };
}

export { TagTooltipPortal };
import { X, Code, CornerDownLeft } from 'lucide-react';
import { useState, isValidElement, cloneElement } from 'react';

// Discriminated Union Type for Tags
export type DataTagItem = 
  | { 
      type: 'step'; 
      id: string; // was stepId
      appId?: string; // e.g. 'gmail', 'slack' — used for icon/color registry lookup
      stepName: string; 
      stepIcon: React.ReactNode; 
      stepColor: string; 
      stepNumber?: number;
      path: string; // was fieldPath
      displayValue: string; 
    }
  | { 
      type: 'function' | 'operator' | 'keyword' | 'variable'; 
      id: string; 
      value: string; // was fieldPath (e.g. "sum" or "+")
      displayValue: string; // was displayValue (e.g. "sum()")
    };

// Legacy alias for compatibility during migration if needed, but we'll update usages.
export type DataTagValue = DataTagItem; 

interface DataTagProps {
  tag: DataTagItem;
  onRemove?: () => void;
  size?: 'sm' | 'md';
  variant?: 'purple' | 'white';
  onReply?: () => void;
  onEnhance?: () => void;
  disableHover?: boolean;
}

export function DataTag({ tag, onRemove, size = 'sm', variant = 'purple', onReply, onEnhance, disableHover = false }: DataTagProps) {
  const isSmall = size === 'sm';
  const [isHovered, setIsHovered] = useState(false);
  
  // 1. Function/Operator Token Renderer
  if (tag.type === 'function' || tag.type === 'operator' || tag.type === 'keyword' || tag.type === 'variable') {
    const colorMap: Record<string, { bg: string; border: string; text: string; hoverBg: string }> = {
      function: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', hoverBg: 'hover:bg-purple-200' },
      operator: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', hoverBg: 'hover:bg-blue-200' },
      keyword:  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', hoverBg: 'hover:bg-amber-200' },
      variable: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', hoverBg: 'hover:bg-purple-200' },
    };
    const c = colorMap[tag.type] || colorMap.function;
    return (
      <span 
        className={`inline-flex items-center gap-1 ${
          isSmall ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'
        } font-mono ${c.bg} border ${c.border} ${c.text} rounded-md mx-0.5 align-middle select-none transition-colors`}
        contentEditable={false}
        style={{ userSelect: 'none' }}
      >
        <span>{tag.value}</span>
        {onRemove && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            className={`${c.hoverBg} rounded p-0.5 transition-colors`}
            type="button"
          >
            <X size={isSmall ? 10 : 12} />
          </button>
        )}
      </span>
    );
  }

  // 2. Data Step Token Renderer
  return (
    <span 
      className={`inline-flex items-center gap-1 bg-white border border-gray-300 ${!disableHover ? 'hover:border-black' : ''} rounded-md ${
        isSmall ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'
      } text-black font-medium mx-0.5 align-middle relative transition-colors`}
      contentEditable={false}
      style={{ userSelect: 'none' }}
      onMouseEnter={!disableHover ? () => setIsHovered(true) : undefined}
      onMouseLeave={!disableHover ? () => setIsHovered(false) : undefined}
    >
      {/* Hover Bar (Only for steps as they might support reply/enhance) */}
      {!disableHover && isHovered && (
        <span 
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 flex items-center gap-1 bg-white border border-gray-300 rounded px-0.5 py-0.5 whitespace-nowrap z-50"
          style={{ 
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Triangle arrow pointing down */}
          <span 
            className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px"
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid white',
              filter: 'drop-shadow(0 1px 0 rgba(209, 213, 219, 1))',
              zIndex: 51
            }}
          />
          
          {/* Invisible bridge */}
          <span 
            className="absolute top-full left-0 right-0 h-2"
            style={{ pointerEvents: 'auto' }}
          />
          
          {onReply && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onReply();
              }}
              className="flex items-center gap-1 text-gray-700 hover:text-black hover:bg-gray-100 transition-colors text-xs font-medium px-2 py-1 rounded"
              type="button"
            >
              <CornerDownLeft size={12} />
              <span>Reply</span>
            </button>
          )}
        </span>
      )}
      
      {/* Icon */}
      <span 
        className={`flex items-center justify-center ${isSmall ? 'w-4 h-4 text-[10px]' : 'w-5 h-5 text-xs'} ${tag.stepName === 'Code' ? 'text-[hsl(25,95%,53%)]' : tag.stepColor + ' rounded text-white'} shrink-0`}
      >
        {tag.stepName === 'Code'
          ? <Code size={isSmall ? 10 : 12} />
          : isValidElement(tag.stepIcon)
            ? cloneElement(tag.stepIcon as React.ReactElement<any>, { size: isSmall ? 10 : 12 })
            : tag.stepIcon}
      </span>
      
      {/* Name + Path */}
      <span className="font-mono truncate max-w-[200px]">
        {tag.stepNumber != null && `${tag.stepNumber}. `}{tag.stepName}.{tag.path}
      </span>
      
      {/* Remove Button */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-gray-200 rounded p-0.5 transition-colors"
          type="button"
        >
          <X size={isSmall ? 10 : 12} />
        </button>
      )}
    </span>
  );
}
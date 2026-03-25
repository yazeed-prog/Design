import { Minus, ChevronDown, ChevronRight, Info, Expand, Search } from 'lucide-react';
import { useState, ReactNode } from 'react';
import { ExpandedDataSelector } from './ExpandedDataSelector';
import { DataSelectorContent } from './DataSelectorContent';

interface DataSelectorProps {
  onMinimize?: () => void;
  onSelectData?: (data: { stepId: string; stepName: string; field: string; fieldValue: any; type?: 'step' | 'function' | 'operator' | 'keyword' | 'variable' }) => void;
  onDataSelect?: (data: { stepId: string; stepName: string; field: string; fieldValue: any; type?: 'step' | 'function' | 'operator' | 'keyword' | 'variable' }) => void;
  onClose?: () => void;
  onExpand?: () => void;
  availableSteps?: Array<{
    id: string;
    name: string;
    icon: ReactNode;
    color: string;
    fields: Record<string, any>;
  }>;
  hideDataTab?: boolean;
}

export function DataSelector({ onMinimize, onSelectData, onDataSelect, onClose, onExpand, availableSteps = [], hideDataTab = false }: DataSelectorProps) {
  const handleFieldClick = (step: any, fieldName: string, fieldValue: any, type: 'step' | 'function' | 'operator' | 'keyword' | 'variable' = 'step') => {
    if (onSelectData) {
      onSelectData({
        stepId: step.id,
        stepName: step.name,
        field: fieldName,
        fieldValue: fieldValue,
        type: type
      });
    }
    if (onDataSelect) {
      onDataSelect({
        stepId: step.id,
        stepName: step.name,
        field: fieldName,
        fieldValue: fieldValue,
        type: type
      });
    }
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col transition-all"
      style={{ 
        width: '280px', 
        maxHeight: '400px' 
      }}
    >
      {/* Header */}
      <div className="hidden flex items-center justify-between p-3 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-900">Data Selector</h3>
          <div className="relative group/info">
            <div 
              className="cursor-help transition-colors"
            >
              <Info size={14} className="text-gray-400 hover:text-gray-600" />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50 text-center leading-relaxed" style={{ width: '200px' }}>
              Use data from previous steps to insert into the field
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onExpand}
            onMouseDown={(e) => e.preventDefault()}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <Expand size={16} />
          </button>
          {onMinimize && (
            <button
              onClick={onMinimize}
              onMouseDown={(e) => e.preventDefault()}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              <Minus size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Steps List - Scrollable */}
      <DataSelectorContent 
        availableSteps={availableSteps}
        onFieldClick={handleFieldClick}
        maxHeight="400px"
        hideDataTab={hideDataTab}
      />
    </div>
  );
}
import { Settings, Trash2, Zap, AlertCircle } from 'lucide-react';

interface FlowStep {
  id: string;
  appId: string;
  appName: string;
  appIcon: string;
  appColor: string;
  action?: string;
}

interface FlowNodeProps {
  step: FlowStep;
  isTrigger?: boolean;
  onDelete: () => void;
}

export function FlowNode({ step, isTrigger = false, onDelete }: FlowNodeProps) {
  const isConfigured = !!step.action;

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 hover:border-[hsl(257,74%,77%)] transition-colors shadow-sm group">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        {isTrigger && (
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-100 text-yellow-600 shrink-0">
            <Zap size={16} />
          </div>
        )}
        <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${step.appColor} text-white shrink-0 shadow-sm`}>
          <span className="text-2xl">{step.appIcon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base text-gray-900">{step.appName}</h3>
            {isTrigger && (
              <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                Trigger
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {isConfigured ? step.action : 'Choose an action...'}
          </p>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-2 text-gray-500 hover:text-[hsl(257,74%,57%)] hover:bg-[hsl(257,74%,97%)] rounded-lg transition-colors">
            <Settings size={18} />
          </button>
          {!isTrigger && (
            <button 
              onClick={onDelete}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {isConfigured ? (
          <div className="space-y-2">
            <div className="text-sm text-gray-700">
              <span className="text-gray-500">Spreadsheet:</span> Customer Database
            </div>
            <div className="text-sm text-gray-700">
              <span className="text-gray-500">Worksheet:</span> Sheet1
            </div>
          </div>
        ) : (
          <button className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-[hsl(257,74%,67%)] hover:bg-[hsl(257,74%,97%)]/50 transition-colors">
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <AlertCircle size={16} />
              <span className="text-sm">Configure this step</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
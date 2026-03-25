import { useState, useRef } from 'react';
import { AppSelector } from './AppSelector';
import { FlowNode } from './FlowNode';
import { Plus } from 'lucide-react';

interface FlowStep {
  id: string;
  appId: string;
  appName: string;
  appIcon: string;
  appColor: string;
  action?: string;
}

export function FlowBuilder() {
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([
    {
      id: 'trigger',
      appId: 'sheets',
      appName: 'Google Sheets',
      appIcon: '📊',
      appColor: 'bg-green-500',
      action: 'When a new row is added'
    }
  ]);
  const [showSelector, setShowSelector] = useState(false);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const buttonRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});

  const handleAddStep = (index: number, event: React.MouseEvent<HTMLButtonElement>) => {
    const button = buttonRefs.current[index];
    if (button) {
      const rect = button.getBoundingClientRect();
      setPopoverPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX + rect.width / 2
      });
    }
    setInsertAfterIndex(index);
    setShowSelector(true);
  };

  const handleSelectApp = (app: { id: string; name: string; icon: string; color: string }) => {
    if (insertAfterIndex !== null) {
      const newStep: FlowStep = {
        id: `step-${Date.now()}`,
        appId: app.id,
        appName: app.name,
        appIcon: app.icon,
        appColor: app.color,
      };

      const newSteps = [...flowSteps];
      newSteps.splice(insertAfterIndex + 1, 0, newStep);
      setFlowSteps(newSteps);
    }
    
    setShowSelector(false);
    setInsertAfterIndex(null);
  };

  const handleCloseSelector = () => {
    setShowSelector(false);
    setInsertAfterIndex(null);
  };

  const handleDeleteStep = (id: string) => {
    if (id !== 'trigger') {
      setFlowSteps(flowSteps.filter(step => step.id !== id));
    }
  };

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-1">New Automation</h1>
            <p className="text-sm text-gray-500">Build your workflow by connecting apps and actions</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              Cancel
            </button>
            <button className="px-4 py-2 bg-[hsl(257,74%,57%)] text-white hover:bg-[hsl(257,74%,47%)] rounded-lg transition-colors">
              Save & Activate
            </button>
          </div>
        </div>
      </div>

      {/* Flow Canvas */}
      <div className="h-[calc(100vh-88px)] overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto">
          {/* Flow Steps */}
          <div className="space-y-4">
            {flowSteps.map((step, index) => (
              <div key={step.id}>
                <FlowNode
                  step={step}
                  isTrigger={step.id === 'trigger'}
                  onDelete={() => handleDeleteStep(step.id)}
                />
                
                {/* Add Step Button */}
                <div className="flex justify-center my-4">
                  <button
                    ref={(el) => (buttonRefs.current[index] = el)}
                    onClick={(e) => handleAddStep(index, e)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-[hsl(257,74%,57%)] hover:bg-[hsl(257,74%,97%)] rounded-lg transition-colors group"
                  >
                    <div className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-gray-300 group-hover:border-[hsl(257,74%,57%)] transition-colors">
                      <Plus size={16} />
                    </div>
                    <span>Add Step</span>
                  </button>
                </div>

                {/* Connector Line */}
                {index < flowSteps.length - 1 && (
                  <div className="w-0.5 h-8 bg-gray-300 mx-auto -my-4"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* App Selector Popover */}
      {showSelector && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={handleCloseSelector}
          />
          {/* Popover */}
          <div 
            className="fixed z-50"
            style={{
              top: `${popoverPosition.top}px`,
              left: `${popoverPosition.left}px`,
              transform: 'translateX(-50%)'
            }}
          >
            <AppSelector 
              onSelect={handleSelectApp} 
              onClose={handleCloseSelector}
            />
          </div>
        </>
      )}
    </div>
  );
}
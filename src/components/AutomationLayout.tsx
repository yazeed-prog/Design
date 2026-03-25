import { LeftChatSidebar } from './LeftChatSidebar';
import { LeftSidebar } from './LeftSidebar';
import { TopHeader } from './TopHeader';
import { FlowCanvas } from './FlowCanvas';
import { RightSidebar } from './RightSidebar';
import { ExpandedDataSelector } from './ExpandedDataSelector';
import { AIFillAssistant } from './AIFillAssistant';
import { useState, ReactNode, useRef, useEffect, useCallback } from 'react';
import { Wrench, Database, Sparkles } from 'lucide-react';
import { createPopper } from '@popperjs/core';
import { APP_FIELD_DEFINITIONS } from './app-field-definitions';
import { SidebarProvider } from './ui/sidebar';

interface Step {
  id: string;
  appId: string;
  name: string;
  icon: React.ReactNode;
  color: string;
}

export function AutomationLayout() {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isDataSelectorExpanded, setIsDataSelectorExpanded] = useState(false);
  const [isExpandedDataSelectorMinimized, setIsExpandedDataSelectorMinimized] = useState(false);
  const [activeInputElement, setActiveInputElement] = useState<HTMLElement | null>(null);
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [showAIFillAssistant, setShowAIFillAssistant] = useState(false);
  const [isAIFilling, setIsAIFilling] = useState(false);
  const [fieldsToFill, setFieldsToFill] = useState<Array<{ name: string; label: string; type: 'text' | 'textarea' | 'select'; placeholder?: string }>>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [currentFillingField, setCurrentFillingField] = useState<string | null>(null);
  
  // 🐛 Debug: Monitor fieldsToFill changes
  useEffect(() => {
    console.log('🔥 AutomationLayout: fieldsToFill STATE updated:', fieldsToFill);
  }, [fieldsToFill]);
  
  const [testButtonClicked, setTestButtonClicked] = useState(false); // Signal to click test button
  const [testButtonGlow, setTestButtonGlow] = useState(false); // Signal to glow test button
  const [testResults, setTestResults] = useState<Record<string, { status: 'idle' | 'testing' | 'success' | 'failed'; output: any; date: string | null }>>({});
  const minimizedIconRef = useRef<HTMLDivElement>(null);
  const popperInstanceRef = useRef<any>(null);
  const rightSidebarRef = useRef<{ 
    handleRequestTest: () => void; 
    handleTriggerTestGlow: () => void;
    getTestResult: () => { status: 'idle' | 'testing' | 'success' | 'failed'; output: any; date: string | null } | null;
  }>(null);
  const [steps, setSteps] = useState<Step[]>([
    {
      id: 'step-1',
      appId: 'gmail',
      name: 'Send Email',
      icon: '📧',
      color: 'bg-red-500'
    }
    // TODO: Add more steps later with same features as Gmail
    // - Slack: Send Message
    // - Notion: Create Page
  ]);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0, top: 0, left: 0 });
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [aiHasNewMessage, setAiHasNewMessage] = useState(false);
  const [isAIChatMinimized, setIsAIChatMinimized] = useState(true); // Changed to true - AI Assistant closed by default
  // 💾 AI Chat State - محفوظ حتى لو تم إغلاق السايدبار
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ role: 'user' | 'ai' | 'step-header'; content: string; stepName?: string; stepNumber?: string; stepIcon?: string; stepColor?: string }>>([]);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ fieldName: string; fieldLabel: string; value: string }>>([]);
  const [aiShowSuggestions, setAiShowSuggestions] = useState(false);
  const [aiIsThinking, setAiIsThinking] = useState(false);
  const isSidebarOpen = selectedCardId !== null;

  // 🎯 Update fieldsToFill when selectedCardId changes
  useEffect(() => {
    if (selectedCardId) {
      const selectedStep = steps.find(s => s.id === selectedCardId);
      if (selectedStep?.appId) {
        const fieldDefinitions = APP_FIELD_DEFINITIONS[selectedStep.appId];
        if (fieldDefinitions) {
          setFieldsToFill(fieldDefinitions);
          console.log('✅ AutomationLayout: Updated fieldsToFill for step:', selectedCardId, fieldDefinitions);
        } else {
          setFieldsToFill([]);
          console.log('⚠️ AutomationLayout: No field definitions for appId:', selectedStep.appId);
        }
      }
    } else {
      setFieldsToFill([]);
      console.log('🚫 AutomationLayout: Cleared fieldsToFill (no step selected)');
    }
  }, [selectedCardId, steps]);

  // Setup Popper for minimized icon positioning
  useEffect(() => {
    if (isExpandedDataSelectorMinimized && activeInputElement && minimizedIconRef.current) {
      // Destroy previous instance
      if (popperInstanceRef.current) {
        popperInstanceRef.current.destroy();
      }

      // Create new Popper instance with placement: 'left'
      popperInstanceRef.current = createPopper(activeInputElement, minimizedIconRef.current, {
        placement: 'left',
        modifiers: [
          {
            name: 'offset',
            options: {
              offset: [0, 10], // 10px gap from input
            },
          },
          {
            name: 'preventOverflow',
            options: {
              padding: 8,
            },
          },
        ],
      });
    }

    return () => {
      if (popperInstanceRef.current) {
        popperInstanceRef.current.destroy();
        popperInstanceRef.current = null;
      }
    };
  }, [isExpandedDataSelectorMinimized, activeInputElement]);

  // Handle card selection with right sidebar visibility
  const handleCardSelect = (cardId: string | null) => {
    setSelectedCardId(cardId);
  };

  // Handle right sidebar close
  const handleRightSidebarClose = () => {
    setSelectedCardId(null);
    // سكر الأيقونة المصغرة كمان
    setIsExpandedDataSelectorMinimized(false);
    setIsDataSelectorExpanded(false);
  };

  // Handle test complete
  const handleTestComplete = (stepId: string, result: { status: 'idle' | 'testing' | 'success' | 'failed'; output: any; date: string | null }) => {
    setTestResults(prev => ({
      ...prev,
      [stepId]: result
    }));
  };

  // Handle input focus change - لما يتغير الفوكس من حقل لحقل
  const handleInputFocusChange = (element: HTMLElement | null) => {
    // إذا كان element = null (يعني فقد الفوكس)
    if (!element) {
      // سكر لسايدبار الموسع
      setIsDataSelectorExpanded(false);
      // سكر الأيقونة المصغرة
      setIsExpandedDataSelectorMinimized(false);
    }
    
    // إذا كان في تغيير في الحقل النشط (من حقل لحقل آخر)
    if (activeInputElement !== element && element !== null) {
      // سكر السايدبار الموسع
      setIsDataSelectorExpanded(false);
      // سكر الأيقونة المصغرة
      setIsExpandedDataSelectorMinimized(false);
    }
    
    setActiveInputElement(element);
  };

  // Get ALL steps in workflow (including trigger and all action steps)
  const getAllSteps = () => {
    // Always include trigger step
    const allSteps = [
      {
        id: 'trigger',
        appId: 'trigger',
        name: 'Catch Webhook',
        icon: <Wrench size={16} />,
        color: 'bg-gray-500',
        fields: {
          id: '12345',
          name: 'John Doe',
          email: 'john@example.com',
          user: {
            id: 'user-001',
            name: 'John Doe',
            profile: {
              avatar: 'https://example.com/avatar.jpg',
              bio: 'Software Developer'
            }
          },
          metadata: {
            timestamp: '2024-01-05T10:30:00Z',
            source: 'web'
          }
        }
      },
      ...steps.map(step => {
        // Add mock fields based on app type
        let fields = {};
        
        switch (step.appId) {
          case 'gmail':
            fields = {
              to: 'recipient@example.com',
              subject: 'Hello World',
              body: 'Email content here',
              attachments: ['file1.pdf', 'file2.jpg'],
              messageId: 'msg-123456'
            };
            break;
          default:
            fields = {
              id: `${step.appId}-123`,
              status: 'completed',
              data: 'Sample data',
              timestamp: new Date().toISOString()
            };
        }
        
        return {
          ...step,
          fields
        };
      })
    ];

    // Return ALL steps in the workflow
    return allSteps;
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="h-screen w-full flex bg-gray-50 overflow-hidden">
        {/* Left Sidebar with Projects */}
        <LeftSidebar />
        
        {/* Main Area (Header + Content) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <TopHeader canvasPan={canvasPan} isAIFilling={isAIFilling} />
          
          {/* Main Content Area */}
          <div className="flex flex-1 overflow-hidden relative">
            {/* Left Chat Sidebar */}
            <LeftChatSidebar
              fieldsToFill={fieldsToFill}
              onFieldFilled={(fieldName, value) => {
                setFieldValues(prev => ({ ...prev, [fieldName]: value }));
              }}
              onCurrentFieldChange={(fieldName) => {
                setCurrentFillingField(fieldName);
              }}
              onStepClick={(stepId) => setSelectedCardId(stepId)}
              currentStepName={selectedCardId ? steps.find(s => s.id === selectedCardId)?.name || 'Step' : ''}
              currentAppName={selectedCardId ? steps.find(s => s.id === selectedCardId)?.appId || '' : ''}
              currentStepNumber={selectedCardId ? String(steps.findIndex(s => s.id === selectedCardId) + 2) : '1'}
              currentStepId={selectedCardId || ''}
              currentStepIcon={selectedCardId ? String(steps.find(s => s.id === selectedCardId)?.icon) || '' : ''}
              currentStepColor={selectedCardId ? steps.find(s => s.id === selectedCardId)?.color || '' : ''}
              chatMessages={aiChatMessages}
              onChatMessagesChange={setAiChatMessages}
              suggestions={aiSuggestions}
              onSuggestionsChange={setAiSuggestions}
              showSuggestions={aiShowSuggestions}
              onShowSuggestionsChange={setAiShowSuggestions}
              isThinking={aiIsThinking}
              onThinkingChange={setAiIsThinking}
              hasNewMessage={aiHasNewMessage}
              onHasNewMessageChange={setAiHasNewMessage}
              availableSteps={getAllSteps()}
              isMinimized={isAIChatMinimized}
              onMinimizedChange={setIsAIChatMinimized}
            />
            
            {/* Center Canvas */}
            <FlowCanvas 
              selectedCardId={selectedCardId}
              onCardSelect={handleCardSelect}
              steps={steps}
              onStepsChange={setSteps}
              isSidebarOpen={isSidebarOpen}
              onCanvasDimensionsChange={setCanvasDimensions}
              onPanChange={setCanvasPan}
              aiHasNewMessage={aiHasNewMessage && !isSidebarOpen}
              onOpenAIChat={() => {
                // دائماً افتح الشات (أزل التصغير)
                setIsAIChatMinimized(false);
              }}
              isAIChatOpen={isSidebarOpen && !isAIChatMinimized}
            />
            
            {/* AI Chat Minimized Notch - داخل حدود الكانفاس */}
            {isAIChatMinimized && (
              <div 
                className="absolute top-4 left-4 z-40 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-all hover:scale-105 p-[2px] bg-gradient-to-r from-cyan-400 via-purple-500 to-rose-300"
                onClick={() => setIsAIChatMinimized(false)}
              >
                {/* تم حذف محتوى الـ div */}
              </div>
            )}
            
            {/* Expanded Data Selector - Overlay فوق كل شي عدا السايبار الأيمن */}
            {isDataSelectorExpanded && (
              <div className="absolute inset-0 right-80 z-30">
                <ExpandedDataSelector 
                  onClose={() => setIsDataSelectorExpanded(false)}
                  onMinimize={() => {
                    // سكر السايدبار الموسع وافتح السلكتور المصغر
                    setIsDataSelectorExpanded(false);
                    setIsExpandedDataSelectorMinimized(true);
                  }}
                  onShrink={() => {
                    // سكر السايدبار الموسع وارجع للسلكتور العادي
                    setIsDataSelectorExpanded(false);
                  }}
                  availableSteps={getAllSteps()}
                  activeInputElement={activeInputElement}
                  currentFieldName={activeInputElement?.getAttribute('data-field-name') || ''}
                  currentStepName={activeInputElement?.getAttribute('data-step-name') || ''}
                  currentAppName={activeInputElement?.getAttribute('data-app-name') || ''}
                  initialPrompt={initialPrompt}
                  onPromptUsed={() => setInitialPrompt('')}
                />
              </div>
            )}
            
            {/* Minimized Expanded Data Selector Icon - مرتبطة بالحقل النشط */}
            {isExpandedDataSelectorMinimized && activeInputElement && (
              <div 
                ref={minimizedIconRef}
                className="z-[10000] relative group"
                style={{ position: 'fixed' }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <button
                  onClick={() => {
                    setIsExpandedDataSelectorMinimized(false);
                    setIsDataSelectorExpanded(true);
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                  style={{ backgroundColor: 'hsl(257, 74%, 57%)' }}
                >
                  <Database size={16} className="text-white" />
                </button>
                
                {/* Tooltip */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  Data Selector
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            )}
            
            {/* AI Fill Assistant - Overlay فوق كل شي عدا السايبار الأيمن */}
            {showAIFillAssistant && (
              <div className="absolute inset-0 right-80 z-30">
                <AIFillAssistant 
                  onClose={() => setShowAIFillAssistant(false)}
                  availableSteps={getAllSteps()}
                  activeInputElement={activeInputElement}
                  currentFieldName={activeInputElement?.getAttribute('data-field-name') || ''}
                  currentStepName={activeInputElement?.getAttribute('data-step-name') || ''}
                  currentAppName={activeInputElement?.getAttribute('data-app-name') || ''}
                  isAIFilling={isAIFilling}
                  onStartFilling={() => setIsAIFilling(true)}
                  onStopFilling={() => {
                    setIsAIFilling(false);
                    setShowAIFillAssistant(false);
                    setCurrentFillingField(null); // شيل الـ glow effect
                  }}
                  fieldsToFill={fieldsToFill}
                  onFieldFilled={(fieldName, value) => {
                    setFieldValues(prev => ({ ...prev, [fieldName]: value }));
                  }}
                  onCurrentFieldChange={(fieldName) => {
                    setCurrentFillingField(fieldName);
                  }}
                  onRequestTest={() => {
                    console.log('🧪 AI requests test - triggering signal');
                    setTestButtonClicked(true);
                  }}
                  onTriggerTestGlow={() => {
                    console.log('✨ AI triggers glow - triggering signal');
                    setTestButtonGlow(true);
                  }}
                  testResult={selectedCardId ? testResults[selectedCardId] : null}
                  onSelectData={(data) => {
                    // إدراج الـ tag في الحقل النشط
                    if (activeInputElement) {
                      const tagInputInstance = (activeInputElement as any).__tagInputInstance;
                      if (tagInputInstance && tagInputInstance.insertTag) {
                        tagInputInstance.insertTag({
                          stepId: data.stepId,
                          stepName: data.stepName,
                          fieldPath: data.field,
                          value: data.fieldValue
                        });
                      }
                    }
                  }}
                />
              </div>
            )}
            
            {/* Right Sidebar */}
            {selectedCardId && (
              <RightSidebar 
                selectedCardId={selectedCardId} 
                steps={steps}
                onClose={handleRightSidebarClose}
                onStepSelect={(stepId) => setSelectedCardId(stepId)}
                onDataSelectorExpand={(prompt?: string) => {
                  if (prompt) {
                    setInitialPrompt(prompt);
                  }
                  setIsDataSelectorExpanded(true);
                }}
                onAIFillAssistantOpen={() => setShowAIFillAssistant(true)}
                onInputFocusChange={handleInputFocusChange}
                isExpandedDataSelectorOpen={isDataSelectorExpanded}
                isExpandedDataSelectorMinimized={isExpandedDataSelectorMinimized}
                isAIFilling={isAIFilling}
                onStartFilling={() => setIsAIFilling(true)}
                onStopFilling={() => {
                  setIsAIFilling(false);
                  setShowAIFillAssistant(false);
                  setCurrentFillingField(null); // شيل الـ glow effect
                }}
                onFieldsToFillChange={setFieldsToFill}
                fieldValues={fieldValues}
                currentFillingField={currentFillingField}
                onFieldFilled={(fieldName, value, skipFocus) => {
                  setFieldValues(prev => ({ ...prev, [fieldName]: value }));
                  // إذا skipFocus = true، لا تطلب focus
                  if (!skipFocus && onCurrentFieldChange) {
                    setCurrentFillingField(fieldName);
                  }
                }}
                onCurrentFieldChange={(fieldName) => {
                  setCurrentFillingField(fieldName);
                }}
                testButtonClickSignal={testButtonClicked}
                testButtonGlowSignal={testButtonGlow}
                onTestButtonClickHandled={() => setTestButtonClicked(false)}
                onTestButtonGlowHandled={() => setTestButtonGlow(false)}
                testResults={testResults}
                onTestComplete={handleTestComplete}
                onAIHasNewMessage={setAiHasNewMessage}
                aiChatMessages={aiChatMessages}
                onAIChatMessagesChange={setAiChatMessages}
                aiSuggestions={aiSuggestions}
                onAISuggestionsChange={setAiSuggestions}
                aiShowSuggestions={aiShowSuggestions}
                onAIShowSuggestionsChange={setAiShowSuggestions}
                aiIsThinking={aiIsThinking}
                onAIIsThinkingChange={setAiIsThinking}
              />
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
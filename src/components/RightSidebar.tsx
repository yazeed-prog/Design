import { X, Pencil, HelpCircle, Plus, Calendar, Clock, Webhook, Wrench, Database, Sparkles } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { DataTag, DataTagValue } from './DataTag';
import { TagInput, FUNCTION_SEPARATORS } from './TagInput';
import { TestSection, TestSectionHandle } from './TestSection';
import { DataSelector } from './DataSelector';
import { AIFillPopover } from './AIFillPopover';
import { createPopper } from '@popperjs/core';
import { APP_FIELD_DEFINITIONS } from './app-field-definitions';

interface Step {
  id: string;
  appId: string;
  name: string;
  icon: React.ReactNode;
  color: string;
}

interface RightSidebarProps {
  selectedCardId: string | null;
  steps: Array<{ id: string; appId: string; name: string; icon: React.ReactNode; color: string; }>;
  onClose: () => void;
  canvasDimensions?: { width: number; height: number; top: number; left: number; };
  onStepSelect?: (stepId: string) => void;
  onDataSelectorExpand?: (prompt?: string) => void;
  onAIFillAssistantOpen?: () => void;
  onInputFocusChange?: (element: HTMLElement | null) => void;
  isExpandedDataSelectorOpen?: boolean;
  isExpandedDataSelectorMinimized?: boolean;
  isAIFilling?: boolean;
  onStartFilling?: () => void;
  onStopFilling?: () => void;
  onFieldsToFillChange?: (fields: Array<{ name: string; label: string; type: 'text' | 'textarea' | 'select'; placeholder?: string; options?: Array<{ value: string; label: string }> }>) => void;
  fieldValues?: Record<string, string>;
  currentFillingField?: string | null;
  onFieldFilled?: (fieldName: string, value: string, skipFocus?: boolean) => void;
  onCurrentFieldChange?: (fieldName: string) => void;
  testButtonClickSignal?: boolean;
  testButtonGlowSignal?: boolean;
  onTestButtonClickHandled?: () => void;
  onTestButtonGlowHandled?: () => void;
  testResults?: Record<string, { status: 'idle' | 'testing' | 'success' | 'failed'; output: any; date: string | null }>;
  onTestComplete?: (stepId: string, result: { status: 'idle' | 'testing' | 'success' | 'failed'; output: any; date: string | null }) => void;
  onAIHasNewMessage?: (hasNewMessage: boolean) => void;
  aiChatMessages?: Array<{ role: 'user' | 'ai' | 'step-header'; content: string; stepName?: string; stepNumber?: string; stepIcon?: string; stepColor?: string }>;
  onAIChatMessagesChange?: (messages: Array<{ role: 'user' | 'ai' | 'step-header'; content: string; stepName?: string; stepNumber?: string; stepIcon?: string; stepColor?: string }>) => void;
  aiSuggestions?: Array<{ fieldName: string; fieldLabel: string; value: string }>;
  onAISuggestionsChange?: (suggestions: Array<{ fieldName: string; fieldLabel: string; value: string }>) => void;
  aiShowSuggestions?: boolean;
  onAIShowSuggestionsChange?: (show: boolean) => void;
  aiIsThinking?: boolean;
  onAIIsThinkingChange?: (isThinking: boolean) => void;
}

// Shared input/select/textarea classes with gray focus
const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-700 [line-height:20px]";
const textareaClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent resize-none disabled:bg-gray-100 disabled:text-gray-700 [line-height:20px]";

export function RightSidebar({ selectedCardId, steps, onClose, canvasDimensions, onStepSelect, onDataSelectorExpand, onAIFillAssistantOpen, onInputFocusChange, isExpandedDataSelectorOpen, isExpandedDataSelectorMinimized, isAIFilling, onStartFilling, onStopFilling, onFieldsToFillChange, fieldValues = {}, currentFillingField = null, onFieldFilled, onCurrentFieldChange, testButtonClickSignal = false, testButtonGlowSignal = false, onTestButtonClickHandled, onTestButtonGlowHandled, testResults = {}, onTestComplete, onAIHasNewMessage, aiChatMessages = [], onAIChatMessagesChange, aiSuggestions = [], onAISuggestionsChange, aiShowSuggestions = false, onAIShowSuggestionsChange, aiIsThinking = false, onAIIsThinkingChange }: RightSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showDataSelector, setShowDataSelector] = useState(false);
  const [isDataSelectorMinimized, setIsDataSelectorMinimized] = useState(false);
  const [isDataSelectorExpanded, setIsDataSelectorExpanded] = useState(false);
  const [activeInputElement, setActiveInputElement] = useState<HTMLElement | null>(null);
  const dataSelectorRef = useRef<HTMLDivElement>(null);
  const popperInstanceRef = useRef<any>(null);
  
  // 🎯 AI Fill Popover State
  const [showAIFillPopover, setShowAIFillPopover] = useState(false);
  const aiFillPopoverRef = useRef<HTMLDivElement>(null);
  const aiFillButtonRef = useRef<HTMLButtonElement>(null);
  const aiPopperInstanceRef = useRef<any>(null);
  
  // 🚫 Flag to skip Data Selector when filling from code (not user click)
  const skipDataSelectorRef = useRef(false);
  const lastFilledFieldRef = useRef<string | null>(null);
  const skipFocusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastInsertTimestamp = useRef<number>(0); // 🕐 Timestamp of last Insert button click
  
  // 💾 AI Chat State - Now controlled from parent to persist when sidebar closes
  const [aiHasNewMessage, setAiHasNewMessage] = useState(false);
  
  // Refs لحقول Gmail (kept for backward compatibility)
  const gmailToRef = useRef<any>(null);
  const gmailSubjectRef = useRef<any>(null);
  const gmailBodyRef = useRef<any>(null);
  const gmailActionRef = useRef<HTMLSelectElement>(null);
  
  // 🎯 Dynamic refs system for any app
  const dynamicFieldRefs = useRef<Record<string, any>>({});
  
  // Ref for Test button
  const testButtonRef = useRef<HTMLButtonElement>(null);
  
  // Ref for TestSection to trigger test programmatically
  const testSectionRef = useRef<TestSectionHandle>(null);
  
  // State for dropdown values
  const [gmailActionValue, setGmailActionValue] = useState('');
  const [dynamicSelectValues, setDynamicSelectValues] = useState<Record<string, string>>({});
  
  // State for test button glow
  const [isTestButtonGlowing, setIsTestButtonGlowing] = useState(false);
  
  // Refs to track last streamed values and active intervals
  const lastStreamedValues = useRef<Record<string, string>>({});
  const activeIntervals = useRef<Record<string, NodeJS.Timeout>>({});
  
  // 🧹 Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (skipFocusTimeoutRef.current) {
        clearTimeout(skipFocusTimeoutRef.current);
      }
    };
  }, []);
  
  // 🎯 Get fields to fill based on step type - FULLY DYNAMIC (moved before useEffects)
  const getFieldsToFill = useCallback(() => {
    const selectedStep = steps.find(s => s.id === selectedCardId);
    if (!selectedStep) return [];
    
    const isTrigger = selectedCardId === steps[0]?.id;
    if (isTrigger) return [];
    
    const appId = selectedStep.appId;
    
    // Get fields from dynamic definitions
    const fields = APP_FIELD_DEFINITIONS[appId];
    if (!fields) return [];
    
    // Return fields in the correct format for AIFillAssistant
    return fields.map(field => ({
      name: field.name,
      label: field.label,
      type: field.type as 'text' | 'textarea' | 'select',
      placeholder: field.placeholder,
      options: field.options
    }));
  }, [selectedCardId, steps]);
  
  // 🎯 Auto-scroll to the current filling field - NOW FULLY DYNAMIC!
  useEffect(() => {
    if (!currentFillingField) return;
    
    console.log('📍 Auto-scroll - Current field:', currentFillingField);
    console.log('📍 Available dynamic refs:', Object.keys(dynamicFieldRefs.current));
    
    const scrollToElement = (element: any) => {
      if (!element) return;
      
      const actualElement = element.getElement ? element.getElement() : element;
      if (actualElement) {
        // Scroll to element
        if (actualElement.scrollIntoView) {
          console.log('🎯 Scrolling to:', currentFillingField);
          actualElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }
        
        // Focus on element after scroll
        setTimeout(() => {
          // For TagInput, use the focus method from ref
          if (element.focus && typeof element.focus === 'function') {
            console.log('🎯 Focusing on TagInput:', currentFillingField);
            element.focus();
          }
          // For regular inputs, use the DOM focus
          else if (actualElement.focus) {
            console.log('🎯 Focusing on input:', currentFillingField);
            actualElement.focus();
          }
        }, 300);
      }
    };
    
    // 🔥 Try dynamic refs first (for all apps)
    const dynamicRef = dynamicFieldRefs.current[currentFillingField];
    if (dynamicRef) {
      console.log('✅ Found dynamic ref for:', currentFillingField);
      setTimeout(() => scrollToElement(dynamicRef), 200);
      return;
    }
    
    console.log('⚠️ No dynamic ref found, trying Gmail fallback...');
    
    // Fallback to Gmail specific refs (backward compatibility)
    const fieldRefMap: Record<string, any> = {
      'to': gmailToRef,
      'subject': gmailSubjectRef,
      'body': gmailBodyRef,
      'action': gmailActionRef,
    };
    
    const fieldRef = fieldRefMap[currentFillingField];
    if (fieldRef?.current) {
      // Small delay to ensure the element is ready and glow animation started
      setTimeout(() => {
        const element = fieldRef.current.getElement ? fieldRef.current.getElement() : fieldRef.current;
        if (element && element.scrollIntoView) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 200);
    }
  }, [currentFillingField]);
  
  // Function to stream text character by character
  const streamText = (text: string, ref: React.RefObject<any>, fieldName: string) => {
    if (!ref.current?.insertText) return;
    
    // Clear any existing interval for this field
    if (activeIntervals.current[fieldName]) {
      clearInterval(activeIntervals.current[fieldName]);
      delete activeIntervals.current[fieldName];
    }
    
    // 🎯 Check skipDataSelectorRef directly (not as parameter) to avoid race conditions
    const shouldSkipFocus = skipDataSelectorRef.current === true && lastFilledFieldRef.current === fieldName;
    
    // If skipFocus is true (from Insert button), insert instantly without streaming
    if (shouldSkipFocus) {
      console.log('⚡ Instant insert (no streaming, no focus):', fieldName, 'skipDataSelectorRef:', skipDataSelectorRef.current);
      ref.current?.insertText(text, true); // skipFocus = true
      return;
    }
    
    console.log('🌊 Streaming with animation:', fieldName);
    // Otherwise, stream with animation
    let currentIndex = 0;
    const intervalTime = 8; // milliseconds per character
    
    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        currentIndex++;
        // Build the text progressively - insert substring from start to current position
        ref.current?.insertText(text.substring(0, currentIndex), false);
      } else {
        clearInterval(interval);
        delete activeIntervals.current[fieldName];
      }
    }, intervalTime);
    
    activeIntervals.current[fieldName] = interval;
  };

  // Watch field values changes and fill fields automatically with streaming effect
  useEffect(() => {
    if (!fieldValues || Object.keys(fieldValues).length === 0) return;
    
    // Fill text/textarea fields with streaming effect
    Object.entries(fieldValues).forEach(([fieldName, value]) => {
      // Skip if this value was already streamed
      if (lastStreamedValues.current[fieldName] === value) return;
      
      // 🔥 Try dynamic refs first (for all apps)
      const dynamicRef = dynamicFieldRefs.current[fieldName];
      
      if (dynamicRef) {
        // Check if it's a TagInput (has insertText method)
        if (dynamicRef.insertText && typeof dynamicRef.insertText === 'function') {
          console.log('✅ Streaming to TagInput:', fieldName, 'Value:', value);
          
          // 🎯 If skipDataSelectorRef is set for this field, insert instantly without streaming or focus
          if (skipDataSelectorRef.current && lastFilledFieldRef.current === fieldName) {
            console.log('⚡ INSTANT INSERT (bypassing streamText):', fieldName);
            dynamicRef.insertText(value, true); // skipFocus = true
            lastStreamedValues.current[fieldName] = value;
            
            // ✅ Reset flags immediately after insert
            skipDataSelectorRef.current = false;
            lastFilledFieldRef.current = null;
            console.log('🟢 skipDataSelectorRef reset immediately after insert');
            return;
          }
          
          streamText(value, { current: dynamicRef }, fieldName);
          lastStreamedValues.current[fieldName] = value;
          return;
        }
        // Check if it's a select element
        else if (dynamicRef.tagName === 'SELECT') {
          console.log('🔵 Setting select value:', fieldName, 'Value:', value);
          const cleanValue = String(value).replace(/['\"]/g, '').trim();
          setTimeout(() => {
            setDynamicSelectValues(prev => ({ ...prev, [fieldName]: cleanValue }));
            console.log('✅ Select value set to:', cleanValue);
          }, 100);
          lastStreamedValues.current[fieldName] = value;
          return;
        }
      }
      
      // Fallback to Gmail refs (backward compatibility)
      if (fieldName === 'to' && gmailToRef.current?.insertText) {
        // 🎯 If skipDataSelectorRef is set, insert instantly
        if (skipDataSelectorRef.current && lastFilledFieldRef.current === fieldName) {
          console.log('⚡ INSTANT INSERT to Gmail To:', fieldName);
          gmailToRef.current.insertText(value, true);
          lastStreamedValues.current[fieldName] = value;
          
          // ✅ Reset flags immediately
          skipDataSelectorRef.current = false;
          lastFilledFieldRef.current = null;
        } else {
          streamText(value, gmailToRef, fieldName);
          lastStreamedValues.current[fieldName] = value;
        }
      } else if (fieldName === 'subject' && gmailSubjectRef.current?.insertText) {
        // 🎯 If skipDataSelectorRef is set, insert instantly
        if (skipDataSelectorRef.current && lastFilledFieldRef.current === fieldName) {
          console.log('⚡ INSTANT INSERT to Gmail Subject:', fieldName);
          gmailSubjectRef.current.insertText(value, true);
          lastStreamedValues.current[fieldName] = value;
          
          // ✅ Reset flags immediately
          skipDataSelectorRef.current = false;
          lastFilledFieldRef.current = null;
        } else {
          streamText(value, gmailSubjectRef, fieldName);
          lastStreamedValues.current[fieldName] = value;
        }
      } else if (fieldName === 'body' && gmailBodyRef.current?.insertText) {
        // 🎯 If skipDataSelectorRef is set, insert instantly
        if (skipDataSelectorRef.current && lastFilledFieldRef.current === fieldName) {
          console.log('⚡ INSTANT INSERT to Gmail Body:', fieldName);
          gmailBodyRef.current.insertText(value, true);
          lastStreamedValues.current[fieldName] = value;
          
          // ✅ Reset flags immediately
          skipDataSelectorRef.current = false;
          lastFilledFieldRef.current = null;
        } else {
          streamText(value, gmailBodyRef, fieldName);
          lastStreamedValues.current[fieldName] = value;
        }
      } else if (fieldName === 'action' && value) {
        // For dropdown, set the value with a slight delay for smooth transition
        console.log('🔵 Dropdown - Field:', fieldName, 'Value received:', JSON.stringify(value));
        console.log('🔵 Valid options: send, read, draft');
        
        // Clean the value (remove quotes, trim spaces)
        const cleanValue = String(value).replace(/['"]/g, '').trim();
        console.log('🔵 Clean value:', JSON.stringify(cleanValue));
        
        setTimeout(() => {
          setGmailActionValue(cleanValue);
          console.log('✅ Dropdown value set to:', JSON.stringify(cleanValue));
        }, 100);
        lastStreamedValues.current[fieldName] = value;
      }
    });
    
    // Cleanup on unmount
    return () => {
      Object.values(activeIntervals.current).forEach(interval => {
        clearInterval(interval);
      });
      activeIntervals.current = {};
    };
  }, [fieldValues]);
  
  // State للتحكم في ارتفاع الـ panels
  const [topPanelHeight, setTopPanelHeight] = useState(60); // نسبة مئوية من الارتفاع الكلي
  const [isResizing, setIsResizing] = useState(false);
  const resizerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Reset isOpen when sidebar should reopen
  useEffect(() => {
    if (selectedCardId && !isOpen) {
      setIsOpen(true);
    }
  }, [selectedCardId, isOpen]);

  // Setup Popper instance
  useEffect(() => {
    if (showDataSelector && activeInputElement && dataSelectorRef.current) {
      // Cleanup previous instance
      if (popperInstanceRef.current) {
        popperInstanceRef.current.destroy();
      }

      // Create new Popper instance with different placement based on minimized state
      popperInstanceRef.current = createPopper(activeInputElement, dataSelectorRef.current, {
        placement: isDataSelectorMinimized ? 'left' : 'left-start',
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
  }, [showDataSelector, activeInputElement, isDataSelectorMinimized]);

  // 🎯 Setup Popper for AI Fill Popover
  useEffect(() => {
    if (showAIFillPopover && aiFillButtonRef.current && aiFillPopoverRef.current) {
      // Cleanup previous instance
      if (aiPopperInstanceRef.current) {
        aiPopperInstanceRef.current.destroy();
      }

      // Create new Popper instance - positioned to the LEFT of the button
      aiPopperInstanceRef.current = createPopper(aiFillButtonRef.current, aiFillPopoverRef.current, {
        placement: 'left-start',
        modifiers: [
          {
            name: 'offset',
            options: {
              offset: [0, 10], // 10px gap from button
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

      // Update position on ANY scroll - يتحرك مع أي سكرول
      const handleScroll = () => {
        if (aiPopperInstanceRef.current) {
          aiPopperInstanceRef.current.update();
        }
      };

      // Add scroll listeners to all scrollable elements
      const scrollableElements = document.querySelectorAll('.overflow-y-auto, .overflow-auto, .overflow-scroll');
      scrollableElements.forEach(el => {
        el.addEventListener('scroll', handleScroll, { passive: true });
      });

      // Also add to window
      window.addEventListener('scroll', handleScroll, { passive: true });

      return () => {
        scrollableElements.forEach(el => {
          el.removeEventListener('scroll', handleScroll);
        });
        window.removeEventListener('scroll', handleScroll);
        if (aiPopperInstanceRef.current) {
          aiPopperInstanceRef.current.destroy();
          aiPopperInstanceRef.current = null;
        }
      };
    }

    return () => {
      if (aiPopperInstanceRef.current) {
        aiPopperInstanceRef.current.destroy();
        aiPopperInstanceRef.current = null;
      }
    };
  }, [showAIFillPopover]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Don't close if clicking inside the popover or minimized icon
      if (dataSelectorRef.current?.contains(target)) {
        // If clicking on an input/textarea inside the popover (e.g. search bar), let it focus naturally
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }
        // Allow native drag initiation on draggable elements
        if (target.closest('[draggable="true"]')) {
          return;
        }
        // Keep focus on the input when clicking inside popover (non-input elements)
        if (activeInputElement) {
          e.preventDefault();
          setTimeout(() => {
            activeInputElement.focus();
          }, 0);
        }
        return;
      }
      
      // Don't close if clicking on the active input/textarea
      if (activeInputElement && (target === activeInputElement || activeInputElement.contains(target))) {
        return;
      }
      
      // Close if clicking anywhere else
      setShowDataSelector(false);
      setIsDataSelectorMinimized(false);
      if (activeInputElement) {
        activeInputElement.blur();
      }
      setActiveInputElement(null);
      
      // أخبر الـ parent أن الفوكس راح
      if (onInputFocusChange) {
        onInputFocusChange(null);
      }
    };

    if (showDataSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDataSelector, activeInputElement, onInputFocusChange]);

  // 🎯 Close AI Fill Popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Don't close if clicking inside the popover or on the button
      if (aiFillPopoverRef.current?.contains(target) || aiFillButtonRef.current?.contains(target)) {
        return;
      }
      
      // Close if clicking anywhere else
      setShowAIFillPopover(false);
    };

    if (showAIFillPopover) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAIFillPopover]);

  // 🎹 Keyboard shortcut to toggle AI chat panel (Cmd/Ctrl + L now, or handled by Command Palette)
  /* 
  // Moved to global Command Palette
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault(); // Prevent default browser behavior
        
        // Toggle AI chat panel
        setShowAIFillPopover(prev => {
          const newState = !prev;
          if (newState) {
            // Opening the chat - clear new message indicator
            setAiHasNewMessage(false);
            onAIHasNewMessage?.(false);
          }
          return newState;
        });
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onAIHasNewMessage]);
  */

  // Add glow effect to active input when ExpandedDataSelector is open
  useEffect(() => {
    if (activeInputElement && isExpandedDataSelectorOpen) {
      // أضف glow effect
      activeInputElement.style.boxShadow = '0 0 0 3px hsla(257, 74%, 57%, 0.3), 0 0 20px hsla(257, 74%, 57%, 0.2)';
      activeInputElement.style.borderColor = 'hsl(257, 74%, 57%)';
      activeInputElement.style.borderRadius = '0.5rem';
      activeInputElement.style.transition = 'all 0.2s ease';
    } else if (activeInputElement) {
      // أزل الـ glow effect
      activeInputElement.style.boxShadow = '';
      activeInputElement.style.borderColor = '';
      activeInputElement.style.borderRadius = '';
    }
    
    // Cleanup عند تغيير الحقل
    return () => {
      if (activeInputElement) {
        activeInputElement.style.boxShadow = '';
        activeInputElement.style.borderColor = '';
        activeInputElement.style.borderRadius = '';
      }
    };
  }, [activeInputElement, isExpandedDataSelectorOpen]);

  // Handler لطلب اختبار من AI
  const handleRequestTest = () => {
    console.log('🧪 AI requested test - clicking test button');
    if (testButtonRef.current) {
      testButtonRef.current.click();
    }
  };

  // Handler لتفعيل الـ glow على زر Test
  const handleTriggerTestGlow = () => {
    console.log('✨ Triggering test button glow');
    setIsTestButtonGlowing(true);
    
    // إزالة الـ glow بعد 3 ثواني
    setTimeout(() => {
      setIsTestButtonGlowing(false);
    }, 3000);
  };

  // Watch for test button click signal from AIFillAssistant
  useEffect(() => {
    if (testButtonClickSignal && testSectionRef.current) {
      console.log('🔔 Test button click signal received - triggering test programmatically');
      testSectionRef.current.triggerTest();
      if (onTestButtonClickHandled) {
        onTestButtonClickHandled(); // Reset signal
      }
    }
  }, [testButtonClickSignal, onTestButtonClickHandled]);

  // Watch for test button glow signal from AIFillAssistant
  useEffect(() => {
    if (testButtonGlowSignal) {
      console.log('🔔 Test button glow signal received - activating glow');
      handleTriggerTestGlow();
      if (onTestButtonGlowHandled) {
        onTestButtonGlowHandled(); // Reset signal
      }
    }
  }, [testButtonGlowSignal, onTestButtonGlowHandled]);

  // Handler للـ resizing
  useEffect(() => {
    if (!isResizing) return;

    // منع التحديد على كل الصفحة أثناء الـ resize
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';

    const handleMouseMove = (e: MouseEvent) => {
      if (!sidebarRef.current) return;
      
      const sidebarRect = sidebarRef.current.getBoundingClientRect();
      const relativeY = e.clientY - sidebarRect.top;
      const percentage = (relativeY / sidebarRect.height) * 100;
      
      // تحديد الحد الأدنى والأقصى للنسبة
      const minHeight = 30; // 30% minimum
      const maxHeight = 80; // 80% maximum
      const clampedPercentage = Math.max(minHeight, Math.min(maxHeight, percentage));
      
      setTopPanelHeight(clampedPercentage);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // إرجاع الـ style للوضع الطبي��ي
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // إرجاع الـ style للوضع الطبيعي في حالة unmount
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  // Find the selected step (before hooks that use it)
  const selectedStep = selectedCardId ? steps.find(s => s.id === selectedCardId) : null;
  const isTrigger = selectedCardId === 'trigger';

  // Fill fields when AI provides values
  useEffect(() => {
    if (!selectedStep || isTrigger) return;
    
    const appId = selectedStep.appId;
    const fields = APP_FIELD_DEFINITIONS[appId];
    if (!fields) return;
    
    // Apply field values dynamically for all apps
    fields.forEach(field => {
      const fieldValue = fieldValues[field.name];
      if (!fieldValue) return;
      
      const fieldRef = dynamicFieldRefs.current[field.name];
      if (!fieldRef) return;
      
      if (field.type === 'select') {
        // For select fields, directly set the value
        if (fieldRef instanceof HTMLSelectElement) {
          fieldRef.value = fieldValue;
          // Trigger change event
          const event = new Event('change', { bubbles: true });
          fieldRef.dispatchEvent(event);
        }
      } else {
        // For text/textarea fields with TagInput, use insertText
        if (fieldRef.insertText) {
          fieldRef.insertText(fieldValue);
        }
      }
    });
  }, [fieldValues, selectedStep, isTrigger]);

  // 🔄 Update fieldsToFill whenever selectedCardId changes
  useEffect(() => {
    const fields = getFieldsToFill();
    console.log('🔄 RightSidebar: selectedCardId changed to', selectedCardId, 'Fields:', fields);
    onFieldsToFillChange?.(fields);
  }, [selectedCardId, steps]); // Removed getFieldsToFill and onFieldsToFillChange to avoid infinite loops

  // Early return after all hooks
  if (!isOpen || !selectedCardId) return null;

  // Handle AI Fill button click - Toggle popover
  const handleAIFillClick = () => {
    if (showAIFillPopover) {
      // Close popover
      setShowAIFillPopover(false);
    } else {
      // Open popover
      setShowAIFillPopover(true);
      setAiHasNewMessage(false); // Clear new message indicator when opening chat
      onAIHasNewMessage?.(false); // Notify parent
    }
  };

  // Handle focus for input fields
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (e.target.tagName === 'SELECT') return;
    
    setActiveInputElement(e.currentTarget);
    
    // دائماً أخبر الـ parent بتغيير الحقل النشط
    if (onInputFocusChange) {
      onInputFocusChange(e.currentTarget);
    }
    
    // إذا كان السايدبار الموسع مفتوح، لا تفتح اللكتور الصغير
    if (isExpandedDataSelectorOpen) {
      return;
    }
    
    // 🚫 إذا كان الـ focus جاي من Insert button (خلال 800ms)، لا تفتح Data Selector
    const timeSinceLastInsert = Date.now() - lastInsertTimestamp.current;
    if (timeSinceLastInsert < 800) {
      console.log('🚫 Blocked Data Selector - Recent Insert detected (', timeSinceLastInsert, 'ms ago)');
      return;
    }
    
    // Legacy check (backup)
    if (skipDataSelectorRef.current) {
      console.log('🚫 Blocked Data Selector - skipDataSelectorRef is true');
      return;
    }
    
    setShowDataSelector(true);
  };

  // Special handler for TagInput (wraps the container div)
  const handleTagInputFocus = (e: React.FocusEvent) => {
    const target = e.currentTarget as HTMLElement;
    setActiveInputElement(target);
    
    // دائماً أخبر الـ parent بتغيير الحقل النشط
    if (onInputFocusChange) {
      onInputFocusChange(target);
    }
    
    // إذا كان السايدبار الموسع مفتوح، لا تفتح السلكتور الصغير
    if (isExpandedDataSelectorOpen) {
      return;
    }
    
    // 🚫 إذا كان الـ focus جاي من Insert button (خلال 800ms)، لا تفتح Data Selector
    const timeSinceLastInsert = Date.now() - lastInsertTimestamp.current;
    if (timeSinceLastInsert < 800) {
      console.log('🚫 Blocked Data Selector in TagInput - Recent Insert (', timeSinceLastInsert, 'ms ago)');
      return;
    }
    
    // Legacy check (backup)
    if (skipDataSelectorRef.current) {
      console.log('🚫 Blocked Data Selector in TagInput - skipDataSelectorRef is true');
      return;
    }
    
    setShowDataSelector(true);
  };

  // Handler for TagInput blur
  const handleTagInputBlur = (e: React.FocusEvent) => {
    const target = e.currentTarget as HTMLElement;
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    
    // Don't clear state if focus is moving to an element inside the data selector popover (e.g. search bar)
    if (relatedTarget && dataSelectorRef.current?.contains(relatedTarget)) {
      return;
    }
    
    if (target === activeInputElement) {
      setActiveInputElement(null);
      
      // Close data selector popover when the input loses focus
      setShowDataSelector(false);
      setIsDataSelectorMinimized(false);
      
      // أخبر الـ parent أن الفوكس راح
      if (onInputFocusChange) {
        onInputFocusChange(null);
      }
    }
  };

  // Get previous steps (all steps before the current one)
  const getPreviousSteps = () => {
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
          case 'slack':
            fields = {
              channel: '#general',
              message: 'Hello team!',
              timestamp: '2024-01-05T10:30:00Z',
              userId: 'U123456',
              teamId: 'T123456'
            };
            break;
          case 'gcal':
            fields = {
              eventId: 'evt-123456',
              title: 'Team Meeting',
              startDate: '2024-01-05',
              startTime: '10:00',
              duration: 60,
              attendees: ['john@example.com', 'jane@example.com']
            };
            break;
          case 'notion':
            fields = {
              pageId: 'page-123456',
              title: 'Project Documentation',
              content: 'Page content here...',
              database: 'Main Database',
              createdAt: '2024-01-05T10:30:00Z'
            };
            break;
          case 'stripe':
            fields = {
              paymentId: 'pi_123456',
              amount: 100.00,
              currency: 'usd',
              customerEmail: 'customer@example.com',
              status: 'succeeded'
            };
            break;
          case 'github':
            fields = {
              issueId: 'issue-123',
              repository: 'owner/repo',
              title: 'Bug: Something is broken',
              description: 'Issue description...',
              labels: ['bug', 'critical']
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

    // Find index of current step
    const currentIndex = allSteps.findIndex(s => s.id === selectedCardId);
    
    // Return all steps before current one
    return currentIndex > 0 ? allSteps.slice(0, currentIndex) : [];
  };

  // Get previous steps data for DataSelector
  const getPreviousStepsData = () => {
    const previousSteps = getPreviousSteps();
    return previousSteps.map(step => ({
      id: step.id,
      appId: step.appId,
      name: step.name,
      icon: step.icon,
      color: step.color,
      fields: step.fields
    }));
  };

  // 🎯 Get ALL steps data for AI (not just previous ones)
  const getAllStepsData = () => {
    // Build complete list with trigger + all steps
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
          case 'slack':
            fields = {
              channel: '#general',
              message: 'Hello team!',
              timestamp: '2024-01-05T10:30:00Z',
              userId: 'U123456',
              teamId: 'T123456'
            };
            break;
          case 'gcal':
            fields = {
              eventId: 'evt-123456',
              title: 'Team Meeting',
              startDate: '2024-01-05',
              startTime: '10:00',
              duration: 60,
              attendees: ['john@example.com', 'jane@example.com']
            };
            break;
          case 'notion':
            fields = {
              pageId: 'page-123456',
              title: 'Project Documentation',
              content: 'Page content here...',
              database: 'Main Database',
              createdAt: '2024-01-05T10:30:00Z'
            };
            break;
          case 'stripe':
            fields = {
              paymentId: 'pi_123456',
              amount: 100.00,
              currency: 'usd',
              customerEmail: 'customer@example.com',
              status: 'succeeded'
            };
            break;
          case 'github':
            fields = {
              issueId: 'issue-123',
              repository: 'owner/repo',
              title: 'Bug: Something is broken',
              description: 'Issue description...',
              labels: ['bug', 'critical']
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

    const result = allSteps.map(step => ({
      id: step.id,
      appId: step.appId,
      name: step.name,
      icon: step.icon,
      color: step.color,
      fields: step.fields
    }));

    console.log('📊 RightSidebar.getAllStepsData() - Returning all steps for AI:', result.length, 'steps');
    console.log('📊 Steps:', result.map((s, i) => `${i + 1}. ${s.name} (${s.id})`));

    return result;
  };

  // Render Trigger Configuration
  const renderTriggerConfig = () => (
    <>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base">Trigger Configuration</h2>
          <button
            onClick={() => {
              setIsOpen(false);
              onClose();
            }}
            className="p-1 rounded transition-colors text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* App Info */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-2xl">🔧</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">Trigger</p>
            <p className="text-xs text-gray-500">Choose how to start your automation</p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Trigger Type Field */}
        <div>
          <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
            Trigger Type
            <span className="text-red-500">*</span>
            <button className="text-gray-400 hover:text-gray-600">
              <HelpCircle size={14} />
            </button>
          </label>
          <select className={inputClasses}
            onFocus={handleInputFocus}
          >
            <option value="">Select trigger type</option>
            <option value="webhook">Webhook</option>
            <option value="schedule">Schedule</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        {/* Trigger Options */}
        <div className="space-y-3 mt-6">
          <p className="text-sm font-medium text-gray-900">Trigger Configuration</p>
          
          {/* Webhook URL Field - مع دعم Tags */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Webhook URL
              <span className="text-red-500">*</span>
              <button className="text-gray-400 hover:text-gray-600">
                <HelpCircle size={14} />
              </button>
            </label>
            <TagInput
              placeholder="https://example.com/webhook"
              className={inputClasses}
              onFocus={(e) => handleTagInputFocus(e)}
              onBlur={handleTagInputBlur}
              type="text"
              availableSteps={getPreviousStepsData()}
            />
          </div>

          {/* Method Field */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Method
              <span className="text-red-500">*</span>
            </label>
            <select className={inputClasses}
              onFocus={handleInputFocus}
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          {/* Headers Field - مع دعم Tags */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Headers
            </label>
            <TagInput
              placeholder="Content-Type: application/json&#10;Authorization: Bearer token"
              className={textareaClasses}
              onFocus={(e) => handleTagInputFocus(e)}
              onBlur={handleTagInputBlur}
              multiline
              rows={3}
              availableSteps={getPreviousStepsData()}
            />
          </div>

          {/* Response Path Field - مع دعم Tags */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Response Path
            </label>
            <TagInput
              placeholder="data.result"
              className={inputClasses}
              onFocus={(e) => handleTagInputFocus(e)}
              onBlur={handleTagInputBlur}
              type="text"
              availableSteps={getPreviousStepsData()}
            />
          </div>

          {/* Description Field - مع دعم Tags */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Description
            </label>
            <TagInput
              placeholder="Describe this trigger..."
              className={textareaClasses}
              onFocus={(e) => handleTagInputFocus(e)}
              onBlur={handleTagInputBlur}
              multiline
              rows={2}
              availableSteps={getPreviousStepsData()}
            />
          </div>
        </div>
      </div>
    </>
  );

  // Render Gmail Configuration
  const renderGmailConfig = () => (
    <>
      <div className="flex-1 overflow-y-auto scrollbar-visible p-4 space-y-4">
        {/* App Info */}
        <div className="flex items-center gap-3 rounded-lg mb-4">
          <div className={`w-10 h-10 ${selectedStep?.color || 'bg-blue-500'} rounded-lg flex items-center justify-center shrink-0 text-white`}>
            {selectedStep?.icon || '🌐'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">{selectedStep?.name}</p>
            <p className="text-xs text-gray-500">Configure this step</p>
          </div>
          <span className="text-xs text-gray-400">v1.0.0</span>
        </div>

        {/* Fill by AI Banner */}
        <button 
          ref={aiFillButtonRef}
          onClick={handleAIFillClick}
          className={`w-full flex items-center gap-2 p-3 bg-[hsl(257,74%,97%)] border border-[hsl(257,74%,87%)] rounded-lg hover:bg-[hsl(257,74%,95%)] transition-colors relative overflow-hidden group ${
            isAIFilling ? 'sticky top-0 z-50 shadow-md' : ''
          }`}
        >
          {!isAIFilling && (
            <div className="absolute inset-0 w-24 h-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[ai-shine_2.5s_ease-in-out_infinite]"></div>
          )}
          
          {/* Icon - Changes based on state */}
          {isAIFilling ? (
            <div className="animate-spin relative z-10" style={{ color: 'hsl(257, 74%, 57%)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
          ) : (
            <Sparkles size={16} className="text-[hsl(257,74%,57%)] relative z-10 group-hover:animate-[ai-glow_1.5s_ease-in-out_infinite]" />
          )}
          
          <span className="flex-1 text-left text-sm text-[hsl(257,74%,47%)] relative z-10 group-hover:animate-[ai-glow_1.5s_ease-in-out_infinite]">
            {isAIFilling ? 'AI is filling...' : 'Fill by AI'}
          </span>
          
          {/* Stop Button - Shows only when AI is filling */}
          {isAIFilling && (
            <span className="px-3 py-1 text-xs rounded transition-colors relative z-10" style={{ 
              backgroundColor: 'hsl(257, 74%, 57%)',
              color: 'white'
            }}>
              Stop
            </span>
          )}
        </button>

        {/* Fields Container */}
        <div className="space-y-4">
          {/* To Field - مع دعم Tags */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              To
              <span className="text-red-500">*</span>
            </label>
            <TagInput
              ref={gmailToRef}
              placeholder="recipient@example.com"
              className={inputClasses}
              onFocus={(e) => handleTagInputFocus(e)}
              onBlur={handleTagInputBlur}
              type="email"
              availableSteps={getPreviousStepsData()}
            />
          </div>

          {/* Subject Field - مع دعم Tags */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Subject
              <span className="text-red-500">*</span>
            </label>
            <TagInput
              ref={gmailSubjectRef}
              placeholder="Email subject"
              className={inputClasses}
              onFocus={(e) => {
                const element = e.currentTarget;
                element.setAttribute('data-field-name', 'Subject');
                element.setAttribute('data-step-name', selectedStep?.name || '');
                element.setAttribute('data-app-name', 'Gmail');
                handleTagInputFocus(e);
              }}
              onBlur={handleTagInputBlur}
              type="text"
              availableSteps={getPreviousStepsData()}
            />
          </div>

          {/* Message Body Field - مع دعم Tags */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Message Body
              <span className="text-red-500">*</span>
            </label>
            <TagInput
              ref={gmailBodyRef}
              placeholder="Email content..."
              className={textareaClasses}
              onFocus={(e) => handleTagInputFocus(e)}
              onBlur={handleTagInputBlur}
              multiline
              rows={6}
              availableSteps={getPreviousStepsData()}
            />
          </div>

          {/* Action Field */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Action
              <span className="text-red-500">*</span>
            </label>
            <select 
              ref={gmailActionRef}
              value={gmailActionValue}
              onChange={(e) => setGmailActionValue(e.target.value)}
              className={inputClasses}
              onFocus={handleInputFocus}
            >
              <option value="">Select an action</option>
              <option value="send">Send Email</option>
              <option value="read">Read Email</option>
              <option value="draft">Create Draft</option>
            </select>
          </div>
        </div>
      </div>
    </>
  );

  // Render Slack Configuration
  const renderSlackConfig = () => (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* App Info */}
        <div className="flex items-center gap-3 rounded-lg mb-4">
          <div className={`w-10 h-10 ${selectedStep?.color || 'bg-blue-500'} rounded-lg flex items-center justify-center shrink-0 text-white`}>
            {selectedStep?.icon || '🌐'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">{selectedStep?.name}</p>
            <p className="text-xs text-gray-500">Configure this step</p>
          </div>
          <span className="text-xs text-gray-400">v1.0.0</span>
        </div>

        {/* Fill by AI Banner */}
        <button 
          onClick={() => {
            if (isAIFilling && onStopFilling) {
              onStopFilling();
            } else if (onAIFillAssistantOpen && onStartFilling) {
              onStartFilling();
              onAIFillAssistantOpen();
            }
          }}
          className={`w-full flex items-center gap-2 p-3 bg-[hsl(257,74%,97%)] border border-[hsl(257,74%,87%)] rounded-lg hover:bg-[hsl(257,74%,95%)] transition-colors relative overflow-hidden group ${
            isAIFilling ? 'sticky top-0 z-50 shadow-md' : ''
          }`}
        >
          {!isAIFilling && (
            <div className="absolute inset-0 w-24 h-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[ai-shine_2.5s_ease-in-out_infinite]"></div>
          )}
          
          {/* Icon - Changes based on state */}
          {isAIFilling ? (
            <div className="animate-spin relative z-10" style={{ color: 'hsl(257, 74%, 57%)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
          ) : (
            <Sparkles size={16} className="text-[hsl(257,74%,57%)] relative z-10 group-hover:animate-[ai-glow_1.5s_ease-in-out_infinite]" />
          )}
          
          <span className="flex-1 text-left text-sm text-[hsl(257,74%,47%)] relative z-10 group-hover:animate-[ai-glow_1.5s_ease-in-out_infinite]">
            {isAIFilling ? 'AI is filling...' : 'Fill by AI'}
          </span>
          
          {/* Stop Button - Shows only when AI is filling */}
          {isAIFilling && (
            <span className="px-3 py-1 text-xs rounded transition-colors relative z-10" style={{ 
              backgroundColor: 'hsl(257, 74%, 57%)',
              color: 'white'
            }}>
              Stop
            </span>
          )}
        </button>

        {/* Fields Container */}
        <div className="space-y-4">
          {/* Message Field - مع دعم Tags */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Message
              <span className="text-red-500">*</span>
            </label>
            <TagInput
              placeholder="Type your message..."
              className={textareaClasses}
              onFocus={(e) => handleTagInputFocus(e)}
              onBlur={handleTagInputBlur}
              multiline
              rows={5}
              availableSteps={getPreviousStepsData()}
            />
          </div>

          {/* Action Field */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Action
              <span className="text-red-500">*</span>
            </label>
            <select className={inputClasses}
              onFocus={handleInputFocus}
            >
              <option value="">Select an action</option>
              <option value="send-message">Send Message</option>
              <option value="create-channel">Create Channel</option>
              <option value="invite-user">Invite User</option>
            </select>
          </div>

          {/* Channel Field */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Channel
              <span className="text-red-500">*</span>
            </label>
            <select className={inputClasses}
              onFocus={handleInputFocus}
            >
              <option value="">Select a channel</option>
              <option value="general">general</option>
              <option value="random">random</option>
              <option value="announcements">announcements</option>
            </select>
          </div>

          {/* Attachments Field */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Attachments
            </label>
            <div className="border border-gray-300 rounded-lg p-3">
              <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                <Plus size={16} />
                Add attachment
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // Render Google Calendar Configuration
  const renderGoogleCalendarConfig = () => (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* App Info */}
        <div className="flex items-center gap-3 rounded-lg mb-4">
          <div className={`w-10 h-10 ${selectedStep?.color || 'bg-blue-500'} rounded-lg flex items-center justify-center shrink-0 text-white`}>
            {selectedStep?.icon || '🌐'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">{selectedStep?.name}</p>
            <p className="text-xs text-gray-500">Configure this step</p>
          </div>
          <span className="text-xs text-gray-400">v1.0.0</span>
        </div>

        {/* Fill by AI Banner */}
        <button 
          onClick={() => {
            if (isAIFilling && onStopFilling) {
              onStopFilling();
            } else if (onAIFillAssistantOpen && onStartFilling) {
              onStartFilling();
              onAIFillAssistantOpen();
            }
          }}
          className={`w-full flex items-center gap-2 p-3 bg-[hsl(257,74%,97%)] border border-[hsl(257,74%,87%)] rounded-lg hover:bg-[hsl(257,74%,95%)] transition-colors relative overflow-hidden group ${
            isAIFilling ? 'sticky top-0 z-50 shadow-md' : ''
          }`}
        >
          {!isAIFilling && (
            <div className="absolute inset-0 w-24 h-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[ai-shine_2.5s_ease-in-out_infinite]"></div>
          )}
          
          {/* Icon - Changes based on state */}
          {isAIFilling ? (
            <div className="animate-spin relative z-10" style={{ color: 'hsl(257, 74%, 57%)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
          ) : (
            <Sparkles size={16} className="text-[hsl(257,74%,57%)] relative z-10 group-hover:animate-[ai-glow_1.5s_ease-in-out_infinite]" />
          )}
          
          <span className="flex-1 text-left text-sm text-[hsl(257,74%,47%)] relative z-10 group-hover:animate-[ai-glow_1.5s_ease-in-out_infinite]">
            {isAIFilling ? 'AI is filling...' : 'Fill by AI'}
          </span>
          
          {/* Stop Button - Shows only when AI is filling */}
          {isAIFilling && (
            <span className="px-3 py-1 text-xs rounded transition-colors relative z-10" style={{ 
              backgroundColor: 'hsl(257, 74%, 57%)',
              color: 'white'
            }}>
              Stop
            </span>
          )}
        </button>

        {/* Fields Container */}
        <div className="space-y-4">
          {/* Action Field */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Action
              <span className="text-red-500">*</span>
            </label>
            <select className={inputClasses}
              onFocus={handleInputFocus}
            >
              <option value="">Select an action</option>
              <option value="create">Create Event</option>
              <option value="update">Update Event</option>
              <option value="delete">Delete Event</option>
            </select>
          </div>

          {/* Event Title Field - مع دعم Tags */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Event Title
              <span className="text-red-500">*</span>
            </label>
            <TagInput
              placeholder="Meeting with team"
              className={inputClasses}
              onFocus={(e) => handleTagInputFocus(e)}
              onBlur={handleTagInputBlur}
              type="text"
              availableSteps={getPreviousStepsData()}
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
                Start Date
                <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className={inputClasses}
                onFocus={handleInputFocus}
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
                Start Time
                <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                className={inputClasses}
                onFocus={handleInputFocus}
              />
            </div>
          </div>

          {/* Duration Field */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Duration (minutes)
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              placeholder="60"
              className={inputClasses}
              onFocus={handleInputFocus}
            />
          </div>

          {/* Description Field - مع دعم Tags */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Description
            </label>
            <TagInput
              placeholder="Event details..."
              className={textareaClasses}
              onFocus={(e) => handleTagInputFocus(e)}
              onBlur={handleTagInputBlur}
              multiline
              rows={4}
              availableSteps={getPreviousStepsData()}
            />
          </div>

          {/* Attendees Field */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Attendees
            </label>
            <div className="border border-gray-300 rounded-lg p-3">
              <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                <Plus size={16} />
                Add attendee
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // Render Notion Configuration
  const renderNotionConfig = () => (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* App Info */}
        <div className="flex items-center gap-3 rounded-lg mb-4">
          <div className={`w-10 h-10 ${selectedStep?.color || 'bg-blue-500'} rounded-lg flex items-center justify-center shrink-0 text-white`}>
            {selectedStep?.icon || '🌐'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">{selectedStep?.name}</p>
            <p className="text-xs text-gray-500">Configure this step</p>
          </div>
          <span className="text-xs text-gray-400">v1.0.0</span>
        </div>

        {/* Fill by AI Banner */}
        <button 
          onClick={() => {
            if (isAIFilling && onStopFilling) {
              onStopFilling();
            } else if (onAIFillAssistantOpen && onStartFilling) {
              onStartFilling();
              onAIFillAssistantOpen();
            }
          }}
          className={`w-full flex items-center gap-2 p-3 bg-[hsl(257,74%,97%)] border border-[hsl(257,74%,87%)] rounded-lg hover:bg-[hsl(257,74%,95%)] transition-colors relative overflow-hidden group ${
            isAIFilling ? 'sticky top-0 z-50 shadow-md' : ''
          }`}
        >
          {!isAIFilling && (
            <div className="absolute inset-0 w-24 h-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[ai-shine_2.5s_ease-in-out_infinite]"></div>
          )}
          
          {/* Icon - Changes based on state */}
          {isAIFilling ? (
            <div className="animate-spin relative z-10" style={{ color: 'hsl(257, 74%, 57%)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
          ) : (
            <Sparkles size={16} className="text-[hsl(257,74%,57%)] relative z-10 group-hover:animate-[ai-glow_1.5s_ease-in-out_infinite]" />
          )}
          
          <span className="flex-1 text-left text-sm text-[hsl(257,74%,47%)] relative z-10 group-hover:animate-[ai-glow_1.5s_ease-in-out_infinite]">
            {isAIFilling ? 'AI is filling...' : 'Fill by AI'}
          </span>
          
          {/* Stop Button - Shows only when AI is filling */}
          {isAIFilling && (
            <span className="px-3 py-1 text-xs rounded transition-colors relative z-10" style={{ 
              backgroundColor: 'hsl(257, 74%, 57%)',
              color: 'white'
            }}>
              Stop
            </span>
          )}
        </button>

        {/* Fields Container */}
        <div className="space-y-4">
          {/* Page Title - مع دعم Tags */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Page Title
              <span className="text-red-500">*</span>
            </label>
            <TagInput
              placeholder="New page title"
              className={inputClasses}
              onFocus={(e) => handleTagInputFocus(e)}
              onBlur={handleTagInputBlur}
              type="text"
              availableSteps={getPreviousStepsData()}
            />
          </div>
          {/* Content - مع دعم Tags */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Content
            </label>
            <TagInput
              placeholder="Page content..."
              className={textareaClasses}
              onFocus={(e) => handleTagInputFocus(e)}
              onBlur={handleTagInputBlur}
              multiline
              rows={6}
              availableSteps={getPreviousStepsData()}
            />
          </div>
          
          {/* Action Field */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Action
              <span className="text-red-500">*</span>
            </label>
            <select className={inputClasses}
              onFocus={handleInputFocus}
            >
              <option value="">Select an action</option>
              <option value="create-page">Create Page</option>
              <option value="update-page">Update Page</option>
              <option value="create-database">Create Database</option>
            </select>
          </div>
        </div>
      </div>
    </>
  );

  // Render Stripe Configuration
  const renderStripeConfig = () => (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* App Info */}
        <div className="flex items-center gap-3 rounded-lg mb-4">
          <div className={`w-10 h-10 ${selectedStep?.color || 'bg-blue-500'} rounded-lg flex items-center justify-center shrink-0 text-white`}>
            {selectedStep?.icon || '🌐'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">{selectedStep?.name}</p>
            <p className="text-xs text-gray-500">Configure this step</p>
          </div>
          <span className="text-xs text-gray-400">v1.0.0</span>
        </div>

        {/* Fill by AI Banner */}
        <button 
          onClick={() => {
            if (isAIFilling && onStopFilling) {
              onStopFilling();
            } else if (onAIFillAssistantOpen && onStartFilling) {
              onStartFilling();
              onAIFillAssistantOpen();
            }
          }}
          className={`w-full flex items-center gap-2 p-3 bg-[hsl(257,74%,97%)] border border-[hsl(257,74%,87%)] rounded-lg hover:bg-[hsl(257,74%,95%)] transition-colors relative overflow-hidden group ${
            isAIFilling ? 'sticky top-0 z-50 shadow-md' : ''
          }`}
        >
          {!isAIFilling && (
            <div className="absolute inset-0 w-24 h-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[ai-shine_2.5s_ease-in-out_infinite]"></div>
          )}
          
          {/* Icon - Changes based on state */}
          {isAIFilling ? (
            <div className="animate-spin relative z-10" style={{ color: 'hsl(257, 74%, 57%)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
          ) : (
            <Sparkles size={16} className="text-[hsl(257,74%,57%)] relative z-10 group-hover:animate-[ai-glow_1.5s_ease-in-out_infinite]" />
          )}
          
          <span className="flex-1 text-left text-sm text-[hsl(257,74%,47%)] relative z-10 group-hover:animate-[ai-glow_1.5s_ease-in-out_infinite]">
            {isAIFilling ? 'AI is filling...' : 'Fill by AI'}
          </span>
          
          {/* Stop Button - Shows only when AI is filling */}
          {isAIFilling && (
            <span className="px-3 py-1 text-xs rounded transition-colors relative z-10" style={{ 
              backgroundColor: 'hsl(257, 74%, 57%)',
              color: 'white'
            }}>
              Stop
            </span>
          )}
        </button>

        {/* Fields Container */}
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Action
              <span className="text-red-500">*</span>
            </label>
            <select className={inputClasses}
              onFocus={handleInputFocus}
            >
              <option value="">Select an action</option>
              <option value="create-payment">Create Payment</option>
              <option value="create-customer">Create Customer</option>
              <option value="create-refund">Create Refund</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Amount
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              placeholder="100.00"
              className={inputClasses}
              onFocus={handleInputFocus}
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Currency
              <span className="text-red-500">*</span>
            </label>
            <select className={inputClasses}
              onFocus={handleInputFocus}
            >
              <option value="usd">USD</option>
              <option value="eur">EUR</option>
              <option value="aed">AED</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Customer Email
            </label>
            <input
              type="email"
              placeholder="customer@example.com"
              className={inputClasses}
              onFocus={handleInputFocus}
            />
          </div>
        </div>
      </div>
    </>
  );

  // Render GitHub Configuration
  const renderGitHubConfig = () => (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* App Info */}
        <div className="flex items-center gap-3 rounded-lg mb-4">
          <div className={`w-10 h-10 ${selectedStep?.color || 'bg-blue-500'} rounded-lg flex items-center justify-center shrink-0 text-white`}>
            {selectedStep?.icon || '��'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">{selectedStep?.name}</p>
            <p className="text-xs text-gray-500">Configure this step</p>
          </div>
          <span className="text-xs text-gray-400">v1.0.0</span>
        </div>

        {/* Fill by AI Banner */}
        <button 
          onClick={() => {
            if (isAIFilling && onStopFilling) {
              onStopFilling();
            } else if (onAIFillAssistantOpen && onStartFilling) {
              onStartFilling();
              onAIFillAssistantOpen();
            }
          }}
          className={`w-full flex items-center gap-2 p-3 bg-[hsl(257,74%,97%)] border border-[hsl(257,74%,87%)] rounded-lg hover:bg-[hsl(257,74%,95%)] transition-colors relative overflow-hidden group ${
            isAIFilling ? 'sticky top-0 z-50 shadow-md' : ''
          }`}
        >
          {!isAIFilling && (
            <div className="absolute inset-0 w-24 h-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[ai-shine_2.5s_ease-in-out_infinite]"></div>
          )}
          
          {/* Icon - Changes based on state */}
          {isAIFilling ? (
            <div className="animate-spin relative z-10" style={{ color: 'hsl(257, 74%, 57%)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
          ) : (
            <Sparkles size={16} className="text-[hsl(257,74%,57%)] relative z-10 group-hover:animate-[ai-glow_1.5s_ease-in-out_infinite]" />
          )}
          
          <span className="flex-1 text-left text-sm text-[hsl(257,74%,47%)] relative z-10 group-hover:animate-[ai-glow_1.5s_ease-in-out_infinite]">
            {isAIFilling ? 'AI is filling...' : 'Fill by AI'}
          </span>
          
          {/* Stop Button - Shows only when AI is filling */}
          {isAIFilling && (
            <span className="px-3 py-1 text-xs rounded transition-colors relative z-10" style={{ 
              backgroundColor: 'hsl(257, 74%, 57%)',
              color: 'white'
            }}>
              Stop
            </span>
          )}
        </button>

        {/* Fields Container */}
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Action
              <span className="text-red-500">*</span>
            </label>
            <select className={inputClasses}
              onFocus={handleInputFocus}
            >
              <option value="">Select an action</option>
              <option value="create-issue">Create Issue</option>
              <option value="create-pr">Create Pull Request</option>
              <option value="merge-pr">Merge Pull Request</option>
            </select>
          </div>
          {/* Repository - مع دعم Tags */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Repository
              <span className="text-red-500">*</span>
            </label>
            <TagInput
              placeholder="owner/repo"
              className={inputClasses}
              onFocus={(e) => handleTagInputFocus(e)}
              onBlur={handleTagInputBlur}
              type="text"
              availableSteps={getPreviousStepsData()}
            />
          </div>
          {/* Issue Title - مع دعم Tags */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Issue Title
              <span className="text-red-500">*</span>
            </label>
            <TagInput
              placeholder="Bug: Something is broken"
              className={inputClasses}
              onFocus={(e) => handleTagInputFocus(e)}
              onBlur={handleTagInputBlur}
              type="text"
              availableSteps={getPreviousStepsData()}
            />
          </div>
          {/* Description - مع دعم Tags */}
          <div>
            <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
              Description
            </label>
            <TagInput
              placeholder="Describe the issue..."
              className={textareaClasses}
              onFocus={(e) => handleTagInputFocus(e)}
              onBlur={handleTagInputBlur}
              multiline
              rows={5}
              availableSteps={getPreviousStepsData()}
            />
          </div>
        </div>
      </div>
    </>
  );

  // 🎯 Render Generic App Configuration - FULLY DYNAMIC!
  const renderGenericConfig = () => {
    const appId = selectedStep?.appId || '';
    const fields = APP_FIELD_DEFINITIONS[appId] || [];
    
    return (
      <>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* App Info */}
          <div className="flex items-center gap-3 rounded-lg mb-4">
            <div className={`w-10 h-10 ${selectedStep?.color || 'bg-blue-500'} rounded-lg flex items-center justify-center shrink-0 text-white`}>
              {selectedStep?.icon || '🌐'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">{steps.findIndex(s => s.id === selectedStep?.id) + 2}. {selectedStep?.name}</p>
              <p className="text-xs text-gray-500">Configure this step</p>
            </div>
            <span className="text-xs text-gray-400">v1.0.0</span>
          </div>

          {/* Fill by AI Banner - Hidden (moved to left sidebar) */}
          <button 
            ref={aiFillButtonRef}
            onClick={handleAIFillClick}
            className="w-full flex items-center gap-2 p-3 bg-[hsl(257,74%,97%)] border border-[hsl(257,74%,87%)] rounded-lg hover:bg-[hsl(257,74%,95%)] transition-colors relative overflow-hidden group hidden"
          >
            {!showAIFillPopover && aiIsThinking ? (
              <>
                <svg className="animate-spin h-4 w-4 text-[hsl(257,74%,57%)] relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="flex-1 text-left text-sm text-[hsl(257,74%,47%)] relative z-10">
                  Thinking...
                </span>
              </>
            ) : (
              <>
                <div className="absolute inset-0 w-24 h-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[ai-shine_2.5s_ease-in-out_infinite]"></div>
                
                <Sparkles size={16} className="text-[hsl(257,74%,57%)] relative z-10 group-hover:animate-[ai-glow_1.5s_ease-in-out_infinite]" />
                
                <span className="flex-1 text-left text-sm text-[hsl(257,74%,47%)] relative z-10 group-hover:animate-[ai-glow_1.5s_ease-in-out_infinite]">
                  Chat with assistant
                </span>
                
                {!showAIFillPopover && aiHasNewMessage && (
                  <span className="px-2 py-0.5 bg-[hsl(257,74%,57%)] text-white text-xs rounded-full relative z-10">
                    1
                  </span>
                )}
              </>
            )}
          </button>

          {/* Dynamic Fields Container - Renders all fields from definition */}
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.name}>
                <label className="flex items-center gap-1 text-sm text-gray-700 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                </label>
                
                {field.type === 'select' ? (
                  <select 
                    ref={(el) => { 
                      if (el) {
                        dynamicFieldRefs.current[field.name] = el;
                        console.log('🔗 Ref registered for select:', field.name);
                      }
                    }}
                    value={dynamicSelectValues[field.name] || ''}
                    onChange={(e) => setDynamicSelectValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                    className={inputClasses}
                    onFocus={handleInputFocus}
                  >
                    <option value="">Select {field.label.toLowerCase()}</option>
                    {field.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <TagInput
                    ref={(el: any) => { 
                      if (el) {
                        dynamicFieldRefs.current[field.name] = el;
                        console.log('🔗 Ref registered for textarea:', field.name);
                      }
                    }}
                    placeholder={field.placeholder}
                    className={textareaClasses}
                    onFocus={(e) => {
                      const element = e.currentTarget;
                      element.setAttribute('data-field-name', field.label);
                      element.setAttribute('data-step-name', selectedStep?.name || '');
                      element.setAttribute('data-app-name', selectedStep?.name || '');
                      handleTagInputFocus(e);
                    }}
                    onBlur={handleTagInputBlur}
                    multiline
                    rows={field.rows || 4}
                    availableSteps={getPreviousStepsData()}
                  />
                ) : (
                  <TagInput
                    ref={(el: any) => { 
                      if (el) {
                        dynamicFieldRefs.current[field.name] = el;
                        console.log('🔗 Ref registered for text:', field.name);
                      }
                    }}
                    placeholder={field.placeholder}
                    className={inputClasses}
                    onFocus={(e) => {
                      const element = e.currentTarget;
                      element.setAttribute('data-field-name', field.label);
                      element.setAttribute('data-step-name', selectedStep?.name || '');
                      element.setAttribute('data-app-name', selectedStep?.name || '');
                      handleTagInputFocus(e);
                    }}
                    onBlur={handleTagInputBlur}
                    type="text"
                    availableSteps={getPreviousStepsData()}
                  />
                )}
              </div>
            ))}

            {/* Divider */}
            <div className="border-t border-gray-200 my-4"></div>
          </div>
        </div>
      </>
    );
  };

  // 🎯 Determine which configuration to render - NOW FULLY DYNAMIC!
  const renderConfigContent = () => {
    if (isTrigger) {
      return renderTriggerConfig();
    }

    if (!selectedStep) return null;

    // ✅ Use generic dynamic config for ALL apps (except trigger)
    // This ensures every app gets AI Fill, Test Step, and all features!
    return renderGenericConfig();
    
    // Old specific renders kept for reference (can be removed later):
    // case 'gmail': return renderGmailConfig();
    // case 'slack': return renderSlackConfig();
    // case 'gcal': return renderGoogleCalendarConfig();
    // case 'notion': return renderNotionConfig();
    // case 'stripe': return renderStripeConfig();
    // case 'github': return renderGitHubConfig();
  };

  return (
    <aside 
      ref={sidebarRef}
      className="w-80 bg-white border-l border-gray-200 flex flex-col h-full"
      onMouseDown={(e) => {
        // إذا كان السايدبار الموسع مفتوح
        if (isExpandedDataSelectorOpen) {
          const target = e.target as HTMLElement;
          
          // إذا كان الضغط على نفس الحقل النشط، خليه مفتوح
          if (activeInputElement && (target === activeInputElement || activeInputElement.contains(target))) {
            return;
          }
          
          // أخر الـ parent بسكر السايد��ار الموسع
          if (onInputFocusChange) {
            onInputFocusChange(null);
          }
        }
      }}
    >
      {/* Top Panel - Configuration Content */}
      <div 
        className="flex flex-col overflow-hidden" 
        style={{ height: `${topPanelHeight}%` }}
      >
        {!isTrigger && (
          <>
            {/* Header for Apps - Sticky */}
            <div className="sticky top-0 bg-white z-10 border-b border-gray-200 p-4 pb-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base">{selectedStep?.name || 'Step Configuration'}</h2>
                <div className="flex items-center gap-2">
                  <button 
                    className="p-1 rounded transition-colors text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onClose();
                    }}
                    className="p-1 rounded transition-colors text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Render appropriate configuration */}
        {renderConfigContent()}
      </div>

      {/* Resizer Bar */}
      <div
        ref={resizerRef}
        className="h-1 bg-gray-200 hover:bg-[hsl(257,74%,57%)] cursor-ns-resize transition-colors flex items-center justify-center group relative"
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-0.5 bg-gray-400 group-hover:bg-[hsl(257,74%,57%)] rounded-full"></div>
        </div>
      </div>

      {/* Bottom Panel - Test Section */}
      <div 
        className="flex flex-col overflow-hidden border-t border-gray-200"
        style={{ height: `${100 - topPanelHeight}%` }}
      >
        <div className="flex-1 overflow-y-auto p-4">
          <TestSection 
            ref={testSectionRef}
            stepId={selectedCardId} 
            testResult={testResults[selectedCardId]}
            onTestComplete={(stepId, result) => {
              if (onTestComplete) {
                onTestComplete(stepId, result);
              }
            }}
            isAIFilling={isAIFilling}
            testButtonRef={testButtonRef}
            isGlowing={isTestButtonGlowing}
          />
        </div>
      </div>

      {/* Data Selector Popover */}
      {showDataSelector && !isDataSelectorMinimized && !isDataSelectorExpanded && (
        <div
          ref={dataSelectorRef}
          className="z-[10000]"
          style={{ position: 'fixed' }}
          onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            // Allow focus on inputs/textareas inside the popover (e.g. search bar)
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
            // Allow native drag initiation on draggable elements
            if (target.closest('[draggable="true"]')) return;
            e.preventDefault();
          }}
        >
          <DataSelector
            availableSteps={getPreviousStepsData()}
            hideDataTab={isTrigger}
            onMinimize={() => setIsDataSelectorMinimized(true)}
            onExpand={() => {
              setShowDataSelector(false);
              setIsDataSelectorMinimized(false);
              if (onDataSelectorExpand) {
                onDataSelectorExpand();
              }
            }}
            onClose={() => {
              setShowDataSelector(false);
              setIsDataSelectorMinimized(false);
              if (activeInputElement) {
                activeInputElement.blur();
              }
              setActiveInputElement(null);
            }}
            onDataSelect={(data) => {
              // إدراج الـ tag في الحقل النشط
              if (activeInputElement) {
                const tagInputInstance = (activeInputElement as any).__tagInputInstance;
                if (tagInputInstance && tagInputInstance.insertTag) {
                  // Determine type
                  const type = data.type || 'step';
                  
                  if (type === 'function' || type === 'operator' || type === 'keyword' || type === 'variable') {
                    // Check if this is a function pair (displayValue ends with "()")
                    const displayVal = String(data.fieldValue);
                    if (type === 'function' && displayVal.endsWith('()') && tagInputInstance.insertTagPair) {
                      const funcName = displayVal.slice(0, -1); // e.g. "length("
                      const cleanFuncName = funcName.replace(/\($/, ''); // e.g. "length"
                      const sepCount = FUNCTION_SEPARATORS[cleanFuncName] || 0;
                      tagInputInstance.insertTagPair(
                        { type: 'function', id: data.stepId, value: funcName, displayValue: funcName },
                        { type: 'function', id: data.stepId, value: ')', displayValue: ')' },
                        sepCount,
                      );
                    } else {
                      tagInputInstance.insertTag({
                        type: type,
                        id: data.stepId,
                        value: data.field,
                        displayValue: data.fieldValue
                      });
                    }
                  } else {
                    // Find step info for icon/color
                    const stepInfo = steps.find(s => s.id === data.stepId);
                    
                    // Compute step number from previous steps order
                    const previousSteps = getPreviousStepsData();
                    const stepIdx = previousSteps.findIndex(s => s.id === data.stepId);
                    const stepNumber = stepIdx >= 0 ? stepIdx + 1 : undefined;
                    
                    // For trigger step, icon is React element; pass its appId icon instead
                    const triggerIcon = data.stepId === 'trigger' ? '⚙' : stepInfo?.icon;
                    
                    tagInputInstance.insertTag({
                      type: 'step',
                      id: data.stepId,
                      appId: data.stepId === 'trigger' ? 'trigger' : (stepInfo as any)?.appId || data.stepId,
                      stepName: data.stepName,
                      stepIcon: triggerIcon,
                      stepColor: stepInfo?.color || (data.stepId === 'trigger' ? 'bg-gray-500' : 'bg-gray-500'),
                      stepNumber,
                      path: data.field,
                      displayValue: data.fieldValue
                    });
                  }
                }
              }
            }}
          />
        </div>
      )}

      {/* Minimized Data Selector Icon */}
      {showDataSelector && isDataSelectorMinimized && (
        <div
          ref={dataSelectorRef}
          className="z-[10000] relative group"
          style={{ position: 'fixed' }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button
            onClick={() => setIsDataSelectorMinimized(false)}
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

      {/* 🎯 AI Fill Popover - Positioned to the LEFT of the button */}
      {showAIFillPopover && (() => {
        const fieldsToPass = getFieldsToFill();
        console.log('🎯 RightSidebar: Rendering AIFillPopover with fields:', fieldsToPass);
        return (
        <div
          ref={aiFillPopoverRef}
          className="z-[10000] rounded-xl"
          style={{ position: 'fixed' }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <AIFillPopover
            onClose={() => {
              setShowAIFillPopover(false);
              if (onStopFilling) {
                onStopFilling();
              }
            }}
            fieldsToFill={fieldsToPass}
            onFieldFilled={(fieldName, value, skipFocus) => {
              // 🚫 Set flag to skip Data Selector FIRST (before calling onFieldFilled)
              if (skipFocus) {
                skipDataSelectorRef.current = true;
                lastFilledFieldRef.current = fieldName;
                lastInsertTimestamp.current = Date.now(); // 🕐 Record insert time
                console.log('🔴 Insert button clicked - timestamp:', lastInsertTimestamp.current);
              }
              
              // Notify parent to update fieldValues state
              if (onFieldFilled) {
                onFieldFilled(fieldName, value, skipFocus);
              }
              
              // ✅ Flag will be reset immediately inside useEffect after insert completes
              // Timestamp-based blocking will prevent Data Selector for 800ms
            }}
            onCurrentFieldChange={(fieldName) => {
              // Request focus on the field
              if (onCurrentFieldChange) {
                onCurrentFieldChange(fieldName);
              }
            }}
            currentStepName={selectedStep?.name || ''}
            currentAppName={selectedStep?.name || ''}
            currentStepNumber={String(steps.findIndex(s => s.id === selectedStep?.id) + 2)}
            currentStepId={selectedStep?.id || ''}
            currentStepIcon={selectedStep?.icon || ''}
            currentStepColor={selectedStep?.color || ''}
            onStepClick={(stepId) => {
              const step = steps.find(s => s.id === stepId);
              if (step) {
                onStepSelect(stepId);
              }
            }}
            chatMessages={aiChatMessages}
            onChatMessagesChange={onAIChatMessagesChange || (() => {})}
            suggestions={aiSuggestions}
            onSuggestionsChange={onAISuggestionsChange || (() => {})}
            showSuggestions={aiShowSuggestions}
            onShowSuggestionsChange={onAIShowSuggestionsChange || (() => {})}
            isThinking={aiIsThinking}
            onThinkingChange={onAIIsThinkingChange || (() => {})}
            hasNewMessage={aiHasNewMessage}
            onHasNewMessageChange={(hasNew) => {
              setAiHasNewMessage(hasNew);
              onAIHasNewMessage?.(hasNew);
            }}
            availableSteps={getAllStepsData()}
          />
        </div>
        );
      })()}
    </aside>
  );
}
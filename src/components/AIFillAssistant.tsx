import { X, ChevronDown, ChevronRight, Info, Minus, Minimize2, Database, Sparkles, Send, Plus, User, Bot, Square, Search, Check, SkipForward, RotateCcw } from 'lucide-react';
import { useState, ReactNode, useEffect, useRef } from 'react';
import { motion } from 'motion/react';

interface FieldToFill {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

interface AIFillAssistantProps {
  onClose: () => void;
  onMinimize?: () => void;
  onShrink?: () => void;
  onSelectData?: (data: { stepId: string; stepName: string; field: string; fieldValue: any }) => void;
  activeInputElement?: HTMLElement | null;
  availableSteps?: Array<{
    id: string;
    name: string;
    icon: ReactNode;
    color: string;
    fields: Record<string, any>;
  }>;
  currentFieldName?: string;
  currentStepName?: string;
  currentAppName?: string;
  isAIFilling?: boolean;
  onStartFilling?: () => void;
  onStopFilling?: () => void;
  fieldsToFill?: FieldToFill[];
  onFieldFilled?: (fieldName: string, value: string) => void;
  onCurrentFieldChange?: (fieldName: string) => void;
  onRequestTest?: () => void;
  onTriggerTestGlow?: () => void;
  testResult?: { status: 'idle' | 'testing' | 'success' | 'failed'; output: any; date: string | null } | null;
}

export function AIFillAssistant({ 
  onClose, 
  onMinimize, 
  onShrink, 
  onSelectData, 
  activeInputElement, 
  availableSteps = [], 
  currentFieldName = '', 
  currentStepName = '', 
  currentAppName = '', 
  isAIFilling = false, 
  onStartFilling, 
  onStopFilling,
  fieldsToFill = [],
  onFieldFilled,
  onCurrentFieldChange,
  onRequestTest,
  onTriggerTestGlow,
  testResult
}: AIFillAssistantProps) {
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'ai'; content: string; suggestion?: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDisplayComplete, setIsDisplayComplete] = useState(true); // Track if character display is complete
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [currentSuggestion, setCurrentSuggestion] = useState<string>('');
  const [userResponses, setUserResponses] = useState<string[]>([]);
  const [userMessage, setUserMessage] = useState('');
  const [isWaitingForTestDecision, setIsWaitingForTestDecision] = useState(false);
  const [hasTestFailed, setHasTestFailed] = useState(false); // Track if test has failed before
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasStartedRef = useRef(false);
  const streamBufferRef = useRef<string>(''); // Buffer for smooth streaming
  const displayedTextRef = useRef<string>(''); // Currently displayed text
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null); // Interval for character streaming
  const lastProcessedTestStatusRef = useRef<string>('idle'); // Track last processed test status
  const hasRequestedTestInSessionRef = useRef<boolean>(false); // Track if we requested test in this session

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isLoading]);

  // Start filling when AI Filling is enabled
  useEffect(() => {
    if (isAIFilling && !hasStartedRef.current) {
      hasStartedRef.current = true;
      
      // 🔄 COMPLETE RESET - Clear everything when starting new session
      setChatMessages([]); // Clear all chat messages
      setCurrentFieldIndex(0); // Reset to first field
      setCurrentSuggestion(''); // Clear any suggestions
      setUserResponses([]); // Clear user responses
      setUserMessage(''); // Clear chat input
      setIsWaitingForTestDecision(false); // Reset test decision state
      setIsLoading(false); // Reset loading state
      setIsStreaming(false); // Reset streaming state
      setIsDisplayComplete(true); // Reset display state
      
      // Reset test tracking when starting new AI Filling session
      lastProcessedTestStatusRef.current = 'idle';
      setHasTestFailed(false);
      hasRequestedTestInSessionRef.current = false; // Reset test request tracking
      
      // Clear streaming refs
      streamBufferRef.current = '';
      displayedTextRef.current = '';
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
      
      // For testing - add a welcome message
      if (fieldsToFill.length === 0) {
        setChatMessages([{
          role: 'ai',
          content: '👋 مرحباً! أنا جاهز لمساعدتك في تعبئة الحقول. \\n\\nيبدو أنه لا توجد حقول لتعبئة في الوقت الحالي. تأكد من اختيار خطوة تحتوي على حقول قابلة للتعبئة.'
        }]);
      } else {
        // Notify about first field immediately
        if (onCurrentFieldChange && fieldsToFill.length > 0) {
          onCurrentFieldChange(fieldsToFill[0].name);
        }
        startFillingCurrentField();
      }
    }
    
    // Reset hasStartedRef when AI Filling is turned off
    if (!isAIFilling) {
      hasStartedRef.current = false;
    }
    
    // Cleanup interval on unmount
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
    };
  }, [isAIFilling, fieldsToFill]);

  // Function to flatten nested objects into field list
  const getFieldsList = (fields: Record<string, any>, prefix = ''): Array<{ name: string; value: any; type: string }> => {
    const result: Array<{ name: string; value: any; type: string }> = [];
    
    Object.entries(fields).forEach(([key, value]) => {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // Nested object - flatten it
        result.push(...getFieldsList(value, fieldName));
      } else {
        // Simple value
        const type = Array.isArray(value) ? 'array' : typeof value;
        result.push({
          name: fieldName,
          value: value,
          type: type
        });
      }
    });
    
    return result;
  };

  const handleFieldClick = (step: any, fieldName: string, fieldValue: any) => {
    // إدراج الـ tag في الحقل النشط
    if (activeInputElement) {
      const tagInputInstance = (activeInputElement as any).__tagInputInstance;
      if (tagInputInstance && tagInputInstance.insertTag) {
        tagInputInstance.insertTag({
          stepId: step.id,
          stepName: step.name,
          fieldPath: fieldName,
          value: fieldValue
        });
      }
    }
    
    if (onSelectData) {
      onSelectData({
        stepId: step.id,
        stepName: step.name,
        field: fieldName,
        fieldValue: fieldValue
      });
    }
  };

  // Helper to get value type display
  const getValueDisplay = (value: any): string => {
    if (Array.isArray(value)) {
      return `Array[${value.length}]`;
    }
    if (typeof value === 'string') {
      return value.length > 50 ? value.substring(0, 50) + '...' : value;
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (typeof value === 'boolean') {
      return String(value);
    }
    return String(value);
  };

  // Parse message content and convert field names in backticks to clickable tags
  const renderMessageContent = (content: string) => {
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    const regex = /`([^`]+)`/g;
    let match;
    let keyIndex = 0;

    while ((match = regex.exec(content)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }

      const fieldName = match[1];
      
      // Find the field in available steps
      let foundField: { step: any; field: any } | null = null;
      for (const step of availableSteps) {
        const fieldsList = getFieldsList(step.fields);
        const field = fieldsList.find(f => f.name === fieldName);
        if (field) {
          foundField = { step, field };
          break;
        }
      }

      // Create clickable tag
      if (foundField) {
        parts.push(
          <button
            key={`tag-${keyIndex++}`}
            onClick={() => handleFieldClick(foundField.step, foundField.field.name, foundField.field.value)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-all hover:bg-gray-200 hover:border-gray-500 cursor-pointer"
            style={{ 
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              color: '#374151',
              fontSize: '11px'
            }}
          >
            <span style={{ color: 'hsl(257, 74%, 57%)' }}>{foundField.field.name}:</span>
            <span className="text-gray-500">{getValueDisplay(foundField.field.value)}</span>
          </button>
        );
      } else {
        // If field not found, just render as code
        parts.push(
          <code 
            key={`code-${keyIndex++}`}
            className="px-1.5 py-0.5 rounded text-xs"
            style={{ backgroundColor: '#f3f4f6', color: '#374151' }}
          >
            {fieldName}
          </code>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  const startFillingCurrentField = async () => {
    if (currentFieldIndex >= fieldsToFill.length) {
      // All fields filled
      if (onStopFilling) onStopFilling();
      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        content: '✅ All fields have been processed! Your workflow configuration is complete.' 
      }]);
      return;
    }

    const currentField = fieldsToFill[currentFieldIndex];
    
    console.log('🔵 AI Filling Field:', {
      name: currentField.name,
      label: currentField.label,
      type: currentField.type,
      options: currentField.options,
      hasOptions: !!currentField.options,
      isDropdown: currentField.type === 'select'
    });
    
    setIsLoading(true);
    
    // Add empty AI message that we'll update with streaming
    let aiMessageIndex = 0;
    setChatMessages(prev => {
      aiMessageIndex = prev.length;
      return [...prev, { role: 'ai', content: '' }];
    });
    
    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    
    try {
      // Build context for AI
      const availableFieldsContext = availableSteps.map(step => {
        const fieldsList = getFieldsList(step.fields);
        return `${step.name}: ${fieldsList.map(f => `${f.name} (${f.type}): ${getValueDisplay(f.value)}`).join(', ')}`;
      }).join('\n');
      
      // Build conversation history
      const conversationHistory = userResponses.map((response, idx) => {
        return `Field ${idx + 1} (${fieldsToFill[idx].label}): User said "${response}"`;
      }).join('\n');
      
      const systemPrompt = `You are an AI assistant helping users build automation workflows.

Field to fill: "${currentField.label}" (${currentField.name})
${currentField.type === 'select' && currentField.options ? `
**DROPDOWN - Choose ONE value:**
${currentField.options.map(o => `"${o.value}"`).join(', ')}
` : ''}

**Available data:**
${availableSteps.map(step => {
  const fieldsList = getFieldsList(step.fields);
  return `${step.name}: ${fieldsList.map(f => `\`${f.name}\`="${getValueDisplay(f.value)}"`).join(', ')}`;
}).join('\\n')}

**Your response must follow this format:**

1. Think briefly (1-2 sentences) about what this field needs
2. Ask the user a helpful question or suggest using available data
3. **ALWAYS end with:** SUGGESTION: [your suggestion here]

${currentField.type === 'select' ? `
**For dropdowns:** SUGGESTION must be ONE value from the options above.

Example:
"This field determines the email action. Would you like to send, read, or draft?

SUGGESTION: send"
` : `
**For text fields:** Use backticks for variables: \`field_name\`

Example:
"I see there's an \`email\` field available. Should I use it?

SUGGESTION: \`email\`"

Example with mixed content:
"I can create a personalized message with the user's name and order ID.

SUGGESTION: Hi \`name\`, order #\`order_id\` confirmed!"
`}

**CRITICAL:** Every response MUST end with "SUGGESTION: [value]" on a new line!`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_OPENAI_API_KEY'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Please help me fill the "${currentField.label}" field.` }
          ],
          temperature: 0.7,
          max_tokens: 1000, // Increased to allow longer responses
          stream: true
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error('Failed to get response from OpenAI');
      }

      // Read the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let buffer = '';

      if (reader) {
        setIsLoading(false);
        setIsStreaming(true);
        setIsDisplayComplete(false); // Start displaying
        
        // Reset refs for smooth streaming
        streamBufferRef.current = '';
        displayedTextRef.current = '';
        
        // Start smooth character display
        const startSmoothStreaming = () => {
          if (streamIntervalRef.current) {
            clearInterval(streamIntervalRef.current);
          }
          
          streamIntervalRef.current = setInterval(() => {
            const buffered = streamBufferRef.current;
            const displayed = displayedTextRef.current;
            
            // If we have more text to display
            if (displayed.length < buffered.length) {
              // Add next 2-3 characters for smooth but not too slow effect
              const charsToAdd = Math.min(3, buffered.length - displayed.length);
              const newDisplayed = buffered.substring(0, displayed.length + charsToAdd);
              displayedTextRef.current = newDisplayed;
              
              // Update the UI
              setChatMessages(prev => {
                const newMessages = [...prev];
                newMessages[aiMessageIndex] = {
                  role: 'ai',
                  content: newDisplayed
                };
                return newMessages;
              });
            } else {
              // Display is complete
              setIsDisplayComplete(true);
            }
          }, 30); // Update every 30ms for smooth typing effect
        };
        
        startSmoothStreaming();
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue;
            
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              
              if (content) {
                accumulatedText += content;
                // Update buffer instead of directly updating UI
                streamBufferRef.current = accumulatedText;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
        
        // Wait for smooth streaming to catch up
        const waitForCatchUp = setInterval(() => {
          if (displayedTextRef.current === streamBufferRef.current) {
            clearInterval(waitForCatchUp);
            if (streamIntervalRef.current) {
              clearInterval(streamIntervalRef.current);
              streamIntervalRef.current = null;
            }
            
            console.log('✅ Display caught up! Now extracting suggestion...');
            console.log('📊 States before extraction:', {
              isStreaming: false,
              isDisplayComplete: true,
              hasText: !!streamBufferRef.current
            });
            
            // Final update with complete text
            setChatMessages(prev => {
              const newMessages = [...prev];
              newMessages[aiMessageIndex] = {
                role: 'ai',
                content: accumulatedText
              };
              return newMessages;
            });
            
            // ✅ Extract suggestion ONLY after display is complete
            console.log('🔍 Full AI response:', accumulatedText);
            const suggestionMatch = accumulatedText.match(/SUGGESTION:\s*(.+?)$/m);
            console.log('🔍 Suggestion match:', suggestionMatch);
            if (suggestionMatch) {
              const extractedSuggestion = suggestionMatch[1].trim();
              console.log('🔍 Extracted suggestion (RAW):', extractedSuggestion);
              console.log('🔍 Contains backticks?', extractedSuggestion.includes('`'));
              console.log('🔍 Backtick test:', /`([^`]+)`/.test(extractedSuggestion));
              console.log('✅ Setting currentSuggestion to:', extractedSuggestion);
              setCurrentSuggestion(extractedSuggestion);
            } else {
              console.error('⚠️ No SUGGESTION found in response!');
            }
            
            console.log('✅ Setting isStreaming = false, isDisplayComplete = true');
            setIsStreaming(false);
            setIsDisplayComplete(true); // Mark display as complete
          }
        }, 50);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('AI response stopped by user');
      } else {
        console.error('Error calling OpenAI:', error);
        setChatMessages(prev => {
          const newMessages = [...prev];
          newMessages[aiMessageIndex] = {
            role: 'ai',
            content: 'Sorry, I encountered an error. Please try again.'
          };
          return newMessages;
        });
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    // إعادة توليد اقتراح جديد لنفس الحقل
    setCurrentSuggestion('');
    
    // Add regeneration message
    setChatMessages(prev => [...prev, { 
      role: 'user', 
      content: '🔄 Regenerate' 
    }]);
    
    // Restart filling current field
    setTimeout(() => startFillingCurrentField(), 500);
  };

  const handleSendChatMessage = () => {
    if (!userMessage.trim()) return;
    
    // إضافة رسالة المستخدم
    const message = userMessage.trim();
    setUserMessage('');
    setChatMessages(prev => [...prev, { role: 'user', content: message }]);
    
    // معالجة الرالة واستجابة الـ AI
    setTimeout(() => {
      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        content: `Thanks for your feedback! Let me reconsider based on what you said: "${message}"` 
      }]);
      
      // إعادة توليد بناءً على تعليق المستخدم
      setTimeout(() => startFillingCurrentField(), 1000);
    }, 500);
  };

  const handleUserResponse = (response: string) => {
    // Add user message
    setChatMessages(prev => [...prev, { role: 'user', content: response }]);
    setUserResponses(prev => [...prev, response]);
    
    // Continue with AI response
    setTimeout(() => startFillingCurrentField(), 500);
  };

  const handleApprove = () => {
    if (currentSuggestion && onFieldFilled) {
      // Check if we're still within valid range
      if (currentFieldIndex >= fieldsToFill.length) {
        console.warn('⚠️ currentFieldIndex out of range:', currentFieldIndex, 'fieldsToFill.length:', fieldsToFill.length);
        return;
      }
      
      const currentField = fieldsToFill[currentFieldIndex];
      
      console.log('🟢 APPROVE clicked');
      console.log('🟢 Current field:', currentField.name, currentField.type);
      console.log('🟢 Current suggestion:', currentSuggestion);
      console.log('🟢 Current suggestion (JSON):', JSON.stringify(currentSuggestion));
      
      // Parse suggestion and separate text from field references
      const regex = /`([^`]+)`/g;
      const parts: Array<{ type: 'text' | 'tag'; content: string; tagData?: { stepId: string; stepName: string; fieldName: string; value: any } }> = [];
      let lastIndex = 0;
      let match;
      
      console.log('🔍 Starting regex parsing...');
      
      while ((match = regex.exec(currentSuggestion)) !== null) {
        console.log('🔍 Found match:', match[0], 'at index', match.index);
        
        // Add text before the match
        if (match.index > lastIndex) {
          const textBefore = currentSuggestion.substring(lastIndex, match.index);
          console.log('🔍 Adding text before:', textBefore);
          parts.push({ type: 'text', content: textBefore });
        }
        
        // Find the field in available steps
        const fieldName = match[1];
        console.log('🔍 Looking for field:', fieldName);
        let foundField: { step: any; field: any } | null = null;
        
        for (const step of availableSteps) {
          const fieldsList = getFieldsList(step.fields);
          // Try exact match first
          let field = fieldsList.find(f => f.name === fieldName);
          
          // If not found, try matching the last part (e.g. "user.name" -> "name")
          if (!field && fieldName.includes('.')) {
            const lastPart = fieldName.split('.').pop();
            field = fieldsList.find(f => f.name === lastPart || f.name.endsWith('.' + lastPart));
          }
          
          // If still not found, try partial match
          if (!field) {
            field = fieldsList.find(f => f.name.includes(fieldName) || fieldName.includes(f.name));
          }
          
          if (field) {
            foundField = { step, field };
            console.log('🔍 Found field in step:', step.name, '- field:', field.name);
            break;
          }
        }
        
        if (foundField) {
          console.log('🔍 Adding TAG for field:', fieldName);
          parts.push({ 
            type: 'tag', 
            content: fieldName,
            tagData: {
              stepId: foundField.step.id,
              stepName: foundField.step.name,
              fieldName: foundField.field.name,
              value: foundField.field.value
            }
          });
        } else {
          console.log('🔍 Field NOT found, adding as text:', match[0]);
          // If field not found, treat as text
          parts.push({ type: 'text', content: match[0] });
        }
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text
      if (lastIndex < currentSuggestion.length) {
        const remaining = currentSuggestion.substring(lastIndex);
        console.log('🔍 Adding remaining text:', remaining);
        parts.push({ type: 'text', content: remaining });
      }
      
      // If no parts were created (no regex matches), treat entire suggestion as text
      if (parts.length === 0) {
        console.log('🔍 No parts created, adding entire suggestion as text');
        parts.push({ type: 'text', content: currentSuggestion });
      }
      
      console.log('🔍 Parsed parts:', parts.map(p => ({ type: p.type, content: p.content })));
      console.log('🔍 Has tags?', parts.some(p => p.type === 'tag'));
      console.log('🔍 activeInputElement:', activeInputElement);
      console.log('🔍 activeInputElement type:', activeInputElement?.tagName);
      console.log('🔍 Condition check:', {
        hasActiveElement: !!activeInputElement,
        hasTags: parts.some(p => p.type === 'tag'),
        willInsertMixed: !!(activeInputElement && parts.some(p => p.type === 'tag'))
      });
      
      // ⚠️ DROPDOWN SPECIAL HANDLING
      if (currentField.type === 'select') {
        console.log('🔽 DROPDOWN detected - using onFieldFilled directly');
        console.log('🔽 Field name:', currentField.name);
        console.log('🔽 Suggestion value:', currentSuggestion);
        
        // For dropdown, always use onFieldFilled (never try to insert into TagInput)
        onFieldFilled(currentField.name, currentSuggestion.trim());
      }
      // Insert parts into the field (for text/textarea fields)
      else if (activeInputElement && parts.some(p => p.type === 'tag')) {
        const tagInputInstance = (activeInputElement as any).__tagInputInstance;
        
        console.log('🔍 tagInputInstance:', tagInputInstance ? 'Found ✅' : 'NOT FOUND ❌');
        
        if (tagInputInstance) {
          // Get the contentEditable div
          const editableDiv = activeInputElement.querySelector('[contenteditable="true"]') as HTMLDivElement;
          
          console.log('🔍 editableDiv:', editableDiv ? 'Found ✅' : 'NOT FOUND ❌');
          
          if (editableDiv) {
            console.log('✅ Inserting mixed content (text + tags)');
            
            // Clear the field first
            editableDiv.innerHTML = '';
            
            // Create a document fragment to hold all parts
            const fragment = document.createDocumentFragment();
            
            // Insert each part
            for (const part of parts) {
              if (part.type === 'text' && part.content) {
                // Insert text as text node
                console.log('📝 Inserting text:', part.content);
                const textNode = document.createTextNode(part.content);
                fragment.appendChild(textNode);
              } else if (part.type === 'tag' && part.tagData) {
                console.log('🏷️ Creating tag:', part.tagData.stepName + '.' + part.tagData.fieldName);
                
                // Create tag span manually (same as TagInput does)
                const tagSpan = document.createElement('span');
                tagSpan.contentEditable = 'false';
                tagSpan.className = 'inline-flex items-center';
                tagSpan.setAttribute('data-tag', JSON.stringify({
                  stepId: part.tagData.stepId,
                  fieldPath: part.tagData.fieldName
                }));
                
                // Get icon for the step
                const appIcons: Record<string, string> = {
                  trigger: '🔧',
                  gmail: '📧',
                  slack: '💬',
                  gcal: '📅',
                  notion: '📝',
                  stripe: '💳',
                  github: '🐙'
                };
                const icon = appIcons[part.tagData.stepId] || '📦';
                const label = `${part.tagData.stepName}.${part.tagData.fieldName}`;
                
                tagSpan.innerHTML = `
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-300 text-gray-900 text-xs rounded-md whitespace-nowrap">
                    <span class="text-[10px]">${icon}</span>
                    <span>${label}</span>
                  </span>
                `;
                
                fragment.appendChild(tagSpan);
              }
            }
            
            // Insert all parts at once
            editableDiv.appendChild(fragment);
            
            // Focus the field
            editableDiv.focus();
          }
        } else {
          console.warn('⚠️ tagInputInstance not available - falling back to plain text');
          // Fallback: use onFieldFilled with plain text
          onFieldFilled(currentField.name, currentSuggestion.replace(/`([^`]+)`/g, '$1'));
        }
      } else {
        console.log('⚠️ No tags or no activeInputElement - using onFieldFilled');
        // No tags, insert as plain text
        onFieldFilled(currentField.name, currentSuggestion);
      }
      
      // Add confirmation message
      setChatMessages(prev => [...prev, { 
        role: 'user', 
        content: `✅ Approved` 
      }]);
      
      // Move to next field
      setCurrentSuggestion('');
      const nextIndex = currentFieldIndex + 1;
      setCurrentFieldIndex(nextIndex);
      
      // Start next field after a short delay
      setTimeout(() => {
        if (nextIndex < fieldsToFill.length) {
          // Notify about next field
          if (onCurrentFieldChange) {
            onCurrentFieldChange(fieldsToFill[nextIndex].name);
          }
          startFillingCurrentField();
        } else {
          // All fields done - ask about testing
          if (onCurrentFieldChange) onCurrentFieldChange(null as any);
          
          setChatMessages(prev => [...prev, { 
            role: 'ai', 
            content: '🎉 All fields have been filled!\n\nWould you like to test the step to make sure everything is working correctly?' 
          }]);
          setIsWaitingForTestDecision(true);
        }
      }, 500);
    }
  };

  const handleSkip = () => {
    // Check if we're still within valid range
    if (currentFieldIndex >= fieldsToFill.length) {
      console.warn('⚠️ handleSkip: currentFieldIndex out of range:', currentFieldIndex, 'fieldsToFill.length:', fieldsToFill.length);
      return;
    }
    
    const currentField = fieldsToFill[currentFieldIndex];
    
    // Add skip message
    setChatMessages(prev => [...prev, { 
      role: 'user', 
      content: `⏭️ Skipped` 
    }]);
    
    // Move to next field
    setCurrentSuggestion('');
    const nextIndex = currentFieldIndex + 1;
    setCurrentFieldIndex(nextIndex);
    
    // Start next field after a short delay
    setTimeout(() => {
      if (nextIndex < fieldsToFill.length) {
        // Notify about next field
        if (onCurrentFieldChange) {
          onCurrentFieldChange(fieldsToFill[nextIndex].name);
        }
        startFillingCurrentField();
      } else {
        // All fields done - ask about testing
        if (onCurrentFieldChange) onCurrentFieldChange(null as any);
        
        setChatMessages(prev => [...prev, { 
          role: 'ai', 
          content: '🎉 All fields have been processed!\\n\\nWould you like to test the step to make sure everything is working correctly?' 
        }]);
        setIsWaitingForTestDecision(true);
      }
    }, 500);
  };

  const handleTestStep = () => {
    // User wants to test
    setChatMessages(prev => [...prev, { 
      role: 'user', 
      content: '🧪 Test Step' 
    }]);
    
    setIsWaitingForTestDecision(false);
    
    // 🔄 Reset test tracking to allow new test results to be processed
    lastProcessedTestStatusRef.current = 'idle';
    hasRequestedTestInSessionRef.current = true; // Mark that we requested a test in this session
    
    // Trigger test glow
    if (onTriggerTestGlow) {
      onTriggerTestGlow();
    }
    
    // Request test - this will actually run the test
    if (onRequestTest) {
      onRequestTest();
    }
  };

  const handleIgnoreTest = () => {
    // User doesn't want to test
    setChatMessages(prev => [...prev, { 
      role: 'user', 
      content: '⏭️ Ignore' 
    }]);
    
    setIsWaitingForTestDecision(false);
    
    // Add final message
    setChatMessages(prev => [...prev, { 
      role: 'ai', 
      content: '✅ All done! Your workflow is ready to use.' 
    }]);
    
    // Close the assistant after a short delay
    setTimeout(() => {
      if (onStopFilling) onStopFilling();
    }, 1500);
  };

  // Watch for test results
  useEffect(() => {
    // Only react to test results when we're in AI Filling mode and we've requested a test
    if (!isAIFilling || !testResult || !hasRequestedTestInSessionRef.current) {
      return;
    }

    const currentStatus = testResult.status;
    const lastStatus = lastProcessedTestStatusRef.current;
    
    // Ignore if we've already processed this status
    if (currentStatus === lastStatus) {
      return;
    }
    
    // Update the last processed status
    lastProcessedTestStatusRef.current = currentStatus;

    if (currentStatus === 'testing') {
      // Test is running - add loading box
      setChatMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        // Check if we already have a testing message
        if (lastMessage && (lastMessage.content.includes('Test is running') || lastMessage.content === 'TESTING_LOADING')) {
          return prev;
        }
        return [...prev, { 
          role: 'ai', 
          content: 'TESTING_LOADING' // Special marker for loading box
        }];
      });
    } else if (currentStatus === 'success') {
      // Test succeeded - remove loading box and show success
      setChatMessages(prev => {
        // Remove the loading message
        const filtered = prev.filter(msg => msg.content !== 'TESTING_LOADING');
        
        // If test was failed before, mention that we fixed it
        if (hasTestFailed) {
          return [...filtered, { 
            role: 'ai', 
            content: '✅ Perfect! The test passed successfully after filling the missing fields. Everything is working now!' 
          }];
        }
        
        return [...filtered, { 
          role: 'ai', 
          content: '✅ Test completed successfully! The step is working perfectly.' 
        }];
      });
      
      // Close immediately after success
      setTimeout(() => {
        if (onStopFilling) onStopFilling();
      }, 800);
    } else if (currentStatus === 'failed') {
      // Test failed - analyze and check for empty fields
      setChatMessages(prev => {
        // Remove the loading message
        const filtered = prev.filter(msg => msg.content !== 'TESTING_LOADING');
        return [...filtered, { 
          role: 'ai', 
          content: '❌ The test failed. Let me analyze what went wrong...' 
        }];
      });
      
      setHasTestFailed(true);
      
      // Check for empty fields after a delay (to show analyzing message)
      setTimeout(() => {
        // Collect field values from the actual fields
        // We need to check which fields are empty
        const emptyFields: FieldToFill[] = [];
        
        fieldsToFill.forEach(field => {
          // Check field element
          const fieldElement = document.querySelector(`[data-field-name="${field.name}"]`);
          
          if (fieldElement) {
            let isEmpty = false;
            
            if (field.type === 'select') {
              const selectElement = fieldElement as HTMLSelectElement;
              isEmpty = !selectElement.value || selectElement.value === '';
            } else {
              // For text/textarea, check the contenteditable div or input
              const editableDiv = fieldElement.querySelector('[contenteditable="true"]') as HTMLDivElement;
              const inputElement = fieldElement as HTMLInputElement | HTMLTextAreaElement;
              
              if (editableDiv) {
                isEmpty = !editableDiv.textContent?.trim();
              } else if (inputElement) {
                isEmpty = !inputElement.value?.trim();
              }
            }
            
            if (isEmpty) {
              emptyFields.push(field);
            }
          }
        });
        
        if (emptyFields.length > 0) {
          // Found empty fields - explain and start filling
          setChatMessages(prev => [...prev, { 
            role: 'ai', 
            content: `🔍 I found the issue! ${emptyFields.length} field${emptyFields.length > 1 ? 's are' : ' is'} still empty:\n\n${emptyFields.map((f, i) => `${i + 1}. ${f.label}`).join('\\n')}\n\nLet me fill ${emptyFields.length > 1 ? 'these fields' : 'this field'} for you...` 
          }]);
          
          // Reset to first empty field and start filling
          setTimeout(() => {
            const firstEmptyIndex = fieldsToFill.findIndex(f => 
              emptyFields.some(ef => ef.name === f.name)
            );
            
            if (firstEmptyIndex !== -1) {
              setCurrentFieldIndex(firstEmptyIndex);
              setCurrentSuggestion('');
              setIsWaitingForTestDecision(false);
              
              // Notify about the field
              if (onCurrentFieldChange) {
                onCurrentFieldChange(fieldsToFill[firstEmptyIndex].name);
              }
              
              // Start filling
              startFillingCurrentField();
            }
          }, 1000);
        } else {
          // All fields are filled but test still failed
          setChatMessages(prev => [...prev, { 
            role: 'ai', 
            content: '🤔 All fields are filled, but the test is still failing. This might be a configuration or authentication issue. Please check:\n\n1. Are your API credentials correct?\n2. Is the service/app properly connected?\n3. Are the field values in the right format?\n\nYou can try testing again or check the error details in the Test section.' 
          }]);
          
          // Close after showing the message
          setTimeout(() => {
            if (onStopFilling) onStopFilling();
          }, 3000);
        }
      }, 1500);
    }
  }, [testResult]);

  return (
    <>
      {/* Overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-black z-10"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <motion.div 
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="absolute inset-y-0 left-0 w-full bg-white border-r border-gray-200 flex flex-col z-20"
      >
        {/* Header */}
        <div className="flex items-center justify-between py-2 px-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: 'hsl(257, 74%, 57%)' }} />
            <h3 className="text-base text-gray-900">
              Filling by AI {fieldsToFill.length > 0 && `(${currentFieldIndex + 1}/${fieldsToFill.length})`}
            </h3>
            <div className="relative group/info">
              <div className="cursor-help transition-colors">
                <Info size={16} className="text-gray-400 hover:text-gray-600" />
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50 text-center leading-relaxed" style={{ width: '200px' }}>
                AI is filling your fields step by step
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto py-4 px-8 space-y-4 custom-scrollbar">
            <div className="max-w-2xl mx-auto w-full">
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
              `}</style>
              
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-8">
                  <Sparkles size={56} className="mb-4 opacity-20" style={{ color: 'hsl(257, 74%, 57%)' }} />
                  <h4 className="text-gray-700 font-medium mb-2">AI Assistant</h4>
                  <p className="text-gray-500 text-sm leading-relaxed mb-1">Starting AI field filling...</p>
                  <p className="text-gray-400 text-xs leading-relaxed">AI will think through each field and suggest values</p>
                </div>
              ) : (
                <div className="space-y-3 pb-24">
                  {chatMessages.map((message, index) => (
                    <div key={index} className={`flex gap-2 items-start ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {/* Message Bubble */}
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${ 
                        message.role === 'user' 
                          ? 'bg-gray-100 text-gray-900' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        {(() => {
                          const content = message.content;
                          
                          // Special case: Testing loading box
                          if (content === 'TESTING_LOADING') {
                            return (
                              <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center gap-3 min-w-[200px]">
                                <div className="flex gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: 'hsl(257, 74%, 57%)', animationDelay: '0ms' }}></div>
                                  <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: 'hsl(257, 74%, 57%)', animationDelay: '150ms' }}></div>
                                  <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: 'hsl(257, 74%, 57%)', animationDelay: '300ms' }}></div>
                                </div>
                                <p className="text-sm text-gray-600">Running test...</p>
                              </div>
                            );
                          }
                          
                          const suggestionIndex = content.indexOf('SUGGESTION:');
                          
                          if (suggestionIndex !== -1 && message.role === 'ai') {
                            // فصل التفكير عن الاقتراح
                            const thinking = content.substring(0, suggestionIndex).trim();
                            const suggestion = content.substring(suggestionIndex).trim();
                            
                            return (
                              <>
                                {thinking && (
                                  <p className="text-sm whitespace-pre-wrap mb-3">{renderMessageContent(thinking)}</p>
                                )}
                                <div className="space-y-1">
                                  <p className="text-xs text-gray-500 font-medium">SUGGESTION</p>
                                  <div className="bg-white border border-gray-300 rounded-lg px-3 py-2">
                                    <p className="text-sm whitespace-pre-wrap">{renderMessageContent(suggestion.replace('SUGGESTION:', '').trim())}</p>
                                  </div>
                                </div>
                              </>
                            );
                          }
                          
                          return <p className="text-sm whitespace-pre-wrap">{renderMessageContent(content)}</p>;
                        })()}
                      </div>
                      
                      {/* User Avatar */}
                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
                          <User size={16} className="text-gray-600" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Loading Indicator */}
                  {isLoading && (
                    <div className="flex gap-2 items-start justify-start">
                      <div className="px-4 py-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons - Show when we have a suggestion AND display is complete */}
                  {currentSuggestion && !isStreaming && !isLoading && isDisplayComplete && (
                    <>
                      <div className="flex gap-2 justify-start pl-2">
                        <button
                          onClick={handleApprove}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm transition-all"
                          style={{ backgroundColor: 'hsl(257, 74%, 57%)' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(257, 74%, 52%)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(257, 74%, 57%)'}
                        >
                          <Check size={16} />
                          Approve
                        </button>
                        <button
                          onClick={handleSkip}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm hover:bg-gray-300 transition-all"
                        >
                          <SkipForward size={16} />
                          Skip
                        </button>
                        <button
                          onClick={handleRegenerate}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm hover:bg-gray-300 transition-all"
                        >
                          <RotateCcw size={16} />
                          Regenerate
                        </button>
                      </div>
                      
                      {/* Chat Input Box - يظهر فقط لما الـ AI يخلص الكتابة */}
                      <div className="relative w-full px-2">
                        <textarea
                          value={userMessage}
                          onChange={(e) => setUserMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendChatMessage();
                            }
                          }}
                          placeholder="Chat with AI to refine the suggestion..."
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                          rows={2}
                        />
                        <button
                          onClick={handleSendChatMessage}
                          disabled={!userMessage.trim()}
                          className="absolute right-5 bottom-3 p-2 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ 
                            backgroundColor: userMessage.trim() ? 'hsl(257, 74%, 57%)' : '#9ca3af',
                            color: 'white'
                          }}
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </>
                  )}
                  
                  {/* Test Decision Buttons - Show after all fields are filled */}
                  {isWaitingForTestDecision && !currentSuggestion && !isLoading && !isStreaming && (
                    <div className="flex gap-2 justify-start pl-2">
                      <button
                        onClick={handleTestStep}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm transition-all"
                        style={{ backgroundColor: 'hsl(257, 74%, 57%)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(257, 74%, 52%)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(257, 74%, 57%)'}
                      >
                        🧪 Test Step
                      </button>
                      <button
                        onClick={handleIgnoreTest}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm hover:bg-gray-300 transition-all"
                      >
                        ⏭️ Ignore
                      </button>
                    </div>
                  )}
                  
                  {/* Scroll anchor */}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
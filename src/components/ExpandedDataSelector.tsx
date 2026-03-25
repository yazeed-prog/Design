import { X, ChevronDown, ChevronRight, Info, Minus, Minimize2, Database, Sparkles, Send, Plus, User, Bot, Square, Search, GripVertical } from 'lucide-react';
import { useState, ReactNode, useEffect, useRef, isValidElement, cloneElement } from 'react';
import { motion } from 'motion/react';
import { getAppIconSvg, getAppColorHex, twColorToHex } from './app-icon-registry';


interface ExpandedDataSelectorProps {
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
  initialPrompt?: string;
  onPromptUsed?: () => void;
}

export function ExpandedDataSelector({ onClose, onMinimize, onShrink, onSelectData, activeInputElement, availableSteps = [], currentFieldName = '', currentStepName = '', currentAppName = '', initialPrompt = '', onPromptUsed }: ExpandedDataSelectorProps) {
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([]);
  const [hiddenSuggestions, setHiddenSuggestions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string>('');

  // Handle initial prompt
  useEffect(() => {
    if (initialPrompt && !isLoading && !isStreaming) {
      setAiPrompt(initialPrompt);
      // Auto-send after a brief delay
      setTimeout(() => {
        if (initialPrompt) {
          handleSendMessage();
          if (onPromptUsed) {
            onPromptUsed();
          }
        }
      }, 100);
    }
  }, [initialPrompt]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isLoading]);

  const suggestions = [
    "I want to send an email...",
    "I want to save data in..."
  ];

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

  const handleSendMessage = async () => {
    if (!aiPrompt.trim()) return;
    
    const userMessage = aiPrompt.trim();
    lastUserMessageRef.current = userMessage; // Save the user message
    
    // Add user message
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setAiPrompt('');
    setIsLoading(true);
    
    // Add empty AI message that we'll update with streaming
    const aiMessageIndex = chatMessages.length + 1;
    setChatMessages(prev => [...prev, { role: 'ai', content: '' }]);
    
    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    
    try {
      // Build context for AI
      const availableFieldsContext = availableSteps.map(step => {
        const fieldsList = getFieldsList(step.fields);
        return `${step.name}: ${fieldsList.map(f => `${f.name} (${f.type})`).join(', ')}`;
      }).join('\n');
      
      const systemPrompt = `You are an AI assistant helping users build automation workflows. 

Current Context:
- User is configuring: "${currentStepName}" (${currentAppName})
- Current field: "${currentFieldName}"
- Available data from previous steps:
${availableFieldsContext}

Response Structure (IMPORTANT):
1. First, ask 1-2 brief clarifying questions if needed (optional)
2. Then provide a clear, organized answer
3. End with "Suggested fields:" on a new line
4. List each suggestion on its own line with a dash, wrapping ONLY the field name in backticks

Example Response Format:
"What type of email are you sending?

For the recipient field, you can use contact information from the previous step.

Suggested fields:
- \`email\` - The user's email address
- \`user.name\` - For personalization in the greeting"

Rules:
- Keep answers concise (3-4 sentences max before suggestions)
- ALWAYS put suggestions at the end in a bulleted list
- Wrap ONLY field names in backticks, not entire sentences
- Each suggestion should be on its own line with a dash
- Be helpful but brief`;

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
            ...chatMessages.map(msg => ({
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: msg.content
            })),
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 500,
          stream: true // Enable streaming
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
      let buffer = ''; // Buffer for incomplete chunks

      if (reader) {
        setIsLoading(false);
        setIsStreaming(true);
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          // Decode the chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });
          
          // Split by newlines but keep incomplete lines in buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep last incomplete line in buffer
          
          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue;
            
            const data = line.slice(6);
            
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              
              if (content) {
                accumulatedText += content;
                
                // Update the AI message with accumulated text
                setChatMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[aiMessageIndex] = {
                    role: 'ai',
                    content: accumulatedText
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              // Skip invalid JSON chunks silently
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // User stopped the generation
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
      if (onPromptUsed) {
        onPromptUsed();
      }
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setIsLoading(false);
    }
  };

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
            <h3 className="text-base text-gray-900">Data Selector</h3>
            <div className="relative group/info">
              <div className="cursor-help transition-colors">
                <Info size={16} className="text-gray-400 hover:text-gray-600" />
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50 text-center leading-relaxed" style={{ width: '200px' }}>
                Use data from previous steps or ask AI for help
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onShrink && (
              <button
                onClick={onShrink}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                <Minimize2 size={16} />
              </button>
            )}
            {onMinimize && (
              <button
                onClick={onMinimize}
                onMouseDown={(e) => e.preventDefault()}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                <Minus size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Split Content - Left: AI Chat, Right: Steps Data */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Side - AI Chat */}
          <div className="flex-1 flex flex-col bg-gray-50 border-r border-gray-200 relative">
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-40">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-8">
                  <Sparkles size={56} className="mb-4 opacity-20" style={{ color: 'hsl(257, 74%, 57%)' }} />
                  <h4 className="text-gray-700 font-medium mb-2">AI Assistant</h4>
                  <p className="text-gray-500 text-sm leading-relaxed mb-1">Describe what you want to achieve in your workflow</p>
                  <p className="text-gray-400 text-xs leading-relaxed">AI will suggest the best data from your previous steps</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chatMessages.map((message, index) => (
                    <div key={index} className={`flex gap-2 items-start ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {/* Message Bubble */}
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${ 
                        message.role === 'user' 
                          ? 'bg-white text-gray-900' 
                          : 'text-gray-900'
                      }`}>
                        <p className="text-sm">{renderMessageContent(message.content)}</p>
                      </div>
                      
                      {/* User Avatar - Right Side */}
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
                  
                  {/* Scroll anchor */}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* AI Prompt Input - Overlay at Bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none" style={{
              background: 'linear-gradient(to bottom, rgba(249, 250, 251, 0) 0%, rgba(249, 250, 251, 0.7) 15%, rgba(249, 250, 251, 0.95) 30%, rgba(249, 250, 251, 1) 45%)'
            }}>
              <div className="pointer-events-auto">
                <div className="relative">
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => {
                      setAiPrompt(e.target.value);
                      // Auto resize
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                    }}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                        e.preventDefault();
                        e.currentTarget.select();
                      }
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask anything"
                    className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:border-gray-400 transition-all text-sm bg-white shadow-sm overflow-hidden"
                    rows={3}
                    style={{
                      minHeight: '80px',
                      maxHeight: '200px',
                      letterSpacing: '0.3px',
                      lineHeight: '1.5'
                    }}
                  />
                  
                  {/* Send Button - Floating inside textarea */}
                  <button
                    onClick={isStreaming ? handleStopGeneration : handleSendMessage}
                    className="absolute right-3 bottom-3 p-2 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-400"
                    disabled={!isStreaming && !aiPrompt.trim()}
                    style={{
                      backgroundColor: (isStreaming || aiPrompt.trim()) ? 'hsl(257, 74%, 57%)' : '#9ca3af',
                      color: 'white'
                    }}
                    onMouseEnter={(e) => {
                      if (isStreaming || aiPrompt.trim()) {
                        e.currentTarget.style.backgroundColor = 'hsl(257, 74%, 52%)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isStreaming || aiPrompt.trim()) {
                        e.currentTarget.style.backgroundColor = 'hsl(257, 74%, 57%)';
                      }
                    }}
                  >
                    {isStreaming ? <Square size={16} fill="white" /> : <Send size={16} />}
                  </button>
                </div>

                {/* Suggested Questions - Below textarea */}
                {suggestions.filter(question => !hiddenSuggestions.has(question)).length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1.5">
                      {suggestions
                        .filter(question => !hiddenSuggestions.has(question))
                        .map((question, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setAiPrompt(question);
                              setHiddenSuggestions(prev => new Set([...prev, question]));
                            }}
                            className="px-2 py-0.5 rounded-full border border-gray-300 bg-white hover:border-purple-400 hover:bg-purple-50 transition-all whitespace-nowrap text-gray-900"
                            style={{ fontSize: '12px' }}
                          >
                            {question}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Steps Data (Always Expanded) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
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
            
            {availableSteps.length === 0 ? (
              <div className="p-12 text-center">
                <Database size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'hsl(257, 74%, 57%)' }} />
                <p className="text-gray-400">No previous steps</p>
              </div>
            ) : (
              <>
                {/* Search Bar */}
                <div className="p-3 border-b border-gray-200 sticky top-0 bg-white z-10">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search fields..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-purple-400 transition-colors"
                    />
                  </div>
                </div>

                {/* Steps List */}
                <div className="p-4 space-y-3">
                  {availableSteps
                    .map((step, stepIndex) => {
                      const fieldsList = getFieldsList(step.fields);
                      const filteredFields = searchQuery.trim()
                        ? fieldsList.filter((field) =>
                            field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            step.name.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                        : fieldsList;

                      // Don't show the step if no fields match
                      if (filteredFields.length === 0) return null;

                      return (
                        <div key={step.id} className="mb-4">
                          {/* Step Header - Simple Title */}
                          <div className="px-3 py-2 mb-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 ${step.color} rounded flex items-center justify-center shrink-0`} style={{ color: 'white' }}>
                                {isValidElement(step.icon) ? cloneElement(step.icon as React.ReactElement<any>, { size: 14 }) : <span style={{ fontSize: '10px' }}>{step.icon}</span>}
                              </div>
                              <span className="text-sm text-gray-900">
                                <span className="mr-1">{stepIndex + 1}.</span>
                                {step.name}
                              </span>
                            </div>
                          </div>

                          {/* Fields List - Simple List */}
                          <div className="space-y-0.5">
                            {filteredFields.map((field) => (
                              <button
                                key={field.name}
                                draggable
                                onDragStart={(e) => {
                                   const iconStr = typeof step.icon === 'string' ? step.icon : '⚙';
                                   const stepNum = stepIndex + 1;
                                   const tagData = JSON.stringify({
                                     type: 'step',
                                     id: step.id,
                                     stepName: step.name,
                                     stepColor: step.color,
                                     stepNumber: stepNum,
                                     stepIcon: iconStr,
                                     path: field.name,
                                     displayValue: String(field.value)
                                   });
                                   e.dataTransfer.setData('application/x-tag-data', tagData);
                                   e.dataTransfer.setData('text/plain', `${step.name}.${field.name}`);
                                   e.dataTransfer.effectAllowed = 'copyMove';

                                   // Resolve real colour and SVG icon from registry
                                   const bgHex = getAppColorHex(step.id) !== '#6b7280'
                                     ? getAppColorHex(step.id)
                                     : twColorToHex(step.color);
                                   const iconSvg = getAppIconSvg(step.id, 10);

                                   // Create a tag-like drag image
                                   const dragEl = document.createElement('span');
                                   dragEl.className = 'inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-300 text-gray-900 rounded-md whitespace-nowrap';
                                   dragEl.style.cssText = 'font-size:12px;position:fixed;top:-1000px;left:-1000px;z-index:99999;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,0.15);';

                                   dragEl.innerHTML = `<span style="width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;border-radius:3px;color:white;background:${bgHex};flex-shrink:0">${iconSvg}</span><span>${stepNum}. ${step.name}.${field.name}</span>`;
                                   document.body.appendChild(dragEl);
                                   e.dataTransfer.setDragImage(dragEl, 0, 0);
                                   requestAnimationFrame(() => document.body.removeChild(dragEl));
                                 }}
                                onClick={() => handleFieldClick(step, field.name, field.value)}
                                className="w-full flex items-center gap-1 px-2 py-2 hover:bg-purple-50 rounded-md transition-colors text-left group select-none cursor-move"
                              >
                                <span className="overflow-hidden w-0 group-hover:w-4 transition-all duration-200 ease-out shrink-0 flex items-center">
                                  <span className="text-gray-300 group-hover:text-purple-400 flex items-center">
                                    <GripVertical size={14} />
                                  </span>
                                </span>
                                <span className="text-sm group-hover:text-purple-700 shrink-0" style={{ color: 'hsl(257, 74%, 57%)' }}>
                                  {field.name}:
                                </span>
                                <span className="text-sm text-gray-500 truncate flex-1">{getValueDisplay(field.value)}</span>
                                <span 
                                  className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" 
                                  style={{ color: 'hsl(257, 74%, 57%)' }}
                                >
                                  Insert
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                    .filter(Boolean)}
                  
                  {/* No Results Message */}
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
              </>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
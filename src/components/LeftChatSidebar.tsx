import { X, Send, Sparkles, Plus, User, Square, AtSign, ArrowUp, Box, CornerDownLeft, Check, Save, Bookmark, Code, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { DataTag } from './DataTag';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { AIFillPopover, FieldToFill } from './AIFillPopover';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai' | 'step-header' | 'suggestions' | 'code' | 'code-suggestion';
  content: string;
  stepName?: string;
  stepNumber?: string;
  stepIcon?: string;
  stepColor?: string;
  stepId?: string;
  suggestions?: Suggestion[];
  quickReplies?: string[];
  fieldTag?: string;
  replyToSuggestion?: Suggestion;
  codeLanguage?: string;
  isCodeComplete?: boolean;
  newTag?: {
    name: string;
    description: string;
  };
}

interface Suggestion {
  fieldName: string;
  fieldLabel: string;
  value: string;
  messageId?: string;
  description?: string;
  example?: string;
  stepId?: string;
  stepName?: string;
  stepIcon?: string;
  stepColor?: string;
}

interface LeftChatSidebarProps {
  fieldsToFill: FieldToFill[];
  onFieldFilled: (fieldName: string, value: string) => void;
  onCurrentFieldChange?: (fieldName: string) => void;
  onStepClick?: (stepId: string) => void;
  currentStepName?: string;
  currentAppName?: string;
  currentStepNumber?: string;
  currentStepId?: string;
  currentStepIcon?: string;
  currentStepColor?: string;
  chatMessages: ChatMessage[];
  onChatMessagesChange: (messages: ChatMessage[]) => void;
  suggestions: Suggestion[];
  onSuggestionsChange: (suggestions: Suggestion[]) => void;
  showSuggestions: boolean;
  onShowSuggestionsChange: (show: boolean) => void;
  isThinking: boolean;
  onThinkingChange: (thinking: boolean) => void;
  hasNewMessage: boolean;
  onHasNewMessageChange: (hasNew: boolean) => void;
  availableSteps?: Array<{
    id: string;
    name: string;
    icon: React.ReactNode;
    color: string;
    fields: Record<string, any>;
  }>;
  isMinimized?: boolean;
  onMinimizedChange?: (minimized: boolean) => void;
}

export function LeftChatSidebar({
  fieldsToFill,
  onFieldFilled,
  onCurrentFieldChange,
  onStepClick,
  currentStepName = '',
  currentAppName = '',
  currentStepNumber = '',
  currentStepId = '',
  currentStepIcon = '',
  currentStepColor = '',
  chatMessages,
  onChatMessagesChange,
  suggestions,
  onSuggestionsChange,
  showSuggestions,
  onShowSuggestionsChange,
  isThinking,
  onThinkingChange,
  hasNewMessage,
  onHasNewMessageChange,
  availableSteps,
  isMinimized = false,
  onMinimizedChange
}: LeftChatSidebarProps) {
  // Hide sidebar when minimized
  if (isMinimized) {
    return null;
  }

  return (
    <aside className="w-[360px] bg-white border-r border-gray-200 flex shrink-0 h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        <AIFillPopover
          onClose={() => {}} // No close button needed for sidebar
          fieldsToFill={fieldsToFill}
          onFieldFilled={onFieldFilled}
          onCurrentFieldChange={onCurrentFieldChange}
          onStepClick={onStepClick}
          currentStepName={currentStepName}
          currentAppName={currentAppName}
          currentStepNumber={currentStepNumber}
          currentStepId={currentStepId}
          currentStepIcon={currentStepIcon}
          currentStepColor={currentStepColor}
          chatMessages={chatMessages}
          onChatMessagesChange={onChatMessagesChange}
          suggestions={suggestions}
          onSuggestionsChange={onSuggestionsChange}
          showSuggestions={showSuggestions}
          onShowSuggestionsChange={onShowSuggestionsChange}
          isThinking={isThinking}
          onThinkingChange={onThinkingChange}
          hasNewMessage={hasNewMessage}
          onHasNewMessageChange={onHasNewMessageChange}
          availableSteps={availableSteps}
          isMinimized={isMinimized}
          onMinimizedChange={onMinimizedChange}
        />
      </div>
    </aside>
  );
}
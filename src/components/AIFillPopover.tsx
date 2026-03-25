import { X, Send, Sparkles, Plus, User, Square, AtSign, ArrowUp, Box, CornerDownLeft, Check, Save, Bookmark, Code, Copy, ChevronDown, ChevronUp, PanelLeft, TextCursorInput, BetweenHorizontalStart, ChevronRight, Search } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { DataTag, DataTagValue } from './DataTag';
import { DataSelectorContent } from './DataSelectorContent';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { APP_FIELD_DEFINITIONS, STEP_NAME_TO_APP_MAP } from './app-field-definitions';
import { QuickStartActions } from './QuickStartActions';

// OpenAI Configuration
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY';

export interface FieldToFill {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }> | string[];
}

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
  quickReplies?: string[]; // Quick reply buttons for step selection
  quickReplySteps?: Array<{ id: string; number: string; name: string; appName: string; }>; // Step data for quick replies
  fieldTag?: string; // Field name tag for user messages
  dataTags?: DataTagValue[]; // Data tags for user messages
  replyToSuggestion?: Suggestion; // Suggestion being replied to
  codeLanguage?: string; // For code messages
  isCodeComplete?: boolean; // Track if code streaming is done
  newTag?: { // Single tag describing the code function
    name: string;
    description: string;
  };
  contextStepId?: string; // Track which step this conversation is about
}

interface AIFillPopoverProps {
  onClose: () => void;
  fieldsToFill: FieldToFill[];
  onFieldFilled: (fieldName: string, value: string, skipFocus?: boolean) => void;
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
    appId?: string; // Added appId for field definitions lookup
  }>;
  isMinimized?: boolean;
  onMinimizedChange?: (minimized: boolean) => void;
}

interface Suggestion {
  fieldName: string;
  fieldLabel: string;
  value: string;
  messageId?: string; // Track which message this suggestion belongs to
  description?: string; // Description for code-generated tags
  example?: string; // Example value for code-generated tags
  stepId?: string; // Track which step this suggestion belongs to
  stepName?: string; // Display which step this suggestion is for
  stepIcon?: string; // Step icon for display
  stepColor?: string; // Step color for display
}

export function AIFillPopover({
  onClose,
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
}: AIFillPopoverProps) {
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState<{ [key: string]: string }>({});
  const [completedMessages, setCompletedMessages] = useState<Set<string>>(new Set());
  const [isFieldsMenuOpen, setIsFieldsMenuOpen] = useState(false);
  const [selectedFieldTag, setSelectedFieldTag] = useState<string | null>(null);
  const [selectedDataTags, setSelectedDataTags] = useState<DataTagValue[]>([]); // 🎯 NEW: For data selector tags
  const [replyToSuggestion, setReplyToSuggestion] = useState<Suggestion | null>(null);
  const [showPlusTooltip, setShowPlusTooltip] = useState(false);
  const [showAtTooltip, setShowAtTooltip] = useState(false);
  const [isBoxMenuOpen, setIsBoxMenuOpen] = useState(false);
  const [isDataSelectorOpen, setIsDataSelectorOpen] = useState(false);
  const [streamingCode, setStreamingCode] = useState<{ [key: string]: string }>({});
  const [codeVisible, setCodeVisible] = useState<{ [key: string]: boolean }>({});
  const [savedSuggestions, setSavedSuggestions] = useState<Set<string>>(new Set());
  const [expandedCode, setExpandedCode] = useState<Set<string>>(new Set());
  const [shouldShowScroll, setShouldShowScroll] = useState(false); // 🎯 Track if scroll should be visible
  const [isInputFocused, setIsInputFocused] = useState(false); // 🎯 Track input focus state
  const [showResetTooltip, setShowResetTooltip] = useState(false); // Tooltip for Reset button
  const [showMinimizeTooltip, setShowMinimizeTooltip] = useState(false); // Tooltip for Minimize button
  const [resetTooltipPos, setResetTooltipPos] = useState({ top: 0, left: 0 });
  const [minimizeTooltipPos, setMinimizeTooltipPos] = useState({ top: 0, left: 0 });
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const minimizeButtonRef = useRef<HTMLButtonElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null); // 🎯 Ref for chat container
  const hasStartedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageCountRef = useRef(0);
  const chatMessagesRef = useRef(chatMessages);
  const lastStepNumberRef = useRef(currentStepNumber);
  const activeIntervalsRef = useRef<any[]>([]);
  const activeTimeoutsRef = useRef<any[]>([]);
  const hasAddedHeaderOnMountRef = useRef(false);
  const pendingStepRef = useRef<string>(''); // Track which step has pending messages
  const pendingMessageIdsRef = useRef<Set<string>>(new Set()); // Ref for cleanup
  const fieldsMenuRef = useRef<HTMLDivElement>(null);
  const boxMenuRef = useRef<HTMLDivElement>(null);
  const dataSelectorMenuRef = useRef<HTMLDivElement>(null);
  const messageRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const codeContainerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const conversationContextStepRef = useRef<string | null>(null); // Track which step the conversation is about
  const fieldsToFillRef = useRef<FieldToFill[]>(fieldsToFill); // 🔧 Ref to avoid closure issues

  // 🔧 Update fieldsToFillRef when fieldsToFill changes
  useEffect(() => {
    fieldsToFillRef.current = fieldsToFill;
    console.log('🔄 AIFillPopover: fieldsToFill prop updated:', fieldsToFill?.length || 0, 'fields');
    console.log('🔄 fieldsToFillRef.current:', fieldsToFillRef.current?.length || 0, 'fields');
  }, [fieldsToFill]);

  // Generate unique message ID
  const generateMessageId = () => {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // 🎯 Detect if AI is asking for step selection
  const detectStepSelection = (aiResponse: string): boolean => {
    return aiResponse.includes('[ASK_STEP_SELECTION]');
  };

  // 🎯 Parse user's step selection answer
  const parseStepSelection = (userAnswer: string): string | null => {
    if (!availableSteps || availableSteps.length === 0) return null;
    
    const answer = userAnswer.toLowerCase().trim();
    
    // Try to match step by index
    for (let i = 0; i < availableSteps.length; i++) {
      const stepNum = i + 1;
      // Match: "1", "step 1", "צעד 1", "الخطوة 1", "הראשון", "الأولى", "first"
      if (
        answer === String(stepNum) ||
        answer.includes(`step ${stepNum}`) ||
        answer.includes(`צעד ${stepNum}`) ||
        answer.includes(`الخطوة ${stepNum}`) ||
        // Hebrew ordinals
        (stepNum === 1 && (answer.includes('ראשון') || answer.includes('הראשון') || answer === 'first' || answer.includes('أول') || answer === '١')) ||
        (stepNum === 2 && (answer.includes('שני') || answer.includes('השני') || answer === 'second' || answer.includes('ث����ني') || answer.includes('ثان') || answer === '٢')) ||
        (stepNum === 3 && (answer.includes('שלישי') || answer.includes('השלישי') || answer === 'third' || answer.includes('ثالث') || answer === '٣'))
      ) {
        return availableSteps[i].id;
      }
    }
    
    // Try to match by step name or app name
    for (const step of availableSteps) {
      if (
        answer.includes(step.name.toLowerCase()) ||
        (step.name.toLowerCase().includes('gmail') && answer.includes('gmail')) ||
        (step.name.toLowerCase().includes('slack') && answer.includes('slack')) ||
        (step.name.toLowerCase().includes('webhook') && answer.includes('webhook'))
      ) {
        return step.id;
      }
    }
    
    return null;
  };

  // Scroll to a specific message
  const scrollToMessage = (messageId: string) => {
    const messageElement = messageRefsMap.current.get(messageId);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a brief highlight effect
      messageElement.style.backgroundColor = 'rgba(147, 51, 234, 0.1)';
      setTimeout(() => {
        messageElement.style.backgroundColor = '';
      }, 1000);
    }
  };

  // 🤖 Call OpenAI API for intelligent conversation
  const callOpenAI = async (conversationHistory: ChatMessage[], userMessage: string, fieldContext?: string, replySuggestion?: Suggestion): Promise<string> => {
    try {
      // 🔧 Use ref to get latest fieldsToFill (avoid closure issues)
      const currentFieldsToFill = fieldsToFillRef.current;
      
      console.log('🤖 callOpenAI: currentFieldsToFill count:', currentFieldsToFill?.length || 0);
      
      // 🌐 DETECT USER LANGUAGE from the message
      const detectLanguage = (text: string): string => {
        // Check for Hebrew characters (Unicode range: \u0590-\u05FF)
        const hebrewPattern = /[\u0590-\u05FF]/;
        // Check for Arabic characters (Unicode range: \u0600-\u06FF)
        const arabicPattern = /[\u0600-\u06FF]/;
        
        if (hebrewPattern.test(text)) {
          return 'Hebrew';
        } else if (arabicPattern.test(text)) {
          return 'Arabic';
        } else {
          return 'English';
        }
      };
      
      const userLanguage = detectLanguage(userMessage);
      console.log('🌐 Detected user language:', userLanguage);
      
      // Build system prompt with context
      const fieldsDescription = currentFieldsToFill.map(f => 
        `- ${f.label} (${f.name}): ${f.type}${f.required ? ' [Required]' : ''}`
      ).join('\n');
      
      // Build available data from ALL steps that have been tested
      let availableDataDescription = '';
      if (availableSteps && availableSteps.length > 0) {
        // Get ALL steps that have test results (data available)
        const stepsWithData = availableSteps.filter(step => step.fields && Object.keys(step.fields).length > 0);
        
        console.log('🔍 AI Context - Total steps in workflow:', availableSteps.length);
        console.log('🔍 AI Context - Steps with data:', stepsWithData.length);
        console.log('🔍 AI Context - All steps:', availableSteps.map((s, i) => `${i + 1}. ${s.name} (${s.id})`));
        
        if (stepsWithData.length > 0) {
          availableDataDescription = '\n\n🎯 AVAILABLE DATA IN YOUR WORKFLOW:\n\n';
          stepsWithData.forEach((step) => {
            const stepIndex = availableSteps.findIndex(s => s.id === step.id);
            const stepNumber = stepIndex + 1;
            availableDataDescription += `Step ${stepNumber} - ${step.name}:\n`;
            const flattenFields = (fields: Record<string, any>, prefix = ''): string => {
              let result = '';
              Object.entries(fields).forEach(([key, value]) => {
                const fieldPath = prefix ? `${prefix}.${key}` : key;
                if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                  result += flattenFields(value, fieldPath);
                } else {
                  const displayValue = Array.isArray(value) 
                    ? `[Array with ${value.length} items]`
                    : typeof value === 'string' && value.length > 30
                    ? `"${value.substring(0, 30)}..."`
                    : JSON.stringify(value);
                  result += `  - {{${step.name}.${fieldPath}}} = ${displayValue}\n`;
                }
              });
              return result;
            };
            availableDataDescription += flattenFields(step.fields);
            availableDataDescription += '\n';
          });
        } else {
          availableDataDescription = '\n\n⚠️ NO DATA AVAILABLE YET: Test your trigger step first to have data available for other steps.\n';
        }
      }
      
      // Build list of all available workflow steps with better context
      let allStepsDescription = '';
      if (availableSteps && availableSteps.length > 0) {
        allStepsDescription = '\n\n📋 COMPLETE WORKFLOW (ALL STEPS):\n'; // '\\n\\n📋 COMPLETE WORKFLOW (ALL STEPS):\\n';
        availableSteps.forEach((step, index) => {
          const stepNumber = index + 1;

          allStepsDescription += `- Step ${stepNumber}: ${step.name}\n`; // OLD: `- Step ${stepNumber}: ${step.name}\\n`;
        });
        allStepsDescription += `\\n\\n`;
        allStepsDescription += `\nTotal Steps: ${availableSteps.length}\n`; // OLD: `Total Steps: ${availableSteps.length}\\n`;
      }
      
      // Build fields available for each step - SIMPLIFIED
      let allStepsFieldsDescription = '';
      if (false) {
        allStepsFieldsDescription = '\\\\n\\\\n📝 FIELDS FOR EACH STEP:\\\\n';
        availableSteps.forEach((step, index) => {
          // Use appId from step object if available, fallback to id
          const appId = (step as any).appId || step.id.split('-')[0] || '';
          
          const fields = APP_FIELD_DEFINITIONS[appId];
          if (fields && fields.length > 0) {
            allStepsFieldsDescription += `\\\\nStep ${index + 1} (${step.name}):\\\\n`;
            fields.forEach(field => {
              allStepsFieldsDescription += `  - ${field.label} (${field.name}): ${field.type}${field.required ? ' [Required]' : ''}\\\\n`;
            });
          }
        });
      }
      
      const replyContext = replySuggestion 
        ? `\n\n🔄 CRITICAL: The user is modifying a previous suggestion!\n- Field: "${replySuggestion.fieldLabel}" (${replySuggestion.fieldName})\n- Current suggestion: "${replySuggestion.value}"\n- User wants to modify ONLY this specific field\n- Focus EXCLUSIVELY on this field's suggestion\n- When ready to generate, use: [GENERATE_SUGGESTIONS:${replySuggestion.fieldName}]\n- DO NOT suggest other fields unless explicitly requested\n`
        : '';
      
      const systemPrompt = `You are an AI Field Filler in an Automation Builder. Your ONLY job: FILL FIELDS, not chat.

🚨 **CORE BEHAVIOR - READ THIS FIRST:**
- User says "fill fields" / "help me" / "fill step X" → You have empty fields + data? → [GENERATE_SUGGESTIONS] IMMEDIATELY
- DON'T ask "How can I help?" or "What would you like to configure?" or "Please provide details"
- Be DIRECT: "Using {{data}} ✨ [GENERATE_SUGGESTIONS]" (max 1 sentence before action)
- ONLY ask clarifying question if step is truly unclear AND multiple steps exist
- 🚨 CRITICAL: NEVER auto-generate new suggestions without explicit user request!
- When you see "تم إدراج" or "inserted" messages, DO NOT generate new suggestions automatically
- Only generate suggestions when user explicitly asks (e.g., "fill", "suggest", "help me")

🎯 CANVAS AWARENESS:
You can see the complete automation workflow state:
- Total steps: ${availableSteps?.length || 0}${availableSteps && availableSteps.length > 0 ? '\n' + availableSteps.map((s, i) => `  Step ${i + 1}: ${s.name} (id: ${s.id})`).join('\n') : ''}
- Each step has: {id, name, type, fields schema, current config}
- For each previous step: outputs + available data tokens
- Currently selected step: ${conversationContextStepRef.current || currentStepId || 'none'}

${availableDataDescription}

🌐 **LANGUAGE RULES (CRITICAL):**
**DETECTED USER LANGUAGE: ${userLanguage}**
🚨 **YOU MUST RESPOND IN: ${userLanguage}** 🚨

- Arabic user (العربية) → Respond in Arabic ONLY
- English user → Respond in English ONLY  
- **NEVER translate technical names**: Step names, field names, data {{tags}}, app names STAY IN ENGLISH!
- Example: "عندك 3 خطوات:\n• Step 1: Catch Webhook\n• Step 2: Send Email" ✅
- WRONG: "الخطوة 1: استقبال ويب هوك" ���

🚨 **ABSOLUTE BEHAVIORAL RULES (MUST FOLLOW):**

1️⃣ **SMART APPROVAL LOGIC**
   - If request is CLEAR & SPECIFIC (step + field + value/data) → Execute IMMEDIATELY with [GENERATE_SUGGESTIONS]
   - Ask for approval ONLY if:
     • Change is irreversible (like deleting/overwriting critical data)
     • Multiple interpretations possible (ambiguous request)
     • May alter flow logic (changing conditions, adding steps)
   - Example DIRECT execution: "fill To with email" + email data exists → [GENERATE_SUGGESTIONS] immediately
   - Example NEEDS approval: "change all email addresses" → too broad, confirm first
   - **Default to ACTION, not discussion** - if clear, just do it!

2️⃣ **BE DETERMINISTIC (NO OVERTHINKING)**  
   - If request is clear + step exists + field exists + data available → execute directly
   - Don't ask unnecessary questions if everything is clear
   - Example: User says "fill To field with email" → if email data exists, execute with [GENERATE_SUGGESTIONS] immediately

3️⃣ **NO OPTIONS LISTS**
   - Don't say "Option 1/Option 2/Option 3" unless user explicitly asks
   - Give ONE concrete proposal based on context
   - Example: "I'll use {{Catch Webhook.email}} for the To field" ✅
   - WRONG: "Option 1: Use webhook email, Option 2: Enter manually" ❌

4️⃣ **EXECUTION-FOCUSED RESPONSES**
   - Keep responses SHORT (2-3 sentences max)
   - Use bullets ONLY for listing data/steps/fields
   - Focus on WHAT you'll do, not HOW or WHY
   - Show actual {{data}} tags, not descriptions
   - **NEVER ask "كيف أساعدك؟" or "How can I help?" if user's request is CLEAR**
   - Only ask clarifying questions if request is truly ambiguous

🔄 **EXECUTION FLOW:**

**PATH A: DIRECT EXECUTION (for clear requests)**
- User: "fill To with email"
- You analyze: step exists ✓, field exists ✓, data available ✓, safe change ✓
- You respond: "تمام! راح أعبي حقل To باستخدام {{Catch Webhook.email}} ✨"
- You immediately output: [GENERATE_SUGGESTIONS]
- **NO approval needed** - just think out loud + execute

**PATH B: APPROVAL NEEDED (for ambiguous/risky requests)**
- User: "change all the emails" (ambiguous - which fields? which steps?)
- You respond: "عندي عدة حقول email في خطوات مخت��فة. تبي أغيرهم كلهم ولا حقل معين؟"
- Wait for clarification
- Then execute with [GENERATE_SUGGESTIONS]

**PHASE 2: WHEN USER APPROVES (after you asked)**  
- When user approves (yes/ok/apply/تمام/نفّذ/موافق)
- Immediately output [GENERATE_SUGGESTIONS] OR [GENERATE_CODE]
- NO new discussions - just execute

📋 **SUPPORTED USER INTENTS:**

**🔍 Flow Exploration**
- "What steps?", "شو الخطوات؟" → List ALL steps with bullets
- "Explain flow", "اشرح الفلو" → Brief overview of workflow

**⚙️ Step/Field Awareness**  
- "What fields?", "شو الحقول؟" → List fields for current step
- "What data available?", "شو البيانات ��لمتاحة؟" → Show {{data}} tokens from previous steps

**✍️ Field Filling (SMART EXECUTION)**
- "Fill field X", "عبي حقل X" ��� If clear & safe, execute directly with [GENERATE_SUGGESTIONS]
- If ambiguous or risky → propose first, then execute after approval
- Example (direct): "fill To with email" → short thinking + [GENERATE_SUGGESTIONS]
- Example (needs approval): "delete all contacts" → ask first, it's destructive

**🔄 Data Transformation**
- "Extract domain", "استخرج النطاق" → Explain what you'll do → [GENERATE_CODE]
- "Combine name", "ادمج الاسم" → Show code plan → [GENERATE_CODE]

🎯 **CONTEXT MEMORY:**
- Remember last referenced step from conversation
- Remember last discussed field
- If user says "same as before" → use last referenced value
- Track approval state across messages

❌ **ERROR HANDLING:**
If something doesn't exist:
- Say exactly what's missing
- Suggest nearest valid alternative
- Example: "حقل phone غير موجود في البيانات، بس عندك email و name. تبي استخدمهم؟"

🚨 **CRITICAL FORMATTING:**
- When listing items → each bullet on NEW LINE with \n
- WRONG: "Steps: • Step 1 • Step 2" (inline)
- CORRECT: "Steps:\n• Step 1: Catch Webhook\n• Step 2: Send Email"
- Preserve ALL {{StepName.fieldName}} tags EXACTLY as shown - NO translation!
- Use **bold** for important field names and actions

🔧 **WHEN TO USE SPECIAL TAGS:**

**[GENERATE_SUGGESTIONS]** or **[GENERATE_SUGGESTIONS:fieldName]**
- When user APPROVES a fill/update proposal
- Example: User approved → You: "تمام! راح أعبي الحقول [GENERATE_SUGGESTIONS]"

**[GENERATE_CODE]**
- When user asks to transform/extract/calculate/manipulate data
- ANY data transformation = [GENERATE_CODE]
- Example: "سأكتب كود لاستخراج النطاق من {{Catch Webhook.email}} 💻 [GENERATE_CODE]"

**[ASK_STEP_SELECTION]**
- When user asks to fill fields but doesn't specify which step
- Only if multiple action steps exist
- Example: "أي خطوة تبي تشتغل عليها؟ [ASK_STEP_SELECTION]"

Examples:
✅ User in Hebrew: "מה הצעדים?" → You: "יש לך 3 צעדים בפלואו:\\n• Step 1: Catch Webhook\\n• Step 2: Send Email\\n• Step 3: Google Sheets\\n\\nאיך אני יכול לעזור?"
✅ User in Arabic: "شو الخطوات؟" → You: "عندك 3 خطوات:\\n• Step 1: Catch Webhook\\n• Step 2: Send Email\\n• Step 3: Google Sheets\\n\\nكيف بقدر ساعدك?"
✅ User in English: "What steps?" → You: "You have 3 steps:\\n• Step 1: Catch Webhook\\n• Step 2: Send Email\\n• Step 3: Google Sheets\\n\\nHow can I help?"

❌ WRONG - DO NOT DO THIS:
- User asks in Hebrew → You respond in English ❌
- User asks in Arabic → You respond in English ❌
- Translating "Catch Webhook" to "תפיסת וובהוק" or "استقبال ويب هوك" ❌

🚨 **ABSOLUTE PRIORITY RULES:**
1. **RESPOND IN: ${userLanguage}** - This is NON-NEGOTIABLE!
2. **NEVER TRANSLATE TECHNICAL NAMES**: Step names, field names, app names, {{data tags}} MUST stay EXACTLY as they appear in English!
3. USE LINE BREAKS: Put each bullet point on NEW LINE using actual \\n (not inline bullets).

Example (user asks in Arabic):
User: "شو الخطوات المتوفرة؟"
You: "عندك خطوتين في الفلو:
• Step 1: Catch Webhook
• Step 2: Send Email"

🌐 **LANGUAGE REMINDER:**
- ALWAYS respond in: **${userLanguage}**
  * Hebrew user → Hebrew response (עברית)
  * Arabic user → Arabic response (العربية)
  * English user → English response
- Technical names STAY IN ENGLISH - NO TRANSLATION!
  * Step names: "Catch Webhook" ✅ | "תפיסת וובהוק" ❌ | "استقبال ويب هوك" ❌
  * Data tags: "{{Catch Webhook.email}}" ✅ | "{{תפיסת וובהוק.אימייל}}" ❌ | "{{استقبال ويب هوك.إ��ميل}}" ❌
- These are system IDENTIFIERS, not translatable text!

${allStepsDescription}

📊 WORKFLOW STRUCTURE:
- Your workflow has ${availableSteps?.length || 0} steps in total
- Step 1 is ALWAYS the trigger (${availableSteps?.[0]?.name || 'Trigger'})
- The remaining steps are action steps (Step 2, Step 3, etc.)
- When user asks "what steps do I have?" or "show me the workflow", ALWAYS list ALL steps using bullet points
- REMEMBER: Keep step names EXACTLY as provided - NO TRANSLATION!
- CRITICAL: Respond in ${userLanguage}!
- Step names, field names, data tags are NEVER translated - copy them exactly!
- Example response (English): 
  "You have ${availableSteps?.length || 0} steps in your workflow:
  • Step 1: ${availableSteps?.[0]?.name || 'Trigger'}
  • Step 2: ${availableSteps?.[1]?.name || 'Action'}
  • Step 3: ${availableSteps?.[2]?.name || 'Action'}"
- Example response (Hebrew with English names):
  "יש לך ${availableSteps?.length || 0} צעדים בפלואו שלך:
  • Step 1: ${availableSteps?.[0]?.name || 'Trigger'}
  • Step 2: ${availableSteps?.[1]?.name || 'Action'}
  • Step 3: ${availableSteps?.[2]?.name || 'Action'}"
- Example response (Arabic with English names):
  "عندك ${availableSteps?.length || 0} خطوات في الفلو:
  • Step 1: ${availableSteps?.[0]?.name || 'Trigger'}
  • Step 2: ${availableSteps?.[1]?.name || 'Action'}
  • Step 3: ${availableSteps?.[2]?.name || 'Action'}"

🎯 UNIFIED CHAT FOR ALL STEPS:
This chat is NOT tied to a specific step - it's a unified assistant for your entire workflow!
- User MUST specify which step they want to work on
- If user mentions "fill fields", "help me", etc. WITHOUT specifying which step → Ask them which step
- Add [ASK_STEP_SELECTION] to trigger quick reply buttons
- Be smart: if they mention step number/name/app, proceed directly

Understanding step references:
- Numbers: "1", "2", "3" → Step 1, Step 2, Step 3
- Names: "Gmail", "Send Gmail", "Catch Webhook" → specific step
- Hebrew: "צעד 1", "הראשון", "השני", "השלישי" → Step 1, Step 2, Step 3
- Arabic: "الخطوة 1", "الأولى", "الثانية" → Step 1, Step 2

Examples:
✅ "Fill the To field in Gmail" → Clear, proceed in English
✅ "Help me with step 2" → Clear, proceed in English
✅ "מלא את השדה To בצעד 2" → Clear, proceed in Hebrew
✅ "עזור לי עם הצעד השני" → Clear, proceed in Hebrew
✅ "املأ حقل الموضوع في الخطوة الثانية" → Clear, proceed in Arabic
❌ "Fill the fields" → Unclear, ask which step [ASK_STEP_SELECTION] in English
❌ "תעזור לי?" → Unclear, ask which step [ASK_STEP_SELECTION] in Hebrew
❌ "ممكن تساعدني؟" → Unclear, ask which step [ASK_STEP_SELECTION] in Arabic

${availableDataDescription}${replyContext}

🎯 YOUR PRIMARY GOAL: ALWAYS PRIORITIZE USING DATA FROM AVAILABLE STEPS!

🌍 LANGUAGE DETECTION:
- **Current conversation language: ${userLanguage}**
- **RESPOND IN: ${userLanguage}**
- If user writes in Hebrew (עברית) → respond in Hebrew
- If user writes in Arabic (العربية) → respond in Arabic
- If user writes in English → respond in English
- Match the user's language throughout the entire conversation
- Examples:
  * User: "תעזור לי?" → You: "בטח! אני אנתח את הנתונים..." (Hebrew)
  * User: "ممكن تساعدني؟" → You: "بكل سرور! سأقوم بتحليل البيانات..." (Arabic)
  * User: "can you help?" → You: "Of course! I'll analyze the data..." (English)

📋 RESPONSE FORMAT & STYLE:
**Make your responses CLEAR, CONCISE, and ACTION-ORIENTED:**

🌐 **CRITICAL: PRESERVE TECHNICAL NAMES EXACTLY - NO TRANSLATION:**
   - Step names: Copy EXACTLY as shown - "Catch Webhook", "Send Email", "Google Sheets"
   - Field names: Copy EXACTLY as shown - "email", "name", "subject", "body"
   - Data tags: Copy EXACTLY as shown - {{Catch Webhook.email}}, {{Send Email.subject}}
   - App names: Copy EXACTLY as shown - "Gmail", "Slack", "Webhook"
   - **NEVER EVER translate these to Arabic or any language - they are system identifiers!**
   - Even if you respond in Arabic, these technical names MUST remain in English unchanged!
   
   ��� CORRECT (Arabic response):
   "عندك 3 خطوات:
   • Step 1: Catch Webhook
   • Step 2: Send Email
   • Step 3: Google Sheets"
   
   ❌ WRONG - DO NOT DO THIS:
   "عندك 3 خطوات:
   • الخطوة 1: استقبال ويب هوك
   • الخطوة 2: إرسال إيميل"
   
   🚨 REMINDER: Technical names are NOT meant to be translated - they are identifiers!

1. **Use Bullet Points for Important Info:**
   - When showing available data → use bullets (EACH on NEW LINE)
   - When presenting options/choices → use bullets (EACH on NEW LINE)
   - When explaining multiple steps → use bullets (EACH on NEW LINE)
   - Regular conversation → use normal text
   - Each bullet MUST be on its own line with line break before it
   
2. **Keep It Short & Focused:**
   - Maximum 2-3 sentences for regular responses
   - When showing data/options, present them directly
   - Don't repeat yourself - be efficient
   
3. **Prioritize Actionable Content:**
   - Show actual {{data}} tags, not just descriptions
   - Present clear options, not vague statements
   - Focus on "what" over "how" or "why"
   
4. **Smart Formatting Examples:**
   
   ✅ GOOD - Clear & Actionable (English):
   "I found these data fields:
   • {{Catch Webhook.email}} - recipient email
   • {{Catch Webhook.name}} - user's name
   • {{Catch Webhook.phone}} - contact number
   
   Ready to use these?"
   
   ✅ GOOD - Clear & Actionable (Arabic with English names):
   "لقيت هالبيانات:
   ��� {{Catch Webhook.email}} - إيميل المستلم
   • {{Catch Webhook.name}} - اسم المستخدم
   • {{Catch Webhook.phone}} - رقم الهاتف
   
   جاهز نستخدمهم؟"
   
   ❌ BAD - Too Wordy:
   "Great! I can see that you have some wonderful data from the previous step. I found an email field that we could use for the recipient, and there's also a name field that would be perfect for personalization. Should I go ahead and use these fields?"
   
   ✅ GOOD - Direct Options:
   "Which approach?
   • Use {{Catch Webhook.email}}
   • Enter custom email"
   
   ❌ BAD - Vague:
   "I can use the email from the webhook or you could provide your own email. What would you like?"

5. **Core Conversation Rules:**
   • ALWAYS look at the available data above first before suggesting anything
   • ALWAYS use {{StepName.fieldName}} syntax when mentioning data (copy names EXACTLY as shown - NO translation!)
   • Proactively suggest which {{}} fields would work best for the user's use case
   • Example: "I can use {{Catch Webhook.email}} for the recipient and {{Catch Webhook.name}} for personalization"
   • If NO suitable data exists in previous steps for a field, suggest plain text instead
   • Be friendly, conversational, and use emojis occasionally
   • Keep responses concise (2-3 sentences max)
   • Help users understand what data is available and how to use it
   • **Use bold formatting** (**text**) to emphasize important words, field names, or key concepts
   • Examples of when to use bold:
     - Step numbers: \"**Step 1:** Catch Webhook\"
     - Field names: \"Use **{{Catch Webhook.email}}** for the recipient\"
     - Important actions: \"**Click Insert** to add this value\"
     - Key concepts: \"You have **2 empty fields** that need values\"
   • **CRITICAL: RESPOND IN THE SAME LANGUAGE AS THE USER!**
     - If user writes in Arabic → respond in Arabic (but keep technical names EXACTLY as shown - untranslated)
     - If user writes in English → respond in English
     - Technical names = step names, field names, data tags, app names - NEVER translate these!
     - Example: User says "شو ���لخطوات؟" → You must respond in Arabic: "عندك خطوتين:\n• Step 1: Catch Webhook\n• Step 2: Send Email"

CRITICAL FORMATTING:
- When listing items with bullets, put EACH bullet on a NEW LINE
- Use actual line breaks (\n) between bullets, not inline bullets
- WRONG: "You have 2 steps: • Step 1 • Step 2" (all in one line)
- CORRECT: "You have 2 steps:\n• Step 1: Catch Webhook\n• Step 2: Send Email" (each on new line)
- When mentioning ANY field from previous steps: {{StepName.fieldName}}
- For nested fields: {{Catch Webhook.user.name}}
- If no relevant data exists for a field, use plain text: "recipient@example.com"

🔧 DATA TRANSFORMATION WITH CODE (HIGHEST PRIORITY!):
**MANDATORY**: When the user asks to TRANSFORM, MODIFY, CALCULATE, or MANIPULATE data, you MUST use [GENERATE_CODE]!

🎯 WHEN TO USE [GENERATE_CODE]:
ANY request to change, process, or calculate data from available fields:
- Extract parts: domain, username, first/last name, area code, etc.
- Format/Convert: dates, numbers, currency, text case, etc.
- Calculate: math operations, string length, array count, etc.
- Combine: concatenate fields, merge data, create full name, etc.
- Validate: check format, validate email/phone, verify data, etc.
- Filter: remove characters, clean data, trim spaces, etc.
- ANY custom logic the user describes!

Keywords (not exhaustive): split, extract, get, parse, format, convert, transform, modify, calculate, combine, merge, join, uppercase, lowercase, capitalize, remove, filter, validate, check, count, length, substring, slice, first/last, etc.
Arabic: فصل، استخرج، احسب، د��ج، حول، عدل، غير، تحقق، نظف، طول، جزء، أول، آخر، etc.

**CRITICAL RULES**:
1. Check available data FIRST - only use fields that exist!
2. If NO relevant data exists for the transformation:
   - Politely tell the user in their language:
     * Hebrew: "אין נתונים מתאימים מהצעדים הקודמים לטרנספורמציה הזו"
     * Arabic: "لا توجد بيانات مناسبة من الخطوات السابقة لهذا التحويل"
     * English: "There's no suitable data from previous steps for this transformation"
   - DO NOT use [GENERATE_CODE]
3. If relevant data EXISTS:
   - Write SHORT message (1 sentence) explaining what you'll do
   - ALWAYS ADD [GENERATE_CODE] - NO EXCEPTIONS!
   - Format: "[Your message with {{fields}}] 💻 [GENERATE_CODE]"

✅ CORRECT Examples:
- User: "extract the domain from email"
  You: "I'll write JavaScript code to extract the domain from {{Catch Webhook.email}} 💻 [GENERATE_CODE]"

- User: "calculate the total price with tax"
  You: "I'll create code to calculate total from {{Catch Webhook.price}} with 15% tax 💻 [GENERATE_CODE]"

- User: "combine first and last name"
  You: "I'll write code to combine {{Catch Webhook.firstName}} and {{Catch Webhook.lastName}} 💻 [GENERATE_CODE]"

- User: "convert date to Arabic format"
  You: "سأكتب كود لتحويل {{Catch Webhook.date}} إلى صيغة عربية ��� [GENERATE_CODE]"

- User: "חלץ את הדומיין מהאימייל"
  You: "אכתוב קוד JavaScript לחילוץ הדומיין מ-{{Catch Webhook.email}} 💻 [GENERATE_CODE]"

- User: "get the first 3 characters"
  You: "I'll create code to extract the first 3 characters from {{Catch Webhook.text}} 💻 [GENERATE_CODE]"

❌ WRONG (No relevant data):
- User: "extract phone number"
  Available data: {email: "...", name: "..."}
  You: "عذراً، لا توجد بيانات رقم هاتف في الخطوات السابقة. هل تريد إدخال رقم يدوياً؟"

🚨 REMEMBER: ANY data manipulation = Check data exists → [GENERATE_CODE]!
🚨 IMPORTANT: EVERY time user asks for transformation, generate new code - even if similar request was made before!

🚨 WHEN TO GENERATE SUGGESTIONS:
When the user has provided enough information and seems ready for you to fill in the fields, you MUST:
1. Write a SHORT thinking message (1-2 sentences) confirming what you'll do
2. Add [GENERATE_SUGGESTIONS] at the END of the same response

Signs they're ready:
- They answered your questions about the use case
- They confirmed they want help filling fields  
- They said "yes", "go ahead", "okay", "نعم", "تمام", "موافق", etc.
- They asked "can you fill it?", "what would you suggest?", "ممكن تملأ؟", etc.
- They mentioned wanting suggestions/help/filling fields
- The conversation has enough context to intelligently fill fields

CRITICAL FORMAT - Your response MUST look like this:
"[Short confirmation message] [GENERATE_SUGGESTIONS]" for ALL fields
OR
"[Short confirmation message] [GENERATE_SUGGESTIONS:fieldName]" for SPECIFIC field only

Examples:
- User: "I want to send an email notification"
  You: "Perfect! I'll use {{Catch Webhook.email}} for the recipient and {{Catch Webhook.name}} for personalization. Let me prepare the best suggestions for you! 🎯 [GENERATE_SUGGESTIONS]"

- User: "Yes, go ahead"
  You: "Great! I'm preparing intelligent suggestions based on your available data ✨ [GENERATE_SUGGESTIONS]"

- User (replying to "To" field suggestion): "use a different email"
  You: "Got it! I'll suggest a different email field for the recipient 💡 [GENERATE_SUGGESTIONS:to]"

- User (replying to "Subject" field): "make it shorter"
  You: "Perfect! I'll create a shorter subject line for you 🎯 [GENERATE_SUGGESTIONS:subject]"

- User: "כן, תמשיך"
  You: "מעולה! אני מ��ין לך את ההצעות הטובות ביותר על בסיס הנתונים הזמינים 🚀 [GENERATE_SUGGESTIONS]"

- User: "نعم تمام"
  You: "ممتاز! سأقوم بتجهيز أفضل المقترحات لك بناءً على البيانات المتاحة 🚀 [GENERATE_SUGGESTIONS]"

- User: "help me fill the fields"
  You: "Of course! Let me analyze the available data and prepare the perfect configuration for you 💡 [GENERATE_SUGGESTIONS]"

- User: "תעזור לי למלא את השדות"
  You: "בטח! אני אנתח את הנתונים הזמינים ואכין את ההגדרות המושלמות עבורך 💡 [GENERATE_SUGGESTIONS]"

- User: "ممكن تساعدني؟"
  You: "بكل سرور! سأقوم بتحليل البيانات المتاحة وتجهيز أفضل الاقتراحات 🎯 [GENERATE_SUGGESTIONS]"

DO NOT generate suggestions if:
- User is still asking questions
- User needs more clarification
- Not enough context to fill fields intelligently

🎯 REPLY TO SPECIFIC FIELD:
If the user is modifying a SPECIFIC field (you'll see the reply context above):
- DEFAULT: Use [GENERATE_SUGGESTIONS:fieldName] to suggest ONLY that field
- EXCEPTION: Use [GENERATE_SUGGESTIONS] for ALL fields if user mentions:
  * "all fields", "everything", "other fields", "rest of the fields"
  * "كل الحقول", "كله��", "باقي الحقول", "جميع الحقول"
  * "what about the others?", "fill the rest", "complete all"
  * Any phrase indicating they want suggestions for ALL fields, not just the one they replied to
- Example: User modifying "To" field says "change this" → use [GENERATE_SUGGESTIONS:to]
- Example: User modifying "To" field says "and fill the rest?" → use [GENERATE_SUGGESTIONS]

Your strategy:
1. FIRST MESSAGE: When user greets or asks for help WITHOUT specifying a step:
   - Greet them warmly
   - Tell them you're a unified assistant for the entire workflow
   - Show them how many steps they have (e.g., "You have 3 steps in your workflow")
   - List ALL steps using bullet points, EACH on NEW LINE (keep names in English!) (e.g., "Step 1: Catch Webhook, Step 2: Send Gmail, Step 3: Google Sheets")
   - Ask them which step they want to work on [ASK_STEP_SELECTION]
2. When they specify a step, show:
   - Available fields for that step (copy field names EXACTLY as shown - NO translation)
   - Available {{}} data from other steps (copy tag names EXACTLY as shown - NO translation)
   - Ask what they want to achieve
3. Answer their questions and explain the available data (copy technical names EXACTLY - NO translation)
4. When request is CLEAR (step + field + value):
   - Think out loud briefly (1 sentence)
   - Execute IMMEDIATELY with [GENERATE_SUGGESTIONS] - NO approval needed
   - Example: "تمام! راح أربط Email بـ {{Catch Webhook.email}} ✨ [GENERATE_SUGGESTIONS]"
5. When request is AMBIGUOUS or RISKY:
   - Ask for clarification or approval first
   - Then execute after user confirms
6. ALWAYS ask them to specify which step if unclear
7. REMEMBER: Step names, field names, and data tags MUST be copied EXACTLY as provided - NEVER translate them!

🚨 **DECISION MAKING LOGIC:**
1. **CLEAR REQUEST** (step + field + data exists) → Execute DIRECTLY:
   - User: "fill To with email"
   - You: "راح أستخدم {{Catch Webhook.email}} للحقل To ✨ [GENERATE_SUGGESTIONS]"
   - NO approval needed - just think + execute!

2. **AMBIGUOUS REQUEST** → Ask for clarification FIRST:
   - User: "fill all emails" (which step? which field?)
   - You: "عندي حقلين email: To و CC. تبي أعبيهم كلهم؟"
   - Wait for answer → then execute

3. **APPROVAL DETECTION** (when YOU asked first):
   - If message contains "[SYSTEM_NOTE: User approved your previous proposal]" → Execute immediately!
   - Approval keywords: yes, ok, apply, go ahead, do it, تمام, نفّذ, موافق, ماشي, روح, طبق, كمل
   - When approved → Short confirmation + [GENERATE_SUGGESTIONS] (NO more discussion!)
   - Example: User "تمام" → You: "ممتاز! راح أنفذ الآن ✨ [GENERATE_SUGGESTIONS]"

🚨 **ABSOLUTE PRIORITY RULES:**

1. **NO USELESS QUESTIONS:**
   - DON'T ask: "How can I help?", "What would you like?", "Please provide details", "How would you like to configure?"
   - If user says "fill fields" / "help me" / "fill step X" → You have empty fields? You have data? → [GENERATE_SUGGESTIONS] NOW!
   - ONLY ask if step is truly unclear AND multiple steps exist

2. **BE DIRECT:**
   - User: "i want to help me filling out the fields" → You: "Using {{data}} ✨ [GENERATE_SUGGESTIONS]"
   - User: "fill step 2" → You: "Filling Step 2 with available data [GENERATE_SUGGESTIONS]"
   - Max 1 sentence before [GENERATE_SUGGESTIONS]

3. **LANGUAGE:** ${userLanguage} (technical names stay in English)

YOU ARE A FIELD FILLER, NOT A CHATBOT. See request to fill? → GENERATE SUGGESTIONS IMMEDIATELY!`;


      // Build conversation for OpenAI
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory
          .filter(m => m.role === 'user' || m.role === 'ai')
          .map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
          })),
        { 
          role: 'user', 
          content: fieldContext 
            ? `[User is asking about the field: "${fieldContext}"]\n\n${userMessage}`
            : userMessage 
        }
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: messages,
          temperature: 0.3,  // Lower temperature = more deterministic, less chatty
          max_tokens: 150    // Shorter responses = more direct
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.log('ℹ️ OpenAI call failed, using smart fallback...', error);
      
      // 🎯 Smart fallback with variable references from available data
      if (availableSteps && availableSteps.length > 0) {
        const firstStep = availableSteps[0];
        const stepName = firstStep.name;
        
        // Build smart responses based on actual available fields
        const availableFields = Object.keys(firstStep.fields);
        const emailField = availableFields.find(f => f.toLowerCase().includes('email'));
        const nameField = availableFields.find(f => f.toLowerCase().includes('name'));
        
        const smartResponses = [];
        
        if (emailField && nameField) {
          smartResponses.push(
            `🤔 I see you have {{${stepName}.${emailField}}} and {{${stepName}.${nameField}}} from ${stepName}! Should I use these to fill the fields?`,
            `💡 Perfect! I can use {{${stepName}.${nameField}}} and {{${stepName}.${emailField}}} from your previous step. Want me to generate all suggestions?`,
            `✨ Great! I found {{${stepName}.${emailField}}} and {{${stepName}.${nameField}}} in ${stepName}. Let me prepare suggestions!`
          );
        } else if (emailField) {
          smartResponses.push(
            `🤔 I see you have {{${stepName}.${emailField}}} from ${stepName}! Should I use this for the recipient?`,
            `💡 I can use {{${stepName}.${emailField}}} from your previous step. Want me to fill in the other fields too?`
          );
        } else if (nameField) {
          smartResponses.push(
            `🤔 I see you have {{${stepName}.${nameField}}} from ${stepName}! Should I use this?`,
            `💡 I can use {{${stepName}.${nameField}}} from your previous step. Ready for suggestions?`
          );
        } else {
          // Show first 2 available fields
          const firstTwoFields = availableFields.slice(0, 2);
          smartResponses.push(
            `🤔 I see you have ${firstTwoFields.map(f => `{{${stepName}.${f}}}`).join(' and ')} from ${stepName}! Should I use these?`,
            `💡 Perfect! I can use data from ${stepName}: ${firstTwoFields.map(f => `{{${stepName}.${f}}}`).join(', ')}. Want me to generate all suggestions?`
          );
        }
        
        return getRandomItem(smartResponses);
      }
      
      // Fallback to generic responses if no steps available
      return getRandomItem(thinkingResponses);
    }
  };

  // 🧠 Generate smart field suggestions using OpenAI
  const generateAISuggestions = async (conversationHistory: ChatMessage[], specificFields?: string[]): Promise<Suggestion[]> => {
    // 🔧 Use ref to get latest fieldsToFill (avoid closure issues)
    let currentFieldsToFill = fieldsToFillRef.current;
    
    console.log('🧠 generateAISuggestions called');
    console.log('🧠 fieldsToFillRef.current:', fieldsToFillRef.current?.length || 0, 'fields');
    console.log('🧠 currentFieldsToFill:', currentFieldsToFill?.length || 0, 'fields');
    console.log('🧠 specificFields:', specificFields?.length || 0, 'fields');
    
    // 🔧 SMART FALLBACK: If no fields available, try to get them from APP_FIELD_DEFINITIONS
    if (!currentFieldsToFill || currentFieldsToFill.length === 0) {
      console.log('🔍 No fields in current ref, checking fallback sources...');
      console.log('🔍 conversationContextStepRef.current:', conversationContextStepRef.current);
      console.log('🔍 currentStepId:', currentStepId);
      console.log('🔍 availableSteps count:', availableSteps?.length || 0);
      
      // Try to get the step we're working on from conversation context
      const contextStepId = conversationContextStepRef.current || currentStepId;
      console.log('🔍 Context step ID:', contextStepId);
      
      if (contextStepId && availableSteps && availableSteps.length > 0) {
        // Find the step in availableSteps
        const step = availableSteps.find(s => s.id === contextStepId);
        console.log('🔍 Found step:', step ? `${step.name} (${step.id})` : 'null');
        
        if (step) {
          console.log('🔍 Found step object:', JSON.stringify(step, null, 2));
          
          // Try multiple ways to get appId - prioritize step.appId
          const stepAppId = (step as any).appId;
          console.log('🔍 Step name:', step.name);
          console.log('🔍 Step id:', step.id);
          console.log('🔍 Step.appId:', stepAppId);
          console.log('🔍 Available keys in APP_FIELD_DEFINITIONS:', Object.keys(APP_FIELD_DEFINITIONS));
          
          // Try to get fields using different strategies
          let fieldsFromDefinitions = null;
          
          // Strategy 1: Use step.appId directly
          if (stepAppId) {
            fieldsFromDefinitions = APP_FIELD_DEFINITIONS[stepAppId];
            console.log('🔍 Strategy 1 (step.appId): Fields from APP_FIELD_DEFINITIONS[' + stepAppId + ']:', fieldsFromDefinitions?.length || 0, 'fields');
            
            // Try lowercase version
            if (!fieldsFromDefinitions || fieldsFromDefinitions.length === 0) {
              const lowerAppId = stepAppId.toLowerCase();
              fieldsFromDefinitions = APP_FIELD_DEFINITIONS[lowerAppId];
              console.log('🔍 Strategy 1b (lowercase): Fields from APP_FIELD_DEFINITIONS[' + lowerAppId + ']:', fieldsFromDefinitions?.length || 0, 'fields');
            }
          }
          
          // Strategy 2: Match by step name (e.g., "Send Email" -> "gmail")
          if (!fieldsFromDefinitions || fieldsFromDefinitions.length === 0) {
            const stepName = step.name.toLowerCase();
            console.log('🔍 Strategy 2: Trying to match by step name:', stepName);
            
            // First try exact match in STEP_NAME_TO_APP_MAP
            const mappedAppId = STEP_NAME_TO_APP_MAP[stepName];
            if (mappedAppId) {
              fieldsFromDefinitions = APP_FIELD_DEFINITIONS[mappedAppId];
              console.log('✅ Found exact match in STEP_NAME_TO_APP_MAP:', stepName, '->', mappedAppId);
            } else {
              // Try partial match
              for (const [pattern, appId] of Object.entries(STEP_NAME_TO_APP_MAP)) {
                if (stepName.includes(pattern) || pattern.includes(stepName)) {
                  fieldsFromDefinitions = APP_FIELD_DEFINITIONS[appId];
                  console.log('✅ Found partial match in STEP_NAME_TO_APP_MAP:', stepName, '~', pattern, '->', appId);
                  break;
                }
              }
              
              // Fallback to checking APP_FIELD_DEFINITIONS keys
              if (!fieldsFromDefinitions || fieldsFromDefinitions.length === 0) {
                for (const [key, fields] of Object.entries(APP_FIELD_DEFINITIONS)) {
                  if (stepName.includes(key.toLowerCase()) || key.toLowerCase().includes(stepName)) {
                    console.log('✅ Found fields by matching step name with key:', key);
                    fieldsFromDefinitions = fields;
                    break;
                  }
                }
              }
            }
          }
          
          // Strategy 3: Try extracting from step.id (last resort)
          if (!fieldsFromDefinitions || fieldsFromDefinitions.length === 0) {
            const extractedAppId = step.id.includes('-') ? step.id.split('-')[0] : step.id;
            if (extractedAppId !== 'step' && extractedAppId !== 'trigger') {
              fieldsFromDefinitions = APP_FIELD_DEFINITIONS[extractedAppId];
              console.log('🔍 Strategy 3: Fields from step.id extraction [' + extractedAppId + ']:', fieldsFromDefinitions?.length || 0, 'fields');
            }
          }
          
          if (fieldsFromDefinitions && fieldsFromDefinitions.length > 0) {
            console.log('✅ Found', fieldsFromDefinitions.length, 'fields from APP_FIELD_DEFINITIONS');
            currentFieldsToFill = fieldsFromDefinitions;
          }
        }
      } else if (!contextStepId && availableSteps && availableSteps.length > 0) {
        // 🎯 NEW: If no contextStepId at all, try to auto-select
        console.log('🔍 No contextStepId, trying to auto-select from available steps...');
        
        // Try to select a non-trigger step
        const actionSteps = availableSteps.filter(s => s.id !== 'trigger');
        if (actionSteps.length === 1) {
          const selectedStep = actionSteps[0];
          console.log('✅ Auto-selected single action step:', selectedStep.id, selectedStep.name);
          
          // Set the conversation context
          conversationContextStepRef.current = selectedStep.id;
          
          // Get fields for this step using the same strategies as above
          const stepAppId = (selectedStep as any).appId;
          let fieldsFromDefinitions = null;
          
          if (stepAppId) {
            fieldsFromDefinitions = APP_FIELD_DEFINITIONS[stepAppId] || APP_FIELD_DEFINITIONS[stepAppId.toLowerCase()];
          }
          
          if (!fieldsFromDefinitions || fieldsFromDefinitions.length === 0) {
            const stepName = selectedStep.name.toLowerCase();
            
            // Try STEP_NAME_TO_APP_MAP first
            const mappedAppId = STEP_NAME_TO_APP_MAP[stepName];
            if (mappedAppId) {
              fieldsFromDefinitions = APP_FIELD_DEFINITIONS[mappedAppId];
              console.log('✅ Auto-select: Found match in STEP_NAME_TO_APP_MAP:', stepName, '->', mappedAppId);
            } else {
              // Try partial match
              for (const [pattern, appId] of Object.entries(STEP_NAME_TO_APP_MAP)) {
                if (stepName.includes(pattern) || pattern.includes(stepName)) {
                  fieldsFromDefinitions = APP_FIELD_DEFINITIONS[appId];
                  console.log('✅ Auto-select: Found partial match:', stepName, '~', pattern, '->', appId);
                  break;
                }
              }
              
              // Fallback
              if (!fieldsFromDefinitions || fieldsFromDefinitions.length === 0) {
                for (const [key, fields] of Object.entries(APP_FIELD_DEFINITIONS)) {
                  if (stepName.includes(key.toLowerCase()) || key.toLowerCase().includes(stepName)) {
                    fieldsFromDefinitions = fields;
                    break;
                  }
                }
              }
            }
          }
          
          if (fieldsFromDefinitions && fieldsFromDefinitions.length > 0) {
            console.log('✅ Auto-selected step has', fieldsFromDefinitions.length, 'fields');
            currentFieldsToFill = fieldsFromDefinitions;
          }
        } else {
          console.log('⚠️ Multiple action steps available, cannot auto-select:', actionSteps.map(s => s.name));
        }
      }
      
      // If still no fields, return empty array
      if (!currentFieldsToFill || currentFieldsToFill.length === 0) {
        console.log('ℹ️ No fields available to fill even after fallback.');
        console.log('🔍 Debug info:');
        console.log('   - conversationContextStepRef.current:', conversationContextStepRef.current);
        console.log('   - currentStepId:', currentStepId);
        console.log('   - availableSteps count:', availableSteps?.length || 0);
        console.log('   - availableSteps:', availableSteps?.map(s => ({ 
          id: s.id, 
          name: s.name,
          appId: (s as any).appId 
        })) || []);
        return [];
      }
    }
    
    // Filter fields if specific ones are requested (moved outside try-catch)
    const fieldsToProcess = specificFields && specificFields.length > 0
      ? currentFieldsToFill.filter(f => specificFields.includes(f.name) || specificFields.includes(f.label))
      : currentFieldsToFill;
    
    console.log('🧠 fieldsToProcess:', fieldsToProcess);
    
    try {
      const conversationContext = conversationHistory
        .filter(m => m.role === 'user' || m.role === 'ai')
        .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
        .join('\n');

      const fieldsJSON = JSON.stringify(fieldsToProcess.map(f => ({
        name: f.name,
        label: f.label,
        type: f.type,
        options: f.options
      })), null, 2);

      // Build available data context
      let availableDataContext = '';
      if (availableSteps && availableSteps.length > 0) {
        // Find current step index - use conversationContextStepRef if currentStepId is empty
        const stepIdToUse = conversationContextStepRef.current || currentStepId;
        const currentStepIndex = availableSteps.findIndex(s => s.id === stepIdToUse);
        
        console.log('🔍 [generateAISuggestions] Building available data context for step:', stepIdToUse);
        console.log('🔍 [generateAISuggestions] Current step index:', currentStepIndex);
        
        // Get only previous steps (steps before current one)
        const previousSteps = currentStepIndex > 0 ? availableSteps.slice(0, currentStepIndex) : [];
        
        if (previousSteps.length > 0) {
          availableDataContext = '\n\nAvailable data from previous steps:\n';
          previousSteps.forEach((step, index) => {
            availableDataContext += `\nStep ${index + 1} - ${step.name}:\n`;
            const flattenFields = (fields: Record<string, any>, prefix = ''): string => {
              let result = '';
              Object.entries(fields).forEach(([key, value]) => {
                const fieldPath = prefix ? `${prefix}.${key}` : key;
                if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                  result += flattenFields(value, fieldPath);
                } else {
                  const displayValue = Array.isArray(value) 
                    ? `[Array]`
                    : typeof value === 'string' && value.length > 30
                    ? `"${value.substring(0, 30)}..."`
                    : JSON.stringify(value);
                  result += `  ${step.name}.${fieldPath} = ${displayValue}\n`;
                }
              });
              return result;
            };
            availableDataContext += flattenFields(step.fields);
          });
        }
      }

      const prompt = `Based on this conversation, generate appropriate values for each field.

Conversation:
${conversationContext}

Fields to fill:
${fieldsJSON}${availableDataContext}

🎯 CRITICAL INSTRUCTIONS - READ CAREFULLY:

⚠️ **MANDATORY REQUIREMENT**: AT LEAST 90% OF YOUR SUGGESTIONS MUST USE {{}} TAGS FROM AVAILABLE DATA!

1. **PRIORITIZE DATA FROM PREVIOUS STEPS** (THIS IS YOUR PRIMARY RESOURCE):
   - Look at the "Available data from previous steps" section above
   - Use {{StepName.fieldName}} syntax whenever there's relevant data
   - Example: {{Catch Webhook.email}} or {{Catch Webhook.user.name}}
   - **CRITICAL: Copy step names and field names EXACTLY as shown - DO NOT translate them!**
   - **YOU MUST USE THESE TAGS IN AT LEAST 90% OF SUGGESTIONS**

2. **FIELD MATCHING STRATEGY**:
   - For email/recipient fields → ALWAYS use {{StepName.email}} if available
   - For name/person fields → ALWAYS use {{StepName.name}} if available
   - For title/subject fields → MUST combine text + {{StepName.field}}
   - For body/message fields → MUST combine text + {{StepName.field}}
   - For ID/reference fields → ALWAYS use {{StepName.id}} if available
   - Example: "Hello {{Catch Webhook.name}}, you have a new notification"
   - **DO NOT use plain text if ANY relevant data tag exists!**

3. **CREATIVE MATCHING** (Be flexible):
   - If exact field doesn't exist, use similar fields creatively
   - user_email, email, userEmail → all can be used for email fields
   - first_name, name, userName → all can be used for name fields
   - Combine multiple tags: "{{Step.firstName}} {{Step.lastName}}"
   - **ALWAYS PREFER A TAG OVER PLAIN TEXT**

4. **FALLBACK TO PLAIN TEXT** (ONLY AS LAST RESORT):
   - Use plain text ONLY if absolutely NO relevant data exists
   - This should be less than 10% of your suggestions
   - Example: "recipient@example.com" or "Sample Subject"

5. **BE SMART ABOUT MATCHING**:
   - Match field purpose with available data
   - Combine dynamic data with context when appropriate
   - Make it relevant to the conversation

⚠️ **CRITICAL: fieldName MUST BE EXACT**
You MUST use the EXACT "name" value from the "Fields to fill" JSON above.
For example, if the field JSON shows: { "name": "to", "label": "To", ... }
Then you MUST use "to" as the fieldName (NOT "To", NOT "email", NOT "recipient")

⚠️ **CRITICAL: PRESERVE STEP NAMES & FIELD NAMES IN {{}} TAGS**
When using {{StepName.fieldName}} tags in the "value" field:
- Copy the step name EXACTLY as it appears in the "Available data from previous steps" section
- Copy the field name EXACTLY as it appears in the available data
- DO NOT translate or modify these names in any way
- Example: If you see "Catch Webhook" → use "{{Catch Webhook.email}}" NOT "{{استقبال ويب هوك.email}}"

Return ONLY a JSON array with this exact structure:
[
  {
    "fieldName": "exact_name_from_fields_json_above",
    "value": "suggested value here"
  }
]

Example: If fields are [{"name":"to","label":"To"},{"name":"subject","label":"Subject"}]
And available data shows: "Catch Webhook.email", "Catch Webhook.name"
Then return: [{"fieldName":"to","value":"{{Catch Webhook.email}}"},{"fieldName":"subject","value":"New notification for {{Catch Webhook.name}}"}]

REMEMBER: Step names in {{}} tags must be EXACTLY as shown - NO translation!`;

      console.log('📤 Sending prompt to OpenAI for suggestions generation:', prompt);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that generates JSON only. No explanations.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content.trim();
      
      // Parse JSON response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }
      
      const suggestions = JSON.parse(jsonMatch[0]);
      
      console.log('🤖 AI Generated Suggestions:', suggestions.length, 'suggestions');
      console.log('📋 Available Fields:', currentFieldsToFill.length, 'fields');
      
      // Map to our Suggestion interface - ONLY return fields that were actually suggested
      return suggestions
        .filter((s: any) => {
          if (!s.value || s.value.trim() === '') return false;
          
          // ⚠️ VALIDATE: Check if fieldName exists in currentFieldsToFill
          const fieldExists = currentFieldsToFill.some(f => f.name === s.fieldName);
          if (!fieldExists) {
            console.log(`ℹ️ AI suggested field name "${s.fieldName}" not found. Valid names are:`, currentFieldsToFill.map(f => f.name));
            return false;
          }
          
          return true;
        })
        .map((s: any) => {
          const field = currentFieldsToFill.find(f => f.name === s.fieldName);
          return {
            fieldName: s.fieldName,
            fieldLabel: field?.label || s.fieldName,
            value: s.value
          };
        });
    } catch (error) {
      console.log('���️ Error generating AI suggestions, using fallback:', error);
      
      // 🎯 Smart fallback with tags based on field names and available data
      return fieldsToProcess.map(field => {
        let value = '';
        
        // Smart suggestions based on field name with tags from previous steps
        const fieldNameLower = field.name.toLowerCase();
        const fieldLabelLower = field.label.toLowerCase();
        
        if (fieldNameLower.includes('email') || fieldNameLower.includes('to') || fieldLabelLower.includes('recipient')) {
          // Use email from previous step if available
          const webhookStep = availableSteps?.find(s => s.name === 'Catch Webhook');
          if (webhookStep && webhookStep.fields.email) {
            value = '{{Catch Webhook.email}}';
          } else {
            value = 'recipient@example.com';
          }
        } else if (fieldNameLower.includes('subject') || fieldNameLower.includes('title')) {
          value = 'Notification: New update from {{Catch Webhook.name}}';
        } else if (fieldNameLower.includes('body') || fieldNameLower.includes('message') || fieldNameLower.includes('content')) {
          value = 'Hello {{Catch Webhook.name}},\n\nYou have a new notification.\n\nBest regards,\nThe Team';
        } else if (fieldNameLower.includes('name')) {
          const webhookStep = availableSteps?.find(s => s.name === 'Catch Webhook');
          if (webhookStep && webhookStep.fields.name) {
            value = '{{Catch Webhook.name}}';
          } else if (webhookStep && webhookStep.fields.user?.name) {
            value = '{{Catch Webhook.user.name}}';
          } else {
            value = 'John Doe';
          }
        } else if (field.type === 'select' && field.options && field.options.length > 0) {
          value = typeof field.options[0] === 'string' ? field.options[0] : field.options[0].value;
        } else {
          value = `Sample ${field.label}`;
        }
        
        return {
          fieldName: field.name,
          fieldLabel: field.label,
          value: value
        };
      });
    }
  };

  // 🧠 Generate code for data transformation using OpenAI
  const generateTransformCode = async (conversationHistory: ChatMessage[], userRequest: string): Promise<{code: string, tag: {name: string, description: string}}> => {
    try {
      const conversationContext = conversationHistory
        .filter(m => m.role === 'user' || m.role === 'ai')
        .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
        .join('\n');

      // Build available data context
      let availableDataContext = '';
      if (availableSteps && availableSteps.length > 0) {
        // Find current step index - use conversationContextStepRef if currentStepId is empty
        const stepIdToUse = conversationContextStepRef.current || currentStepId;
        const currentStepIndex = availableSteps.findIndex(s => s.id === stepIdToUse);
        
        console.log('🔍 [generateTransformCode] Building available data context for step:', stepIdToUse);
        console.log('🔍 [generateTransformCode] Current step index:', currentStepIndex);
        
        // Get only previous steps (steps before current one)
        const previousSteps = currentStepIndex > 0 ? availableSteps.slice(0, currentStepIndex) : [];
        
        if (previousSteps.length > 0) {
          availableDataContext = '\n\nAvailable data from previous steps:\n';
          previousSteps.forEach((step, index) => {
            availableDataContext += `\nStep ${index + 1} - ${step.name}:\n`;
            const flattenFields = (fields: Record<string, any>, prefix = ''): string => {
              let result = '';
              Object.entries(fields).forEach(([key, value]) => {
                const fieldPath = prefix ? `${prefix}.${key}` : key;
                if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                  result += flattenFields(value, fieldPath);
                } else {
                  const displayValue = Array.isArray(value) 
                    ? `[Array]`
                    : typeof value === 'string' && value.length > 30
                    ? `"${value.substring(0, 30)}..."`
                    : JSON.stringify(value);
                  result += `  ${step.name}.${fieldPath} = ${displayValue}\n`;
                }
              });
              return result;
            };
            availableDataContext += flattenFields(step.fields);
          });
        }
      }

      const prompt = `Based on this conversation, generate JavaScript code for the requested data transformation.

Conversation:
${conversationContext}
${availableDataContext}

User's transformation request: "${userRequest}"

🎯 YOUR TASK:
Generate COMPLEX, PRODUCTION-GRADE JavaScript code for ANY transformation the user requests. Think like a senior developer writing enterprise-level code:
- Extracting parts (domain, username, first/last name, area code, etc.)
- Formatting/Converting (dates, numbers, currency, text case, etc.)
- Calculating (math, string length, totals, percentages, etc.)
- Combining fields (concatenate, merge, join, etc.)
- Validating (check format, verify patterns, etc.)
- Filtering (remove characters, clean, trim, etc.)
- String operations (substring, slice, replace, split, etc.)
- ANY custom logic the user describes!

Generate:
1. COMPREHENSIVE JavaScript code (30-80 lines) with:
   - Multiple layers of validation (null checks, type checks, range checks)
   - Robust error handling with try-catch where appropriate
   - Helper constants and configuration objects
   - Intermediate variables with VERY descriptive names
   - Detailed comments explaining WHY, not just what
   - Multiple processing steps broken down logically
   - Edge case handling for empty strings, special characters, etc.
   - Fallback values and default handling
   - Data sanitization and cleaning steps
   - Result formatting and final processing
2. ONE tag name that describes the entire code function
3. Brief description of what the code does

🎯 TAG NAMING RULES (for the SINGLE tag):
- Name should describe the FUNCTION, not individual variables
- Split name: "splitName" not "firstName"
- Extract domain: "extractDomain" not "emailDomain"
- Calculations: "calculateTax" or "calculateTotal" not "priceWithTax"
- Combine: "combineNames" or "buildFullName" not "fullName"
- Format: "formatDate" or "convertToUppercase" not "formattedDate"
- Use camelCase, make it a verb/action when possible

EXAMPLES (Note: Generate MUCH MORE detailed code than these examples):

Example 1 - Split name with validation:
{
  "code": "// Validate input\\nif (!fullName || typeof fullName !== 'string') {\\n  throw new Error('Invalid name provided');\\n}\\n\\n// Trim whitespace\\nconst cleanedName = fullName.trim();\\n\\n// Check if name contains at least one space\\nif (!cleanedName.includes(' ')) {\\n  // If no space, treat entire name as first name\\n  const firstName = cleanedName;\\n  const lastName = '';\\n} else {\\n  // Split by space and handle multiple parts\\n  const nameParts = cleanedName.split(' ');\\n  \\n  // First part is first name\\n  const firstName = nameParts[0];\\n  \\n  // Everything else is last name\\n  const lastName = nameParts.slice(1).join(' ');\\n}\\n\\n// Capitalize first letter\\nconst capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();\\nconst capitalizedLastName = lastName ? lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase() : '';",
  "tag": {
    "name": "splitName",
    "description": "Splits full name into first and last name with validation"
  }
}

Example 2 - Extract domain:
{
  "code": "// Validate email format\\nif (!email || typeof email !== 'string') {\\n  throw new Error('Invalid email provided');\\n}\\n\\n// Trim and convert to lowercase\\nconst cleanedEmail = email.trim().toLowerCase();\\n\\n// Check if email contains @\\nif (!cleanedEmail.includes('@')) {\\n  throw new Error('Email must contain @ symbol');\\n}\\n\\n// Split email into parts\\nconst emailParts = cleanedEmail.split('@');\\n\\n// Validate we have exactly 2 parts\\nif (emailParts.length !== 2) {\\n  throw new Error('Invalid email format');\\n}\\n\\n// Extract username and domain\\nconst emailUsername = emailParts[0];\\nconst emailDomain = emailParts[1];\\n\\n// Validate domain has at least one dot\\nif (!emailDomain.includes('.')) {\\n  throw new Error('Domain must contain a dot');\\n}\\n\\n// Extract top-level domain\\nconst domainParts = emailDomain.split('.');\\nconst topLevelDomain = domainParts[domainParts.length - 1];",
  "tag": {
    "name": "extractDomain",
    "description": "Extracts and validates domain from email address"
  }
}

⚠️ CRITICAL: The above examples are MINIMUM length. Your generated code should be EVEN MORE detailed and comprehensive (30-80 lines).

Return ONLY a JSON object:
{
  "code": "// Your COMPREHENSIVE JavaScript code here (30-80 lines)\\n// Layer 1: Constants and configuration (3-5 lines)\\n// Layer 2: Input validation with multiple checks (5-8 lines)\\n// Layer 3: Error handling setup (2-3 lines)\\n// Layer 4: Data cleaning and sanitization (5-10 lines)\\n// Layer 5: Main processing logic with intermediate steps (10-20 lines)\\n// Layer 6: Edge case handling (5-10 lines)\\n// Layer 7: Result formatting and final processing (5-10 lines)\\nconst result = processData();",
  "tag": {
    "name": "functionName",
    "description": "What the code does"
  }
}

🚨🚨🚨 ABSOLUTE REQUIREMENTS - NO EXCEPTIONS:
1. MINIMUM 30 LINES of actual code (not including blank lines)
2. IDEAL LENGTH: 40-80 LINES for complex, production-ready code
3. Include AT LEAST 3-5 separate validation checks
4. Include AT LEAST 3-5 edge case handlers
5. Use AT LEAST 8-12 intermediate variables with descriptive names
6. Add AT LEAST 10-15 comment lines explaining the logic
7. Break the operation into AT LEAST 5-7 distinct processing steps
8. Add configuration constants at the beginning (e.g., patterns, limits, defaults)
9. Think of EVERY possible way the input could be malformed
10. Write code as if it will handle millions of records in production

DO NOT BE LAZY. DO NOT write 5-10 line code. ALWAYS write thorough, professional code.
Even for "simple" operations, add comprehensive validation, error handling, and edge cases.

IMPORTANT:
- Support ANY transformation the user requests, not just the examples above
- Write COMPREHENSIVE, PRODUCTION-GRADE JavaScript like a senior developer
- Think ENTERPRISE-LEVEL: scalability, maintainability, robustness
- Break down complex operations into 7-10 separate logical steps
- Use VERY DESCRIPTIVE variable names (e.g., 'sanitizedAndTrimmedEmailAddress' not just 'email')
- Add detailed comments explaining the WHY behind decisions, not just WHAT the code does
- Match the user's language in descriptions (Arabic or English)
- ALWAYS aim for 40-80 lines of well-structured, thoroughly validated code
- Tag names must be clear and self-documenting
- Be creative with transformations: calculations, string operations, formatting, etc.
- Think deeply about edge cases: null, undefined, empty strings, special characters, unicode, very long inputs, malformed data, etc.
- Add configuration objects and constants for magic numbers
- Consider performance implications and add optimizations where relevant
- Write defensive code that assumes input data could be anything`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a code generation assistant. Return only JSON, no explanations.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content.trim();
      console.log('🤖 Raw OpenAI response:', aiResponse);
      
      // Parse JSON response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const result = JSON.parse(jsonMatch[0]);
      console.log('🔍 Parsed result:', result);
      console.log('📝 Code content:', result.code);
      console.log('🏷️ Tag:', result.tag);
      return result;
    } catch (error) {
      console.log('ℹ️ Error generating transformation code:', error);
      
      // Fallback example
      return {
        code: '// Split full name into first and last name\nconst fullName = "{{Catch Webhook.name}}";\nconst nameParts = fullName.split(\' \');\nconst firstName = nameParts[0];\nconst lastName = nameParts.slice(1).join(\' \');',
        tag: {
          name: 'splitName',
          description: 'Splits full name into first and last name'
        }
      };
    }
  };

  // 🎲 Varied AI responses for natural conversation
  const greetings = [
    `👋 Hi there! I'm here to help you fill in the fields for the "${currentStepName}" step.\n\nLet me understand the context first - what's the goal of this step?`,
    `Hello! 👋 I'll help you configure the "${currentStepName}" step.\n\nBefore we start, tell me - what do you want to achieve with this step?`,
    `Welcome! 🙌 Let me help you set up "${currentStepName}".\n\nLet's begin - what scenario are you working on?`,
    `Hey! ✨ I'm here to make filling in "${currentStepName}" fields easier.\n\nFirst, tell me - what use case are you trying to implement?`
  ];

  const stepChangeGreetings = [
    `👋 You're now in the "${currentStepName}" step.\n\nHow can I help you fill in the fields for this step?`,
    `Switched to "${currentStepName}" 🎯\n\nWhat do you need to accomplish in this step?`,
    `Great! Now in "${currentStepName}" ✨\n\nLet me help - what's your goal for this step?`,
    `We've reached "${currentStepName}" 🚀\n\nTell me, what do you want to achieve here?`
  ];

  const thinkingResponses = [
    '🤔 Got it... let me think about the best way to fill in the fields based on what you told me.',
    '💭 Clear! Let me see how I can apply this to the required fields.',
    '✨ Alright... I\'ll analyze what you said and prepare the appropriate fields.',
    '🎯 Excellent! Let me think about the best configuration based on this information.',
    '🧠 I understand, I\'ll prepare the ideal settings for you.'
  ];

  const firstQuestions = [
    'Perfect! Now, are there any specific details you want to include in the fields? For example:\n\n• Who will receive the message?\n• What is the main content?\n• Is there data from previous steps you want to use?',
    'Great! Let me ask you about some details:\n\n• Do you want to use data from a previous step?\n• What basic information do you need?\n• Are there any special conditions or cases?',
    'Okay! To help you better:\n\n• Who are the recipients or target audience?\n• What data do you want to send or process?\n• Do you need to link data from previous steps?',
    'Good! Let me understand more:\n\n• What data is required in this step?\n• Do you want to use variables from previous steps?\n• Is there a specific format you prefer?'
  ];

  const secondQuestions = [
    'Awesome! One last thing - do you want to add any dynamic variables from previous steps?',
    'Excellent! Final question - are there any special conditions or cases to consider?',
    'Perfect! And finally - do you need any special formatting or additional settings?',
    'Very good! Last thing - do you want to automatically link any data from previous steps?',
    'Ideal! Are there any additional details or exceptions I should know about?'
  ];

  const getRandomItem = (array: string[]) => {
    return array[Math.floor(Math.random() * array.length)];
  };

  // 🎯 Generate contextual quick replies based on AI message content
  const generateContextualQuickReplies = (params: {
    aiMessage: string;
    availableSteps: Array<{ name: string; fields: Record<string, any> }>;
    fieldsToFill: Array<{ name: string; label: string }>;
    conversationHistory: ChatMessage[];
  }): string[] => {
    const { aiMessage, availableSteps, fieldsToFill, conversationHistory } = params;
    
    // Detect language
    const detectLanguage = (text: string): string => {
      const hebrewPattern = /[\u0590-\u05FF]/;
      const arabicPattern = /[\u0600-\u06FF]/;
      
      if (hebrewPattern.test(text)) {
        return 'Hebrew';
      } else if (arabicPattern.test(text)) {
        return 'Arabic';
      } else {
        return 'English';
      }
    };
    
    const language = detectLanguage(aiMessage);
    const replies: string[] = [];
    
    // Check context patterns
    const hasAvailableData = availableSteps.some(step => Object.keys(step.fields).length > 0);
    const hasEmptyFields = fieldsToFill.length > 0;
    const mentionsData = /\{\{.*?\}\}/g.test(aiMessage);
    const isQuestion = /\?/.test(aiMessage);
    const mentionsUse = /(use|استخدم|استعمل|להשתמש)/i.test(aiMessage);
    const mentionsFill = /(fill|املأ|عبي|למלא)/i.test(aiMessage);
    const mentionsReady = /(ready|جاهز|מוכ��)/i.test(aiMessage);
    const mentionsWhich = /(which|أي|איזה|وين)/i.test(aiMessage);
    const mentionsHow = /(how|كيف|איך)/i.test(aiMessage);
    
    // Pattern 1: AI is suggesting to use data
    if ((mentionsData && mentionsUse) || (mentionsData && isQuestion)) {
      if (language === 'Arabic') {
        replies.push('نعم، استخدم هذه البيانات');
        replies.push('لا، بدي أدخل يدوي');
      } else if (language === 'Hebrew') {
        replies.push('כן, השתמש בנתונים האלה');
        replies.push('לא, אני רוצה להזין ידנית');
      } else {
        replies.push('Yes, use this data');
        replies.push('No, I\'ll enter manually');
      }
    }
    // Pattern 2: AI is asking if ready to fill
    else if (mentionsReady || mentionsFill) {
      if (language === 'Arabic') {
        replies.push('نعم، املأ كل الحقول');
        if (hasEmptyFields) {
          replies.push('املأ الحقول الفارغة فقط');
        }
        replies.push('اشرحلي البيانات المتاحة');
      } else if (language === 'Hebrew') {
        replies.push('כן, מלא את כל השדות');
        if (hasEmptyFields) {
          replies.push('מלא רק שדות ריקים');
        }
        replies.push('הסבר לי על הנתונים הזמינים');
      } else {
        replies.push('Yes, fill all fields');
        if (hasEmptyFields) {
          replies.push('Fill empty fields only');
        }
        replies.push('Explain available data');
      }
    }
    // Pattern 3: AI is asking "which" or "what"
    else if (mentionsWhich) {
      if (availableSteps.length > 0) {
        // Suggest first step
        const firstStep = availableSteps[0];
        if (language === 'Arabic') {
          replies.push(`${firstStep.name}`);
          if (availableSteps.length > 1) {
            replies.push('اعرضلي كل الخطوات');
          }
        } else if (language === 'Hebrew') {
          replies.push(`${firstStep.name}`);
          if (availableSteps.length > 1) {
            replies.push('הצג לי את כל השלבים');
          }
        } else {
          replies.push(`${firstStep.name}`);
          if (availableSteps.length > 1) {
            replies.push('Show me all steps');
          }
        }
      } else {
        // No steps available - provide generic answer
        if (language === 'Arabic') {
          replies.push('املأ تلقائياً');
          replies.push('اشرحلي أكثر');
        } else if (language === 'Hebrew') {
          replies.push('מלא אוטומטית');
          replies.push('הסבר יותר');
        } else {
          replies.push('Fill automatically');
          replies.push('Explain more');
        }
      }
    }
    // Pattern 4: AI is asking "how"
    else if (mentionsHow) {
      if (language === 'Arabic') {
        replies.push('املأ تلقائياً');
        replies.push('اشرحل�� أكثر');
      } else if (language === 'Hebrew') {
        replies.push('��לא אוטומטית');
        replies.push('הסבר לי יותר');
      } else {
        replies.push('Fill automatically');
        replies.push('Explain more');
      }
    }
    // Pattern 5: Generic question or explanation
    else if (isQuestion) {
      if (language === 'Arabic') {
        replies.push('نعم');
        replies.push('لا');
        if (hasAvailableData) {
          replies.push('وضحلي البيانات');
        }
      } else if (language === 'Hebrew') {
        replies.push('כן');
        replies.push('לא');
        if (hasAvailableData) {
          replies.push('הסבר את הנתונים');
        }
      } else {
        replies.push('Yes');
        replies.push('No');
        if (hasAvailableData) {
          replies.push('Explain the data');
        }
      }
    }
    // Pattern 6: AI made a statement (no question)
    else {
      if (hasAvailableData && hasEmptyFields) {
        if (language === 'Arabic') {
          replies.push('املأ الحقول الآن');
          replies.push('شو البيانات المتاحة؟');
        } else if (language === 'Hebrew') {
          replies.push('מלא את השדות עכשיו');
          replies.push('מה הנתונים הזמינים?');
        } else {
          replies.push('Fill the fields now');
          replies.push('What data is available?');
        }
      } else {
        // Fallback: Generic helpful suggestions
        if (language === 'Arabic') {
          replies.push('كمل');
          replies.push('وضحلي أكثر');
        } else if (language === 'Hebrew') {
          replies.push('המשך');
          replies.push('הסבר יותר');
        } else {
          replies.push('Continue');
          replies.push('Explain more');
        }
      }
    }
    
    // 🎯 Ensure we always have at least 1 suggestion
    if (replies.length === 0) {
      if (language === 'Arabic') {
        replies.push('املأ الحقول تلقائياً');
        replies.push('اشرحلي البيانات المتاحة');
      } else if (language === 'Hebrew') {
        replies.push('מלא אוטומטית');
        replies.push('הסבר את הנתונים');
      } else {
        replies.push('Fill automatically');
        replies.push('Explain available data');
      }
    }
    
    // Limit to 3 suggestions maximum
    return replies.slice(0, 3);
  };

  // 🎯 Generate dynamic quick replies based on context
  const generateDynamicQuickReplies = (params: {
    stepName: string;
    appName: string;
    availableSteps: Array<{ name: string; fields: Record<string, any> }>;
    language?: string;
    messageContent?: string;
  }): string[] => {
    const { stepName, appName, availableSteps, messageContent = '' } = params;
    
    // Auto-detect language from message content if not provided
    const detectLanguage = (text: string): string => {
      const hebrewPattern = /[\u0590-\u05FF]/;
      const arabicPattern = /[\u0600-\u06FF]/;
      
      if (hebrewPattern.test(text)) {
        return 'Hebrew';
      } else if (arabicPattern.test(text)) {
        return 'Arabic';
      } else {
        return 'English';
      }
    };
    
    const language = params.language || detectLanguage(messageContent || stepName);
    
    // Get available data types
    const hasEmail = availableSteps.some(step => 
      Object.keys(step.fields).some(field => field.toLowerCase().includes('email'))
    );
    const hasName = availableSteps.some(step => 
      Object.keys(step.fields).some(field => field.toLowerCase().includes('name'))
    );
    const hasId = availableSteps.some(step => 
      Object.keys(step.fields).some(field => field.toLowerCase().includes('id'))
    );
    const hasDate = availableSteps.some(step => 
      Object.keys(step.fields).some(field => field.toLowerCase().includes('date') || field.toLowerCase().includes('time'))
    );
    
    // Common scenarios based on app name
    const appScenarios: Record<string, { ar: string[]; en: string[]; he: string[] }> = {
      'gmail': {
        ar: [
          'أرسل بريد إلكتروني بالبيانات المتاحة 📧',
          'استخدم {{email}} من الخطوة السابقة',
          'ما الغرض من هذه الخطوة؟ 💡',
          'اقترح قيم للحقول الفارغة ✨'
        ],
        en: [
          'Send email with available data 📧',
          'Use {{email}} from previous step',
          'What\'s the purpose of this step? 💡',
          'Suggest values for empty fields ✨'
        ],
        he: [
          'שלח מייל עם הנתונים הזמינים 📧',
          'השתמש ב-{{email}} מהשלב הקודם',
          'מה המטרה של השלב הזה? 💡',
          'הצע ערכים לשדות ריקים ✨'
        ]
      },
      'slack': {
        ar: [
          'أرسل رسالة باستخدام البيانات المتاحة 💬',
          'استخدم البيانات من الخطوة السابقة',
          'كيف أنسق الرسالة؟ 📝',
          'اقترح محتوى للرسالة ✨'
        ],
        en: [
          'Send message with available data 💬',
          'Use data from previous step',
          'How do I format the message? 📝',
          'Suggest message content ✨'
        ],
        he: [
          'שלח הודעה עם נתונים זמינים 💬',
          'השתמש בנתונים מהשלב הקודם',
          'איך לעצב את ההודעה? 📝',
          'הצע תוכן להודעה ✨'
        ]
      },
      'sheets': {
        ar: [
          'أض�� صف بالبيانات المتاحة 📊',
          'استخدم جميع الحقول من الخطوة السابقة',
          'كيف أنظم البيانات؟ 🗂️',
          'اقترح تنسيق ل��جدول ✨'
        ],
        en: [
          'Add row with available data 📊',
          'Use all fields from previous step',
          'How do I organize the data? 🗂️',
          'Suggest table format ✨'
        ],
        he: [
          'הוסף שורה עם נתונים זמינים 📊',
          'השתמש בכל השדות מהשלב הקודם',
          'איך לארגן את הנתונים? 🗂️',
          'הצע פורמט לטבלה ✨'
        ]
      },
      'http': {
        ar: [
          'أرسل طلب HTTP بالبيانات 🌐',
          'استخدم البيانات كـ JSON payload',
          'كيف أنسق الطلب؟ 📡',
          'اقترح بنية للبيانات ✨'
        ],
        en: [
          'Send HTTP request with data 🌐',
          'Use data as JSON payload',
          'How do I format the request? 📡',
          'Suggest data structure ✨'
        ],
        he: [
          'שלח בקשת HTTP עם נתונים 🌐',
          'השתמש בנתונים ��תור JSON payload',
          'איך לעצב את הבקשה? 📡',
          'הצע מבנה נתונים ✨'
        ]
      },
      'notion': {
        ar: [
          'أنشئ صفحة جديدة بالبيانات المتاحة 📝',
          'استخدم جميع الحقول في الصفحة',
          'كيف أنظم المحتوى؟ 📋',
          'اقترح بنية للصفحة ✨'
        ],
        en: [
          'Create new page with available data 📝',
          'Use all fields in the page',
          'How do I organize the content? 📋',
          'Suggest page structure ✨'
        ],
        he: [
          'צ��ר דף חדש עם נתונים זמינים 📝',
          'השתמש בכל השדות בדף',
          'איך לארגן את התוכן? 📋',
          'הצע מבנה דף ✨'
        ]
      },
      'calendar': {
        ar: [
          'أنشئ حدث بالتاريخ والبيانات المتاحة 📅',
          'استخدم حقل التاريخ من الخطوة السابقة',
          'كيف أحدد موعد الحدث؟ ⏰',
          'اقترح تفاصيل الحدث ✨'
        ],
        en: [
          'Create event with date and available data 📅',
          'Use date field from previous step',
          'How do I set the event time? ⏰',
          'Suggest event details ✨'
        ],
        he: [
          'צור אירוע עם תאריך ונתונים זמינים 📅',
          'השתמש בשדה התאריך מהשלב הקודם',
          'איך לקבוע את זמן האירוע? ⏰',
          'הצע פרטי אירוע ✨'
        ]
      },
      'trello': {
        ar: [
          'أنشئ بطاقة بالبيانات المتاحة 📋',
          'استخدم العنوان والوصف من الخطوة السابقة',
          'كيف أنظم البطاقات؟ 🗂️',
          'اقترح محتوى البطاقة ✨'
        ],
        en: [
          'Create card with available data 📋',
          'Use title and description from previous step',
          'How do I organize the cards? 🗂️',
          'Suggest card content ✨'
        ],
        he: [
          'צור כרטיס עם נתונים זמינים 📋',
          'השתמש בכותרת ותיאור מהשלב הקודם',
          'איך לארגן את הכרטיסים? 🗂️',
          'הצע תוכן כרטיס ✨'
        ]
      },
      'discord': {
        ar: [
          'أرسل رسالة Discord بالبيانات 💬',
          'استخدم الب��انات من الخطوة السابقة',
          'كيف أنسق الرسالة؟ 📝',
          'اقترح محتوى الرسالة ✨'
        ],
        en: [
          'Send Discord message with data 💬',
          'Use data from previous step',
          'How do I format the message? 📝',
          'Suggest message content ✨'
        ],
        he: [
          'שלח הודעת Discord עם נתונים 💬',
          'השתמש בנתונים מהשלב הקודם',
          'איך לעצב את ההודעה? 📝',
          'הצ�� תוכן הודעה ✨'
        ]
      },
      'airtable': {
        ar: [
          'أضف سجل جديد بالبيانات المتاحة 🗄���',
          'استخدم جميع الحقول المطابقة',
          'كيف أربط الحقول؟ 🔗',
          'اقترح تنظيم البيانات ✨'
        ],
        en: [
          'Add new record with available data 🗄️',
          'Use all matching fields',
          'How do I map the fields? ��',
          'Suggest data organization ✨'
        ],
        he: [
          'הוסף ��שומה חדשה עם נת��נים זמינים 🗄️',
          'השתמש בכל ��שדות התואמים',
          'איך למפות את השדות? 🔗',
          'הצע ארגו�� נתונים ✨'
        ]
      },
      'asana': {
        ar: [
          'أنشئ مهمة جديدة ��البيانات المتاحة ✅',
          'استخدم العنوان والوصف من الخطوة السابقة',
          'كي�� أحدد الأولوية والتاريخ؟ 📅',
          'اقتر�� تفاصيل المهمة ✨'
        ],
        en: [
          'Create new task with available data ✅',
          'Use title and description from previous step',
          'How do I set priority and date? 📅',
          'Suggest task details ✨'
        ],
        he: [
          'צור משימה ח��שה עם נתונים זמינים ✅',
          'השתמש בכותרת ותיאור מהשלב הקודם',
          'איך לקבוע עדיפות ותא��יך? 📅',
          'הצע פרטי משימה ✨'
        ]
      },
      'jira': {
        ar: [
          'أنشئ issue جديد بالبيانات 🎫',
          'استخدم الملخص والوصف من الخطوة السابقة',
          'كيف أحدد نوع ال issue؟ 🏷️',
          'اقترح محتوى التذكرة ✨'
        ],
        en: [
          'Create new issue with data 🎫',
          'Use summary and description from previous step',
          'How do I set the issue type? 🏷️',
          'Suggest issue content ✨'
        ],
        he: [
          'צור issue חדש עם נתונים 🎫',
          'השתמש בסיכום ותיאור מהשלב הקודם',
          'איך לקבוע את סוג ה-issue? 🏷️',
          'הצע תוכן כרטיס ✨'
        ]
      },
      'hubspot': {
        ar: [
          'أنشئ جهة اتصال أو صفقة جديدة 🤝',
          'استخدم البريد الإلكتروني والاسم المتاحين',
          'كيف أملأ حقول CRM؟ 📊',
          'اقترح تنظيم البيانات ✨'
        ],
        en: [
          'Create new contact or deal 🤝',
          'Use available email and name',
          'How do I fill CRM fields? 📊',
          'Suggest data organization ✨'
        ],
        he: [
          'צור איש קשר או עסקה חדש�� 🤝',
          'השתמש באימייל ושם זמינים',
          'איך למלא שדות CRM? 📊',
          'הצע ארגון נתונים ✨'
        ]
      },
      'salesforce': {
        ar: [
          'أنشئ Lead أو Contact جديد 💼',
          'استخدم بيانات العميل المتاحة',
          'كيف أربط الحقول؟ 🔗',
          'اقترح تعيين الحقول ✨'
        ],
        en: [
          'Create new Lead or Contact 💼',
          'Use available customer data',
          'How do I map the fields? 🔗',
          'Suggest field mapping ✨'
        ],
        he: [
          'צור Lead או Contact חדש 💼',
          'השתמש בנתוני לקוח זמינים',
          'איך למפות את השדות? 🔗',
          'ה��ע מיפוי שדות ✨'
        ]
      },
      'mailchimp': {
        ar: [
          'أضف مشترك جديد بالبيانات 📬',
          'استخدم البريد الإلكتروني والاسم',
          'كيف أحدد القائمة والعلامات؟ 🏷️',
          'اقترح تنظيم المشتركين ✨'
        ],
        en: [
          'Add new subscriber with data 📬',
          'Use email and name',
          'How do I set list and tags? 🏷️',
          'Suggest subscriber organization ✨'
        ],
        he: [
          'הוסף מנוי חדש עם נתונים 📬',
          'השתמש באימייל ושם',
          'איך לקבוע רשימה ות��יות? 🏷️',
          '��צע ארגון מנויים ✨'
        ]
      },
      'zendesk': {
        ar: [
          'أنشئ تذكرة دعم جديدة 🎫',
          'استخدم البريد الإلكتروني والموضوع',
          'كيف أحدد الأولوية والنوع؟ 🎯',
          'اقترح محتوى التذكرة ✨'
        ],
        en: [
          'Create new support ticket 🎫',
          'Use email and subject',
          'How do I set priority and type? 🎯',
          'Suggest ticket content ✨'
        ],
        he: [
          'צור פנייה חדשה לתמיכה 🎫',
          'השת��ש באימייל ונושא',
          'איך לקבוע עדיפות וסוג? 🎯',
          'הצע תוכן פנייה ✨'
        ]
      },
      'stripe': {
        ar: [
          'أنشئ عميل أو دفعة جديدة 💳',
          'استخدم البريد الإلكتروني والمبلغ',
          'كيف أحدد تفاصيل الدفع؟ 💰',
          'اقترح إعداد الفوترة ✨'
        ],
        en: [
          'Create new customer or payment 💳',
          'Use email and amount',
          'How do I set payment details? 💰',
          'Suggest billing setup ✨'
        ],
        he: [
          'צור לקוח או תשלום חדש 💳',
          'השתמש באימייל וסכום',
          'איך לקבוע פרטי תשלום? 💰',
          'הצע הגדרת חיוב ✨'
        ]
      },
      'shopify': {
        ar: [
          'أنشئ طلب أو منتج جديد ��️',
          'استخدم بيا��ات العميل والمنتج',
          'كيف أحدد المخزون والسعر؟ 💵',
          'اقترح تنظيم الطلب ✨'
        ],
        en: [
          'Create new order or product 🛍️',
          'Use customer and product data',
          'How do I set inventory and price? 💵',
          'Suggest order organization ✨'
        ],
        he: [
          'צור הזמנה או מוצר חדש 🛍️',
          'השתמש בנתוני לקוח ומוצר',
          'איך לקבוע מלאי ומחיר? 💵',
          'הצע ארגון הזמנה ✨'
        ]
      },
      'twilio': {
        ar: [
          'أرسل رسالة SMS بالبيانات 📱',
          'استخدم رقم الهاتف والرسالة',
          'كيف أنسق محتوى الرسالة؟ 💬',
          'اقترح نص الرسالة ✨'
        ],
        en: [
          'Send SMS message with data 📱',
          'Use phone number and message',
          'How do I format message content? 💬',
          'Suggest message text ✨'
        ],
        he: [
          'שלח הודעת SMS עם נתונים 📱',
          'השתמש במספר טלפון והודעה',
          'איך לעצב את תוכן ההודעה? 💬',
          'הצע טקסט הודעה ✨'
        ]
      },
      'dropbox': {
        ar: [
          'ارفع ملف بالبيانات المتاحة 📦',
          'استخدم المحتوى من الخطوة السابقة',
          'كيف أحدد المسار والاسم؟ 📁',
          'اقترح بنية المجلدات ✨'
        ],
        en: [
          'Upload file with available data 📦',
          'Use content from previous step',
          'How do I set path and name? 📁',
          'Suggest folder structure ✨'
        ],
        he: [
          'העלה קובץ עם נתונים זמינים 📦',
          'השתמש בתוכן מהשלב הקוד��',
          'איך לקבוע נתיב ושם? ���',
          'הצע מבנה תיקיות ✨'
        ]
      },
      'drive': {
        ar: [
          'أنشئ ملف أو مجلد جديد 📁',
          'استخدم المحتوى من الخطوة السابقة',
          'كيف أنظم الملف��ت؟ 🗂️',
          'اقترح بنية التخزين ✨'
        ],
        en: [
          'Create new file or folder 📁',
          'Use content from previous step',
          'How do I organize files? 🗂️',
          'Suggest storage structure ✨'
        ],
        he: [
          'צור קובץ או תיקייה חדשה 📁',
          'השתמש בתוכן מהשלב הק��דם',
          'איך לארגן קבצים? 🗂️',
          'הצע מבנה אחסון ✨'
        ]
      },
      'onedrive': {
        ar: [
          'ارفع ملف إلى OneDrive 📂',
          'استخ��م البيانات من الخطوة السابقة',
          'كيف أحدد المجلد والاسم؟ 📝',
          'اقترح تنظيم ا��ملفات ✨'
        ],
        en: [
          'Upload file to OneDrive 📂',
          'Use data from previous step',
          'How do I set folder and name? 📝',
          'Suggest file organization ✨'
        ],
        he: [
          'העלה קובץ ל-OneDrive 📂',
          'השתמש בנתונים מהשלב הקודם',
          'איך לקבוע תיקייה ושם? 📝',
          'הצע ארגון קבצים ✨'
        ]
      },
      'webhook': {
        ar: [
          'استقبل البيانات من الطلب 🔔',
          'ما البيانات المتوقعة؟ 📊',
          'كيف أختبر ال webhook؟ 🧪',
          'أرني البيانات المتاحة ✨'
        ],
        en: [
          'Receive data from request 🔔',
          'What data to expect? 📊',
          'How do I test the webhook? 🧪',
          'Show me available data ✨'
        ],
        he: [
          'קבל נתונים מהבקשה 🔔',
          'איזה נתונים לצפות? 📊',
          'איך לבדוק את ה-webhook? 🧪',
          'הראה לי נתונים זמינים ✨'
        ]
      },
      'github': {
        ar: [
          'أنشئ issue أو PR جديد 🐙',
          'استخدم العنوان والوصف',
          'كيف أحدد المستودع؟ 📚',
          'اقترح محتوى ال issue ✨'
        ],
        en: [
          'Create new issue or PR 🐙',
          'Use title and description',
          'How do I set the repository? 📚',
          'Suggest issue content ✨'
        ],
        he: [
          'צור issue ��ו PR חדש 🐙',
          'השתמש בכותרת ותיאור',
          'איך לקבוע את המאגר? 📚',
          'הצע תוכן issue ✨'
        ]
      },
      'gitlab': {
        ar: [
          'أنشئ issue أو merge request 🦊',
          'استخدم البيانات المت��حة',
          'كيف أحدد المشروع؟ 🎯',
          'اقترح تفاصيل ال issue ✨'
        ],
        en: [
          'Create new issue or merge request 🦊',
          'Use available data',
          'How do I set the project? 🎯',
          'Suggest issue details ✨'
        ],
        he: [
          'צור issue או merge request 🦊',
          'השתמש בנתונים זמינים',
          'איך לקבוע את הפרויקט? 🎯',
          'הצע פרטי issue ✨'
        ]
      },
      'linear': {
        ar: [
          'أنشئ issue جديد بالبيانات 🎯',
          'استخدم العنوان والوصف',
          'كيف أحدد الفريق والحالة؟ 👥',
          'اقترح تفاصيل ال issue ✨'
        ],
        en: [
          'Create new issue with data 🎯',
          'Use title and description',
          'How do I set team and status? 👥',
          'Suggest issue details ✨'
        ],
        he: [
          'צור issue חדש עם נתונים 🎯',
          'השתמש בכותרת ותיאור',
          'איך לקבוע צוות וסטט��ס? 👥',
          'הצע פרטי issue ✨'
        ]
      },
      'clickup': {
        ar: [
          'أنشئ مهمة جديدة بالبيانات ✅',
          'استخدم الاسم والوصف',
          'كيف أحدد القائمة والحالة؟ 📋',
          'اقترح تفاصيل المهمة ✨'
        ],
        en: [
          'Create new task with data ✅',
          'Use name and description',
          'How do I set list and status? 📋',
          'Suggest task details ✨'
        ],
        he: [
          'צור משימה חדשה עם נתונים ✅',
          'השתמש בשם ותיאור',
          'איך לקבוע רשימה וסטטוס? 📋',
          'הצע פרטי משימה ✨'
        ]
      },
      'monday': {
        ar: [
          'أنشئ عنصر جديد في اللوحة 📊',
          'استخدم البيانات المتاحة',
          'كيف أحدد الأعمدة؟ 📝',
          'اقترح تنظيم البيانات ✨'
        ],
        en: [
          'Create new item in board 📊',
          'Use available data',
          'How do I set the columns? 📝',
          'Suggest data organization ✨'
        ],
        he: [
          'צור ��ריט חדש בלוח 📊',
          'השתמש בנתונים זמינים',
          'איך לקבוע את העמודות? 📝',
          'הצע ארגון נתונים ✨'
        ]
      },
      'zoom': {
        ar: [
          'أنشئ اجتماع جديد بالبيانات 🎥',
          'استخدم ��لموضوع والتاريخ',
          'كيف أحدد الوقت والمدة؟ ⏰',
          'اقترح إعدادات الاجتماع ✨'
        ],
        en: [
          'Create new meeting with data 🎥',
          'Use topic and date',
          'How do I set time and duration? ⏰',
          'Suggest meeting settings ✨'
        ],
        he: [
          'צור פגישה חדשה עם נתונים 🎥',
          'השתמש בנושא ותאריך',
          'איך לקבוע שעה ומשך? ⏰',
          'הצע הגדרות פגישה ✨'
        ]
      },
      'teams': {
        ar: [
          'أرسل رسالة Teams بالبيانات 💬',
          'استخدم الم��توى من الخطوة السابقة',
          'كيف أحدد القناة؟ 📢',
          'اقترح محتوى الرسالة ✨'
        ],
        en: [
          'Send Teams message with data 💬',
          'Use content from previous step',
          'How do I set the channel? 📢',
          'Suggest message content ✨'
        ],
        he: [
          'שלח הודעת Teams עם נתונים 💬',
          'השתמש בתוכן מהשלב הקודם',
          'איך לקבוע את הערוץ? 📢',
          'הצע תוכן הודעה ✨'
        ]
      },
      'intercom': {
        ar: [
          'أرسل رسالة للمستخدم 💬',
          'استخدم البريد الإلكتروني والرسالة',
          'كيف أخصص المحتوى؟ ✍️',
          'اقترح نص الرسالة ✨'
        ],
        en: [
          'Send message to user 💬',
          'Use email and message',
          'How do I personalize content? ✍️',
          'Suggest message text ✨'
        ],
        he: [
          'שלח הודעה למשתמש 💬',
          'השתמש באימייל והודעה',
          'איך להתאים אישית תוכן? ✍️',
          'הצע טקס�� הודעה ✨'
        ]
      },
      'sendgrid': {
        ar: [
          'أرسل بريد إلكتروني بالبيانات 📧',
          'استخدم العنوان والمحتوى',
          'كيف أنسق القالب؟ 🎨',
          'اقترح محتوى البريد ✨'
        ],
        en: [
          'Send email with data 📧',
          'Use subject and content',
          'How do I format template? 🎨',
          'Suggest email content ✨'
        ],
        he: [
          'שלח אימייל עם נתונים 📧',
          'השתמש בנושא ותוכן',
          'איך לעצב תבנית? 🎨',
          'הצע תוכן אימייל ✨'
        ]
      },
      'typeform': {
        ar: [
          'استقبل إجابات النموذج 📋',
          'ما البيانات المتوقعة؟ 📊',
          'كيف أعالج الإجابات؟ 🔄',
          'أرني الحقول المتاحة ✨'
        ],
        en: [
          'Receive form responses 📋',
          'What data to expect? 📊',
          'How do I process responses? ����',
          'Show me available fields ✨'
        ],
        he: [
          'קבל תגובות טופס 📋',
          'איזה נתונים לצפות? 📊',
          'איך לעבד תגובות? 🔄',
          'הראה לי שדות זמינים ✨'
        ]
      },
      'calendly': {
        ar: [
          'استقبل حجز موعد جديد 📅',
          'استخدم تفاصيل الحدث',
          'كيف أعالج بيانات الحجز؟ 🔄',
          'أرني معلومات الموعد ✨'
        ],
        en: [
          'Receive new booking 📅',
          'Use event details',
          'How do I process booking data? 🔄',
          'Show me appointment info ✨'
        ],
        he: [
          'קבל הזמנה חדשה 📅',
          'השתמש בפרטי אירוע',
          'איך לעבד נתוני הזמנה? 🔄',
          'הראה לי מידע פגישה ✨'
        ]
      }
    };
    
    // Default generic replies based on available data
    const genericReplies: Record<string, string[]> = {
      ar: [],
      en: [],
      he: []
    };
    
    // Add data-specific suggestions
    if (hasEmail) {
      genericReplies.ar.push('استخدم حقل البريد الإلكتروني المتاح 📧');
      genericReplies.en.push('Use the available email field 📧');
      genericReplies.he.push('השתמש בשדה האימייל הזמין 📧');
    }
    
    if (hasName) {
      genericReplies.ar.push('استخدم حقل الاسم للتخصيص 👤');
      genericReplies.en.push('Use the name field for personalization 👤');
      genericReplies.he.push('השתמש בשדה השם לאישיות 👤');
    }
    
    if (hasDate) {
      genericReplies.ar.push('أضف التاريخ والوقت 📅');
      genericReplies.en.push('Add date and time 📅');
      genericReplies.he.push('הוסף תאריך ושעה 📅');
    }
    
    // Always add these common replies
    genericReplies.ar.push('ما الغرض من هذه الخطوة؟ 💡', '��ملأ جميع الحقول تلقائياً ✨');
    genericReplies.en.push('What\'s the purpose of this step? 💡', 'Fill all fields automatically ✨');
    genericReplies.he.push('מה המטרה של השלב הזה? 💡', 'מלא את כל השדות אוטומטית ✨');
    
    // Determine language key
    const langKey = language === 'Arabic' ? 'ar' : language === 'Hebrew' ? 'he' : 'en';
    
    // Check if we have app-specific scenarios
    const appKey = appName.toLowerCase();
    if (appScenarios[appKey]) {
      return appScenarios[appKey][langKey];
    }
    
    // Return generic replies with max 4 items
    return genericReplies[langKey].slice(0, 4);
  };

  // 🎨 Parse suggestion value and render colored tags (for suggestions box)
  const renderSuggestionValue = (value: string) => {
    const parts: (string | JSX.Element)[] = [];
    const regex = /\{\{([^}]+)\}\}/g;
    let lastIndex = 0;
    let match;
    let keyCounter = 0;

    while ((match = regex.exec(value)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(value.substring(lastIndex, match.index));
      }

      // Parse the variable: {{StepName.field.path}}
      const variable = match[1];
      const dotIndex = variable.indexOf('.');
      
      if (dotIndex !== -1) {
        const stepName = variable.substring(0, dotIndex);
        const fieldPath = variable.substring(dotIndex + 1);
        
        // Check if this is a Code step
        if (stepName === 'Code') {
          // Create a tag for Code step
          parts.push(
            <DataTag
              key={`tag-${keyCounter++}`}
              tag={{
                type: 'step',
                id: 'code',
                stepName: 'Code',
                stepIcon: <Box size={14} />,
                stepColor: 'hsl(257, 74%, 57%)',
                path: fieldPath,
                displayValue: fieldPath
              }}
              size="sm"
              onReply={() => {
                setReplyToSuggestion({
                  fieldName: fieldPath,
                  fieldLabel: `Code.${fieldPath}`,
                  value: `{{Code.${fieldPath}}}`
                });
                setSelectedFieldTag(null);
                setSelectedDataTags([]); // Clear data tags when replying
              }}
            />
          );
        } else {
          // Find the step in availableSteps
          const step = availableSteps?.find(s => s.name === stepName);
          
          if (step) {
            // Create a tag
            parts.push(
              <DataTag
                key={`tag-${keyCounter++}`}
                tag={{
                  type: 'step',
                  id: step.id,
                  stepName: step.name,
                  stepIcon: step.icon,
                  stepColor: step.color,
                  path: fieldPath,
                  displayValue: fieldPath
                }}
                size="sm"
                onReply={() => {
                  setReplyToSuggestion({
                    fieldName: fieldPath,
                    fieldLabel: `${step.name}.${fieldPath}`,
                    value: `{{${step.name}.${fieldPath}}}`
                  });
                  setSelectedFieldTag(null);
                  setSelectedDataTags([]); // Clear data tags when replying
                }}
              />
            );
          } else {
            // If step not found, just show the text
            parts.push(`{{${variable}}}`);
          }
        }
      } else {
        // No dot found, just show as text
        parts.push(`{{${variable}}}`);
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < value.length) {
      parts.push(value.substring(lastIndex));
    }

    // If no matches found, return the whole value as text
    if (parts.length === 0) {
      return value;
    }

    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        {parts.map((part, idx) => {
          if (typeof part === 'string') {
            return <span key={`text-${idx}`}>{part}</span>;
          }
          return part;
        })}
      </span>
    );
  };

  // 🔹 Render suggestion value inline (single line for reply box)
  const renderSuggestionValueInline = (value: string) => {
    const parts: (string | JSX.Element)[] = [];
    const regex = /\{\{([^}]+)\}\}/g;
    let lastIndex = 0;
    let match;
    let keyCounter = 0;

    while ((match = regex.exec(value)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(value.substring(lastIndex, match.index));
      }

      // Parse the variable: {{StepName.field.path}}
      const variable = match[1];
      const dotIndex = variable.indexOf('.');
      
      if (dotIndex !== -1) {
        const stepName = variable.substring(0, dotIndex);
        const fieldPath = variable.substring(dotIndex + 1);
        
        // Check if this is a Code step
        if (stepName === 'Code') {
          // Create a tag for Code step
          parts.push(
            <DataTag
              key={`tag-inline-${keyCounter++}`}
              tag={{
                type: 'step',
                id: 'code',
                stepName: 'Code',
                stepIcon: <Box size={14} />,
                stepColor: 'hsl(257, 74%, 57%)',
                path: fieldPath,
                displayValue: fieldPath
              }}
              size="sm"
              onReply={() => {
                setReplyToSuggestion({
                  fieldName: fieldPath,
                  fieldLabel: `Code.${fieldPath}`,
                  value: `{{Code.${fieldPath}}}`
                });
                setSelectedFieldTag(null);
                setSelectedDataTags([]); // Clear data tags when replying
              }}
            />
          );
        } else {
          // Find the step in availableSteps
          const step = availableSteps?.find(s => s.name === stepName);
          
          if (step) {
            // Create a tag
            parts.push(
              <DataTag
                key={`tag-inline-${keyCounter++}`}
                tag={{
                  type: 'step',
                  id: step.id,
                  stepName: step.name,
                  stepIcon: step.icon,
                  stepColor: step.color,
                  path: fieldPath,
                  displayValue: fieldPath
                }}
                size="sm"
                onReply={() => {
                  setReplyToSuggestion({
                    fieldName: fieldPath,
                    fieldLabel: `${step.name}.${fieldPath}`,
                    value: `{{${step.name}.${fieldPath}}}`
                  });
                  setSelectedFieldTag(null);
                  setSelectedDataTags([]); // Clear data tags when replying
                }}
              />
            );
          } else {
            // If step not found, just show the text
            parts.push(`{{${variable}}}`);
          }
        }
      } else {
        // No dot found, just show as text
        parts.push(`{{${variable}}}`);
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < value.length) {
      parts.push(value.substring(lastIndex));
    }

    // If no matches found, return the whole value as text
    if (parts.length === 0) {
      return value;
    }

    return (
      <span className="inline-flex items-center gap-1 overflow-hidden min-w-0">
        {parts.map((part, idx) => {
          if (typeof part === 'string') {
            return <span key={`text-inline-${idx}`} className="truncate min-w-0">{part}</span>;
          }
          return part;
        })}
      </span>
    );
  };

  // 🔹 Render suggestion value with wrap (for user message reply box)
  const renderSuggestionValueWrapped = (value: string) => {
    const parts: (string | JSX.Element)[] = [];
    const regex = /\{\{([^}]+)\}\}/g;
    let lastIndex = 0;
    let match;
    let keyCounter = 0;

    while ((match = regex.exec(value)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(value.substring(lastIndex, match.index));
      }

      // Parse the variable: {{StepName.field.path}}
      const variable = match[1];
      const dotIndex = variable.indexOf('.');
      
      if (dotIndex !== -1) {
        const stepName = variable.substring(0, dotIndex);
        const fieldPath = variable.substring(dotIndex + 1);
        
        // Check if this is a Code step
        if (stepName === 'Code') {
          // Create a tag for Code step
          parts.push(
            <DataTag
              key={`tag-wrapped-${keyCounter++}`}
              tag={{
                type: 'step',
                id: 'code',
                stepName: 'Code',
                stepIcon: <Box size={14} />,
                stepColor: 'hsl(257, 74%, 57%)',
                path: fieldPath,
                displayValue: fieldPath
              }}
              size="sm"
              onReply={() => {
                setReplyToSuggestion({
                  fieldName: fieldPath,
                  fieldLabel: `Code.${fieldPath}`,
                  value: `{{Code.${fieldPath}}}`
                });
                setSelectedFieldTag(null);
                setSelectedDataTags([]); // Clear data tags when replying
              }}
            />
          );
        } else {
          // Find the step in availableSteps
          const step = availableSteps?.find(s => s.name === stepName);
          
          if (step) {
            // Create a tag
            parts.push(
              <DataTag
                key={`tag-wrapped-${keyCounter++}`}
                tag={{
                  type: 'step',
                  id: step.id,
                  stepName: step.name,
                  stepIcon: step.icon,
                  stepColor: step.color,
                  path: fieldPath,
                  displayValue: fieldPath
                }}
                size="sm"
                onReply={() => {
                  setReplyToSuggestion({
                    fieldName: fieldPath,
                    fieldLabel: `${step.name}.${fieldPath}`,
                    value: `{{${step.name}.${fieldPath}}}`
                  });
                  setSelectedFieldTag(null);
                  setSelectedDataTags([]); // Clear data tags when replying
                }}
              />
            );
          } else {
            // If step not found, just show the text
            parts.push(`{{${variable}}}`);
          }
        }
      } else {
        // No dot found, just show as text
        parts.push(`{{${variable}}}`);
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < value.length) {
      parts.push(value.substring(lastIndex));
    }

    // If no matches found, return the whole value as text
    if (parts.length === 0) {
      return value;
    }

    return (
      <span className="inline">
        {parts.map((part, idx) => {
          if (typeof part === 'string') {
            return <span key={`text-wrapped-${idx}`}>{part}</span>;
          }
          return part;
        })}
      </span>
    );
  };

  // Helper function to parse bold formatting in text
  const parseBoldText = (text: string, startKey: number = 0) => {
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;
    let keyCounter = startKey;

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Add bold text
      parts.push(<strong key={`bold-${keyCounter++}`} className="font-semibold">{match[1]}</strong>);

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  // 💬 Parse AI message and render white inline tags
  const renderAIMessage = (content: string) => {
    const parts: (string | JSX.Element)[] = [];
    const regex = /\{\{([^}]+)\}\}/g;
    let lastIndex = 0;
    let match;
    let keyCounter = 0;

    while ((match = regex.exec(content)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }

      // Parse the variable: {{StepName.field.path}}
      const variable = match[1];
      const dotIndex = variable.indexOf('.');
      
      if (dotIndex !== -1) {
        const stepName = variable.substring(0, dotIndex);
        const fieldPath = variable.substring(dotIndex + 1);
        
        // Find the step in availableSteps
        const step = availableSteps?.find(s => s.name === stepName);
        
        if (step) {
          // Use DataTag with white variant
          parts.push(
            <DataTag
              key={`tag-${keyCounter++}`}
              tag={{
                stepId: step.id,
                stepName: step.name,
                stepIcon: step.icon,
                stepColor: step.color,
                fieldPath: fieldPath,
                displayValue: fieldPath
              }}
              size="sm"
              variant="white"
              onReply={() => {
                setReplyToSuggestion({
                  fieldName: fieldPath,
                  fieldLabel: `${step.name}.${fieldPath}`,
                  value: `{{${step.name}.${fieldPath}}}`
                });
                setSelectedFieldTag(null);
                setSelectedDataTags([]); // Clear data tags when replying
              }}
            />
          );
        } else {
          // If step not found, just show the text
          parts.push(`{{${variable}}}`);
        }
      } else {
        // No dot found, just show as text
        parts.push(`{{${variable}}}`);
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    // If no matches found, return the whole value as text
    if (parts.length === 0) {
      return content;
    }

    return (
      <>
        {parts.map((part, idx) => {
          if (typeof part === 'string') {
            // Split by newlines and render each line separately
            const lines = part.split('\n');
            return (
              <span key={`text-${idx}`} className="whitespace-pre-wrap">
                {lines.map((line, lineIdx) => {
                  // Parse bold formatting in each line
                  const boldParts = parseBoldText(line, idx * 1000 + lineIdx * 100);
                  return (
                    <span key={`line-${lineIdx}`}>
                      {boldParts}
                      {lineIdx < lines.length - 1 && <br />}
                    </span>
                  );
                })}
              </span>
            );
          }
          return part;
        })}
      </>
    );
  };

  // Keep ref in sync with prop
  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  // DISABLED: Don't auto-update conversation context when step changes - unified chat
  /*
  // 🔥 NEW: Auto-update conversation context when currentStepId changes
  useEffect(() => {
    if (currentStepId) {
      console.log('🔄 Auto-updating conversation context to currentStepId:', currentStepId);
      conversationContextStepRef.current = currentStepId;
    }
  }, [currentStepId]);
  */

  // Cleanup pending messages on unmount
  useEffect(() => {
    return () => {
      // When popover closes, remove any pending messages
      if (pendingMessageIdsRef.current.size > 0) {
        const filteredMessages = chatMessagesRef.current.filter(msg => !pendingMessageIdsRef.current.has(msg.id));
        onChatMessagesChange(filteredMessages);
      }
    };
  }, []); // Empty deps - only run on unmount

  // Initialize completed messages for existing messages on mount
  useEffect(() => {
    if (chatMessages.length > 0 && lastMessageCountRef.current === 0) {
      const existingIds = chatMessages.map(msg => msg.id);
      setCompletedMessages(new Set(existingIds));
      lastMessageCountRef.current = chatMessages.length;
    }
  }, [chatMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamingText]);

  // 🎯 Smart scroll: Show scrollbar only when content overflows + Auto-scroll to bottom
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const checkOverflow = () => {
      const isOverflowing = container.scrollHeight > container.clientHeight;
      setShouldShowScroll(isOverflowing);
      
      // Always scroll to bottom when messages change
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    };

    // Check immediately
    checkOverflow();

    // Also check after delays to ensure all content is rendered
    const timeoutId1 = setTimeout(checkOverflow, 50);
    const timeoutId2 = setTimeout(checkOverflow, 150);

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
    };
  }, [chatMessages, streamingText, streamingCode, codeVisible, expandedCode]);

  // Auto-scroll code containers to bottom when streaming code - DISABLED to allow justify-end to work
  // Auto-scroll code containers when streaming
  useEffect(() => {
    // Use requestAnimationFrame + setTimeout to ensure scroll happens after SyntaxHighlighter renders
    requestAnimationFrame(() => {
      setTimeout(() => {
        Object.keys(streamingCode).forEach(messageId => {
          const container = codeContainerRefs.current.get(messageId);
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        });
      }, 10);
    });
  }, [streamingCode]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '42px';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = Math.min(scrollHeight, 120) + 'px';
    }
  }, [userInput]);

  // Close fields menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fieldsMenuRef.current && !fieldsMenuRef.current.contains(event.target as Node)) {
        setIsFieldsMenuOpen(false);
      }
    };

    if (isFieldsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isFieldsMenuOpen]);

  // Close box menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (boxMenuRef.current && !boxMenuRef.current.contains(event.target as Node)) {
        setIsBoxMenuOpen(false);
      }
    };

    if (isBoxMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isBoxMenuOpen]);

  // Close data selector menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dataSelectorMenuRef.current && !dataSelectorMenuRef.current.contains(event.target as Node)) {
        setIsDataSelectorOpen(false);
      }
    };

    if (isDataSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isDataSelectorOpen]);

  // Streaming effect for AI messages
  useEffect(() => {
    // Only process new messages that were added after component mount
    if (chatMessages.length > lastMessageCountRef.current) {
      const startIndex = lastMessageCountRef.current;
      
      chatMessages.slice(startIndex).forEach((msg) => {
        
        if (msg.role === 'ai' && !streamingText[msg.id] && !completedMessages.has(msg.id)) {
          const fullText = msg.content;
          const words = fullText.split(' ');
          let currentWordIndex = 0;
          
          const streamInterval = setInterval(() => {
            if (currentWordIndex <= words.length) {
              setStreamingText(prev => ({
                ...prev,
                [msg.id]: words.slice(0, currentWordIndex).join(' ')
              }));
              currentWordIndex++;
            } else {
              clearInterval(streamInterval);
              setStreamingText(prev => ({
                ...prev,
                [msg.id]: fullText
              }));
              setCompletedMessages(prev => new Set([...prev, msg.id]));
              // Remove from active intervals
              activeIntervalsRef.current = activeIntervalsRef.current.filter(id => id !== streamInterval);
            }
          }, 50); // Speed of typing effect (50ms per word)

          // Track active interval
          activeIntervalsRef.current.push(streamInterval);
        }
        
        // Handle code streaming
        if (msg.role === 'code' && !streamingCode[msg.id] && !completedMessages.has(msg.id)) {
          const fullCode = msg.content;
          // Split code by words (spaces and newlines)
          const tokens = fullCode.split(/(\s+)/);
          let currentTokenIndex = 0;
          
          const codeInterval = setInterval(() => {
            if (currentTokenIndex <= tokens.length) {
              setStreamingCode(prev => ({
                ...prev,
                [msg.id]: tokens.slice(0, currentTokenIndex).join('')
              }));
              currentTokenIndex++;
            } else {
              clearInterval(codeInterval);
              setStreamingCode(prev => ({
                ...prev,
                [msg.id]: fullCode
              }));
              setCompletedMessages(prev => new Set([...prev, msg.id]));
              
              // Mark code as complete
              const updatedMessages = chatMessagesRef.current.map(m => 
                m.id === msg.id ? { ...m, isCodeComplete: true } : m
              );
              onChatMessagesChange(updatedMessages);
              
              // After 1.5 seconds, hide code and show suggestions
              setTimeout(() => {
                setCodeVisible(prev => ({ ...prev, [msg.id]: false }));
                
                // Remove code message from chat
                const messagesWithoutCode = chatMessagesRef.current.filter(m => m.id !== msg.id);
                
                // Generate suggestions with new tag after another 500ms
                setTimeout(async () => {
                  const codeMessage = chatMessagesRef.current.find(m => m.id === msg.id);
                  if (codeMessage && codeMessage.newTag) {
                    // Create suggestion with the new tag
                    const language = detectUserLanguage();
                    const newSuggestions: Suggestion[] = [{
                      fieldName: codeMessage.newTag.name,
                      fieldLabel: codeMessage.newTag.name,
                      value: `{{Code.${codeMessage.newTag.name}}}`,
                      description: codeMessage.newTag.description
                    }];
                    
                    // Add code suggestions message (different from regular suggestions)
                    const messagesWithSuggestions = [...messagesWithoutCode, {
                      role: 'code-suggestion' as const,
                      content: '',
                      suggestions: newSuggestions,
                      id: generateMessageId()
                    }];
                    onChatMessagesChange(messagesWithSuggestions);
                    chatMessagesRef.current = messagesWithSuggestions;
                    
                    onSuggestionsChange(newSuggestions);
                    onShowSuggestionsChange(true);
                    setIsLoading(false);
                    onThinkingChange(false);
                    onHasNewMessageChange(true);
                  }
                }, 500);
              }, 1500);
              
              // Remove from active intervals
              activeIntervalsRef.current = activeIntervalsRef.current.filter(id => id !== codeInterval);
            }
          }, 20); // Slightly slower for code

          // Track active interval
          activeIntervalsRef.current.push(codeInterval);
        }
      });
      
      lastMessageCountRef.current = chatMessages.length;
    }
    
    // If messages were deleted (chatMessages.length < lastMessageCountRef), update the ref
    if (chatMessages.length < lastMessageCountRef.current) {
      lastMessageCountRef.current = chatMessages.length;
    }
  }, [chatMessages, streamingText, streamingCode, completedMessages]);

  // Start conversation
  useEffect(() => {
    if (!hasStartedRef.current && chatMessages.length === 0) {
      hasStartedRef.current = true;
      lastStepNumberRef.current = currentStepNumber;
      hasAddedHeaderOnMountRef.current = false; // Don't add header on initial mount
      
      // Generate IDs for initial messages
      const greetingId = generateMessageId();
      
      // 🌐 Detect language from browser or use default
      const detectInitialLanguage = (): string => {
        const browserLang = navigator.language || (navigator as any).userLanguage;
        if (browserLang.startsWith('ar')) return 'Arabic';
        return 'English';
      };
      
      const initialLanguage = detectInitialLanguage();
      
      // 🎯 GENERAL GREETING - NOT TIED TO ANY SPECIFIC STEP
      const generalGreetings = {
        ar: [
          '👋 مرحباً! أنا مساعدك الذكي لبناء الـ Workflows.\n\nكيف يمكنني مساعدتك اليوم؟',
          '✨ أهلاً! أنا هنا لمساعدتك في تكوين خطوات الـ Workflow.\n\nما الذي تريد إنجازه؟',
          '���� مرحباً بك! أنا أستطيع مساعدتك في:\n• تحليل البيانات المتاحة\n• اقتراح قيم للحقول\n• كتابة أكواد لتحويل البيانات\n\nأي خطوة تريد العمل عليها؟'
        ],
        en: [
          '',
          '',
          ''
        ]
      };
      
      // 🎯 GENERAL QUICK REPLIES - NOT STEP-SPECIFIC
      const generalQuickReplies = {
        ar: [
          'ما الخطوات المتاحة؟ 📋',
          'كيف يعمل النظام�� 💡',
          'أرني البيانات المتاحة 📊',
          'ساعدني في تكوين خطوة ✨'
        ],
        en: [
          'What steps are available? 📋',
          'How does this work? 💡',
          'Show me available data 📊',
          'Help me configure a step ✨'
        ]
      };
      
      const langKey = initialLanguage === 'Arabic' ? 'ar' : 'en';
      
      // Add ONLY general greeting WITHOUT step header
      const initialMessages: ChatMessage[] = []; // Empty chat at the start
      
      // Mark message as pending
      // pendingMessageIdsRef.current.add(greetingId);
      
      // Initial AI greeting
      setTimeout(() => {
        onChatMessagesChange(initialMessages);
      }, 300);
    }
    /* DISABLED: Don't add step header when chat is reopened - unified chat
    else if (chatMessages.length > 0 && currentStepNumber && !hasAddedHeaderOnMountRef.current) {
      // When chat is opened and has existing messages, add step header for current step
      const lastStepHeaderIndex = chatMessages.map((msg, idx) => msg.role === 'step-header' ? idx : -1)
        .filter(idx => idx !== -1)
        .pop();
      
      // If there's no step header, or the last step header is not for current step
      if (lastStepHeaderIndex === undefined || chatMessages[lastStepHeaderIndex].stepNumber !== currentStepNumber) {
        hasAddedHeaderOnMountRef.current = true;
        lastStepNumberRef.current = currentStepNumber;
        
        // 🔥 FIX: Remove quickReplies from previous AI messages to avoid duplicate suggestions
        const cleanedMessages = chatMessages.map(msg => {
          if (msg.role === 'ai' && (msg.quickReplies || msg.quickReplySteps)) {
            const { quickReplies, quickReplySteps, ...rest } = msg;
            return rest as ChatMessage;
          }
          return msg;
        });
        
        // Generate IDs for new messages
        const headerId = generateMessageId();
        const greetingId = generateMessageId();
        
        const newMessages: ChatMessage[] = [...cleanedMessages, {
          id: headerId,
          role: 'step-header',
          content: '',
          stepName: currentStepName,
          stepNumber: currentStepNumber,
          stepId: currentStepId,
          stepIcon: currentStepIcon,
          stepColor: currentStepColor
        }, {
          id: greetingId,
          role: 'ai',
          content: (() => {
            // ��� Generate dynamic step change greeting with available data
            if (availableSteps && availableSteps.length > 0) {
              const firstStep = availableSteps[0];
              const stepName = firstStep.name;
              const availableFields = Object.keys(firstStep.fields);
              const emailField = availableFields.find(f => f.toLowerCase().includes('email'));
              const nameField = availableFields.find(f => f.toLowerCase().includes('name'));
              
              if (emailField && nameField) {
                return getRandomItem([
                  `👋 You're now in \"${currentStepName}\". I can use {{${stepName}.${emailField}}} and {{${stepName}.${nameField}}} from ${stepName}.\\n\\nWhat's your goal?`,
                  `Switched to \"${currentStepName}\" 🎯 I have {{${stepName}.${nameField}}} and {{${stepName}.${emailField}}} available.\\n\\nHow can I help?`
                ]);
              } else if (emailField) {
                return getRandomItem([
                  `👋 You're now in \"${currentStepName}\". I can use {{${stepName}.${emailField}}} from ${stepName}.\\n\\nWhat do you need?`,
                  `Switched to \"${currentStepName}\" 🎯 I have {{${stepName}.${emailField}}} available.\\n\\nHow can I help?`
                ]);
              } else {
                const firstTwoFields = availableFields.slice(0, 2);
                return getRandomItem([
                  `👋 You're now in \"${currentStepName}\". I can use ${firstTwoFields.map(f => `{{${stepName}.${f}}}`).join(' and ')} from ${stepName}.\\n\\nWhat's your goal?`,
                  `Switched to \"${currentStepName}\" 🎯 I have data from ${stepName} available.\\n\\nHow can I help?`
                ]);
              }
            }
            return getRandomItem(stepChangeGreetings);
          })(),
          quickReplies: generateDynamicQuickReplies({
            stepName: currentStepName,
            appName: currentAppName,
            availableSteps: availableSteps || [],
            messageContent: currentStepName // Auto-detect language from step name
          })
        }];
        
        // Mark these messages as pending
        pendingMessageIdsRef.current.add(headerId);
        pendingMessageIdsRef.current.add(greetingId);
        pendingStepRef.current = currentStepNumber;
        
        onChatMessagesChange(newMessages);
      } else {
        // Update the ref to match current step
        hasAddedHeaderOnMountRef.current = true;
        lastStepNumberRef.current = currentStepNumber;
      }
    }
    */ // End of disabled code
  }, [chatMessages.length, currentStepName, currentStepNumber, currentStepId, currentStepIcon, currentStepColor, onChatMessagesChange]);

  // Detect step change and add new step header - DISABLED: Chat should be unified across all steps
  /*
  useEffect(() => {
    if (chatMessages.length > 0 && currentStepNumber && lastStepNumberRef.current !== currentStepNumber) {
      // Before changing step, clean up pending messages from previous step
      if (pendingMessageIdsRef.current.size > 0 && pendingStepRef.current && pendingStepRef.current !== currentStepNumber) {
        const filteredMessages = chatMessages.filter(msg => !pendingMessageIdsRef.current.has(msg.id));
        pendingMessageIdsRef.current.clear();
        pendingStepRef.current = '';
        onChatMessagesChange(filteredMessages);
        // Wait for the next render cycle to add new step header
        return;
      }
      
      // Check if the last step header in chat is already for this step
      const lastStepHeaderIndex = chatMessages.map((msg, idx) => msg.role === 'step-header' ? idx : -1)
        .filter(idx => idx !== -1)
        .pop();
      
      if (lastStepHeaderIndex !== undefined) {
        const lastStepHeader = chatMessages[lastStepHeaderIndex];
        if (lastStepHeader.stepNumber === currentStepNumber) {
          // Already have header for this step, just update ref
          lastStepNumberRef.current = currentStepNumber;
          return;
        }
      }
      
      // Step changed - add new header
      const headerId = generateMessageId();
      const greetingId = generateMessageId();
      
      // 🔥 FIX: Remove quickReplies from previous AI messages to avoid duplicate suggestions
      const cleanedMessages = chatMessages.map(msg => {
        if (msg.role === 'ai' && (msg.quickReplies || msg.quickReplySteps)) {
          const { quickReplies, quickReplySteps, ...rest } = msg;
          return rest as ChatMessage;
        }
        return msg;
      });
      
      const newMessages: ChatMessage[] = [...cleanedMessages, {
        id: headerId,
        role: 'step-header',
        content: '',
        stepName: currentStepName,
        stepNumber: currentStepNumber,
        stepId: currentStepId,
        stepIcon: currentStepIcon,
        stepColor: currentStepColor
      }, {
        id: greetingId,
        role: 'ai',
        content: getRandomItem(stepChangeGreetings),
        quickReplies: generateDynamicQuickReplies({
          stepName: currentStepName,
          appName: currentAppName,
          availableSteps: availableSteps || [],
          messageContent: currentStepName // Auto-detect language from step name
        })
      }];
      
      // Mark these messages as pending
      pendingMessageIdsRef.current.add(headerId);
      pendingMessageIdsRef.current.add(greetingId);
      pendingStepRef.current = currentStepNumber;
      
      onChatMessagesChange(newMessages);
      lastStepNumberRef.current = currentStepNumber;
    }
  }, [currentStepNumber, currentStepName, currentStepId, currentStepIcon, currentStepColor, chatMessages, pendingMessageIdsRef]);
  */

  // Handle quick action button click - Send message directly
  const handleQuickAction = async (text: string) => {
    if (isLoading) return;
    
    // Send the message directly without putting it in the input box
    setIsLoading(true);
    onThinkingChange(true);
    
    // User replied in this step - confirm pending messages
    if (pendingMessageIdsRef.current.size > 0 && pendingStepRef.current === currentStepNumber) {
      pendingMessageIdsRef.current.clear();
      pendingStepRef.current = '';
    }
    
    // Remove quick replies from the LAST AI message only
    const lastAIIndex = chatMessagesRef.current.map((msg, idx) => msg.role === 'ai' ? idx : -1)
      .filter(idx => idx !== -1)
      .pop();
    
    const messagesWithoutLastQuickReplies = chatMessagesRef.current.map((msg, idx) => {
      if (idx === lastAIIndex && (msg.quickReplies || msg.quickReplySteps)) {
        const { quickReplies, quickReplySteps, ...rest } = msg;
        return rest as ChatMessage;
      }
      return msg;
    });
    onChatMessagesChange(messagesWithoutLastQuickReplies);
    
    // Add user message
    const newMessagesWithUser = [...messagesWithoutLastQuickReplies, {
      role: 'user' as const,
      content: text,
      id: generateMessageId(),
      fieldTag: selectedFieldTag || undefined,
      dataTags: selectedDataTags.length > 0 ? selectedDataTags : undefined,
      replyToSuggestion: replyToSuggestion || undefined
    }];
    onChatMessagesChange(newMessagesWithUser);
    chatMessagesRef.current = newMessagesWithUser;
    
    // Store reply context before clearing
    const currentReplyToSuggestion = replyToSuggestion;
    
    // Clear selected field tag, data tags, and reply after sending
    setSelectedFieldTag(null);
    setSelectedDataTags([]);
    setReplyToSuggestion(null);

    // Call OpenAI for intelligent response
    try {
      const aiResponse = await callOpenAI(newMessagesWithUser, text, selectedFieldTag || undefined, currentReplyToSuggestion || undefined);
      
      // Check if user is answering step selection question
      const selectedStepId = parseStepSelection(text);
      if (selectedStepId) {
        conversationContextStepRef.current = selectedStepId;
        console.log('🎯 User selected step:', selectedStepId);
        if (onStepClick) {
          onStepClick(selectedStepId);
        }
      }
      
      // Check if AI is asking for step selection
      const isAskingForStep = detectStepSelection(aiResponse);
      
      // Check if AI wants to generate code
      let codeMatch = aiResponse.match(/\[GENERATE_CODE\]/);
      
      // Check if AI wants to generate suggestions
      const suggestionMatch = aiResponse.match(/\[GENERATE_SUGGESTIONS(?::([^\]]+))?\]/);
      let cleanedResponse = aiResponse;
      
      // Handle step selection question
      if (isAskingForStep && !codeMatch && !suggestionMatch) {
        cleanedResponse = aiResponse.replace(/\[ASK_STEP_SELECTION\]/, '').trim();
        
        const quickReplySteps = availableSteps?.map((step, index) => ({
          id: step.id,
          number: String(index + 1),
          name: step.name,
          appName: step.name
        })) || [];
        
        const quickReplies = generateContextualQuickReplies({
          aiMessage: cleanedResponse,
          availableSteps: availableSteps || [],
          fieldsToFill: fieldsToFill || [],
          conversationHistory: chatMessagesRef.current
        });
        
        const messagesWithAI = [...chatMessagesRef.current, {
          role: 'ai' as const,
          content: cleanedResponse,
          id: generateMessageId(),
          quickReplySteps: quickReplySteps.length > 0 ? quickReplySteps : undefined,
          quickReplies: quickReplySteps.length === 0 && quickReplies.length > 0 ? quickReplies : undefined
        }];
        onChatMessagesChange(messagesWithAI);
        setIsLoading(false);
        onThinkingChange(false);
        return;
      }
      
      if (codeMatch) {
        cleanedResponse = aiResponse.replace(/\[GENERATE_CODE\]/, '').trim();
        
        const quickReplies = generateContextualQuickReplies({
          aiMessage: cleanedResponse,
          availableSteps: availableSteps || [],
          fieldsToFill: fieldsToFill || [],
          conversationHistory: chatMessagesRef.current
        });
        
        if (cleanedResponse) {
          const messagesWithAI = [...chatMessagesRef.current, {
            role: 'ai' as const,
            content: cleanedResponse,
            id: generateMessageId(),
            quickReplies: quickReplies.length > 0 ? quickReplies : undefined
          }];
          onChatMessagesChange(messagesWithAI);
          chatMessagesRef.current = messagesWithAI;
        }
        
        // Generate code
        setTimeout(async () => {
          const codeData = await generateTransformCode(chatMessagesRef.current, text);
          
          // Add code message
          const codeMessageId = generateMessageId();
          const messagesWithCode = [...chatMessagesRef.current, {
            role: 'code' as const,
            content: codeData.code,
            id: codeMessageId,
            codeLanguage: 'javascript',
            isCodeComplete: false,
            newTag: codeData.tag
          }];
          onChatMessagesChange(messagesWithCode);
          
          // Make code visible for streaming
          setCodeVisible(prev => ({ ...prev, [codeMessageId]: true }));
        }, 800);
        
        setIsLoading(false);
        onThinkingChange(false);
        return;
      }
      
      if (suggestionMatch) {
        cleanedResponse = aiResponse.replace(/\[GENERATE_SUGGESTIONS(?::[^\]]+)?\]/, '').trim();
        
        let fieldsToGenerate: string[] | undefined;
        if (suggestionMatch[1]) {
          fieldsToGenerate = suggestionMatch[1].split(',').map(f => f.trim());
        }
        
        const quickReplies = generateContextualQuickReplies({
          aiMessage: cleanedResponse,
          availableSteps: availableSteps || [],
          fieldsToFill: fieldsToFill || [],
          conversationHistory: chatMessagesRef.current
        });
        
        if (cleanedResponse) {
          const messagesWithAI = [...chatMessagesRef.current, {
            role: 'ai' as const,
            content: cleanedResponse,
            id: generateMessageId(),
            quickReplies: quickReplies.length > 0 ? quickReplies : undefined
          }];
          onChatMessagesChange(messagesWithAI);
          chatMessagesRef.current = messagesWithAI;
        }
        
        // Generate suggestions
        setTimeout(async () => {
          await generateSuggestionsWithAI(fieldsToGenerate);
        }, 1000);
        
        setIsLoading(false);
        onThinkingChange(false);
        return;
      }
      
      // Regular AI response
      const quickReplies = generateContextualQuickReplies({
        aiMessage: cleanedResponse,
        availableSteps: availableSteps || [],
        fieldsToFill: fieldsToFill || [],
        conversationHistory: chatMessagesRef.current
      });
      
      const messagesWithAI = [...chatMessagesRef.current, {
        role: 'ai' as const,
        content: cleanedResponse,
        id: generateMessageId(),
        quickReplies: quickReplies.length > 0 ? quickReplies : undefined
      }];
      onChatMessagesChange(messagesWithAI);
      chatMessagesRef.current = messagesWithAI;
      
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'ai',
        content: 'Sorry, there was an error processing your request. Please try again.'
      };
      const newMessages = [...chatMessagesRef.current, errorMessage];
      onChatMessagesChange(newMessages);
      chatMessagesRef.current = newMessages;
    } finally {
      setIsLoading(false);
      onThinkingChange(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const message = userInput.trim();
    setUserInput('');
    setIsLoading(true);
    onThinkingChange(true);
    
    // User replied in this step - confirm pending messages
    if (pendingMessageIdsRef.current.size > 0 && pendingStepRef.current === currentStepNumber) {
      pendingMessageIdsRef.current.clear();
      pendingStepRef.current = '';
    }
    
    // Remove quick replies from the LAST AI message only (not all messages)
    const lastAIIndex = chatMessagesRef.current.map((msg, idx) => msg.role === 'ai' ? idx : -1)
      .filter(idx => idx !== -1)
      .pop();
    
    const messagesWithoutLastQuickReplies = chatMessagesRef.current.map((msg, idx) => {
      if (idx === lastAIIndex && (msg.quickReplies || msg.quickReplySteps)) {
        const { quickReplies, quickReplySteps, ...rest } = msg;
        return rest as ChatMessage;
      }
      return msg;
    });
    onChatMessagesChange(messagesWithoutLastQuickReplies);
    
    // Add user message with field tag if one is selected
    const newMessagesWithUser = [...messagesWithoutLastQuickReplies, {
      role: 'user' as const,
      content: message,
      id: generateMessageId(),
      fieldTag: selectedFieldTag || undefined,
      dataTags: selectedDataTags.length > 0 ? selectedDataTags : undefined,
      replyToSuggestion: replyToSuggestion || undefined
    }];
    onChatMessagesChange(newMessagesWithUser);
    
    // Store reply context before clearing
    const currentReplyToSuggestion = replyToSuggestion;
    
    // Clear selected field tag, data tags, and reply after sending
    setSelectedFieldTag(null);
    setSelectedDataTags([]);
    setReplyToSuggestion(null);

    // 🔥 NEW: APPROVAL DETECTION LOGIC
    // Check if user is approving a previous AI proposal
    const approvalKeywords = /\b(yes|yeah|yep|ok|okay|apply|go ahead|do it|proceed|continue|confirm|approved|تمام|نفّذ|موافق|ماشي|روح|طبق|كمل|اعمل|نعم|أوكي|صح)\b/i;
    const isApproval = approvalKeywords.test(message);
    
    // If approval detected, check if last AI message was a proposal
    const lastAIMessage = messagesWithoutLastQuickReplies.filter(m => m.role === 'ai').slice(-1)[0];
    const lastAIWasProposal = lastAIMessage && !lastAIMessage.content.includes('[GENERATE_SUGGESTIONS]') && !lastAIMessage.content.includes('[GENERATE_CODE]');
    
    let enhancedMessage = message;
    if (isApproval && lastAIWasProposal) {
      console.log('🎯 APPROVAL DETECTED! User approved the proposal.');
      // Add approval context to help AI understand
      enhancedMessage = message + '\n\n[SYSTEM_NOTE: User approved your previous proposal. Execute now with [GENERATE_SUGGESTIONS]]';
    }

    // Call OpenAI for intelligent response
    try {
      const aiResponse = await callOpenAI(newMessagesWithUser, enhancedMessage, selectedFieldTag || undefined, currentReplyToSuggestion || undefined);
      
      // 🎯 Check if user is answering step selection question
      const selectedStepId = parseStepSelection(message);
      if (selectedStepId) {
        conversationContextStepRef.current = selectedStepId;
        console.log('🎯 User selected step:', selectedStepId);
        if (onStepClick) {
          onStepClick(selectedStepId);
        }
      }
      
      // 🎯 Check if AI is asking for step selection
      const isAskingForStep = detectStepSelection(aiResponse);
      
      // Check if AI wants to generate code
      let codeMatch = aiResponse.match(/\[GENERATE_CODE\]/);
      
      // 🔧 FALLBACK: Detect transformation keywords if AI forgot [GENERATE_CODE]
      if (!codeMatch) {
        const transformKeywords = /\b(split|separate|divide|extract|parse|get|domain|first name|last name|username|format|convert|transform|modify|substring|slice|فصل|اقسم|استخرج|جزء من|نطاق|اسم أول|اسم أخير|اسم مستخدم|حول|عدل|غير صيغة)\b/i;
        const userHasTransformKeyword = transformKeywords.test(message);
        const aiMentionsCode = /\b(code|كود|javascript|js|write|أكتب|سأكتب)\b/i.test(aiResponse);
        
        // If user asked for transformation and AI mentioned code but forgot tag
        if (userHasTransformKeyword && aiMentionsCode) {
          codeMatch = []; // Trigger code generation
        }
      }
      
      // Check if AI wants to generate suggestions
      const suggestionMatch = aiResponse.match(/\[GENERATE_SUGGESTIONS(?::([^\]]+))?\]/);
      let cleanedResponse = aiResponse;
      let fieldsToGenerate: string[] | undefined;
      
      // 🎯 Handle step selection question
      if (isAskingForStep && !codeMatch && !suggestionMatch) {
        cleanedResponse = aiResponse.replace(/\[ASK_STEP_SELECTION\]/, '').trim();
        
        const quickReplySteps = availableSteps?.map((step, index) => ({
          id: step.id,
          number: String(index + 1),
          name: step.name,
          appName: step.name
        })) || [];
        
        // Generate contextual quick replies as fallback
        const quickReplies = generateContextualQuickReplies({
          aiMessage: cleanedResponse,
          availableSteps: availableSteps || [],
          fieldsToFill: fieldsToFill || [],
          conversationHistory: chatMessagesRef.current
        });
        
        const messagesWithAI = [...chatMessagesRef.current, {
          role: 'ai' as const,
          content: cleanedResponse,
          id: generateMessageId(),
          quickReplySteps: quickReplySteps.length > 0 ? quickReplySteps : undefined,
          quickReplies: quickReplySteps.length === 0 && quickReplies.length > 0 ? quickReplies : undefined
        }];
        onChatMessagesChange(messagesWithAI);
        setIsLoading(false);
        onThinkingChange(false);
        return;
      }
      
      if (codeMatch) {
        // Remove the signal from the response
        cleanedResponse = aiResponse.replace(/\[GENERATE_CODE\]/, '').trim();
        
        // Generate contextual quick replies (usually none for code generation)
        const quickReplies = generateContextualQuickReplies({
          aiMessage: cleanedResponse,
          availableSteps: availableSteps || [],
          fieldsToFill: fieldsToFill || [],
          conversationHistory: chatMessagesRef.current
        });
        
        console.log('🎯 Generated quick replies (code):', quickReplies);
        
        // Add AI response (with quick replies only if not code)
        const messagesWithAI = [...chatMessagesRef.current, {
          role: 'ai' as const,
          content: cleanedResponse,
          id: generateMessageId(),
          quickReplies: quickReplies.length > 0 ? quickReplies : undefined
        }];
        onChatMessagesChange(messagesWithAI);
        
        // Generate code
        setTimeout(async () => {
          const codeData = await generateTransformCode(chatMessagesRef.current, message);
          
          // Add code message
          const codeMessageId = generateMessageId();
          console.log('💾 Saving code message with content:', codeData.code);
          const messagesWithCode = [...chatMessagesRef.current, {
            role: 'code' as const,
            content: codeData.code,
            id: codeMessageId,
            codeLanguage: 'javascript',
            isCodeComplete: false,
            newTag: codeData.tag
          }];
          onChatMessagesChange(messagesWithCode);
          
          // Make code visible for streaming
          setCodeVisible(prev => ({ ...prev, [codeMessageId]: true }));
          
          // After code completes streaming, hide it and show suggestions
          // This will be handled in the useEffect for code streaming
        }, 800);
      } else if (suggestionMatch) {
        // Remove the signal from the response
        cleanedResponse = aiResponse.replace(/\[GENERATE_SUGGESTIONS(?::([^\]]+))?\]/, '').trim();
        
        // Parse field names if specified
        if (suggestionMatch[1]) {
          fieldsToGenerate = suggestionMatch[1].split(',').map(f => f.trim());
        }
        
        // 🎯 CRITICAL FIX: If user was replying to a specific field and AI didn't specify fields,
        // force it to generate ONLY that field
        if (!fieldsToGenerate && currentReplyToSuggestion) {
          // Check if user wants ALL fields (mentioned "all", "everything", "rest", etc.)
          const wantsAllFields = /\b(all|everything|rest|other|others|كل|كلهم|باقي|جميع)\b/i.test(message);
          
          if (!wantsAllFields) {
            // User wants to modify only this specific field
            fieldsToGenerate = [currentReplyToSuggestion.fieldName];
          }
        }
        
        // Generate contextual quick replies (usually none for suggestions)
        const quickReplies = generateContextualQuickReplies({
          aiMessage: cleanedResponse,
          availableSteps: availableSteps || [],
          fieldsToFill: fieldsToFill || [],
          conversationHistory: chatMessagesRef.current
        });
        
        console.log('🎯 Generated quick replies (suggestions):', quickReplies);
        
        // Add AI response
        const messagesWithAI = [...chatMessagesRef.current, {
          role: 'ai' as const,
          content: cleanedResponse,
          id: generateMessageId(),
          quickReplies: quickReplies.length > 0 ? quickReplies : undefined
        }];
        onChatMessagesChange(messagesWithAI);
        
        // Generate suggestions if AI signaled
        setTimeout(async () => {
          await generateSuggestionsWithAI(fieldsToGenerate);
        }, 1000);
      } else {
        // Generate contextual quick replies
        const quickReplies = generateContextualQuickReplies({
          aiMessage: cleanedResponse,
          availableSteps: availableSteps || [],
          fieldsToFill: fieldsToFill || [],
          conversationHistory: chatMessagesRef.current
        });
        
        console.log('🎯 Generated quick replies:', quickReplies);
        
        // Add AI response with quick replies
        const messagesWithAI = [...chatMessagesRef.current, {
          role: 'ai' as const,
          content: cleanedResponse,
          id: generateMessageId(),
          quickReplies: quickReplies.length > 0 ? quickReplies : undefined
        }];
        onChatMessagesChange(messagesWithAI);
        
        setIsLoading(false);
        onThinkingChange(false);
        onHasNewMessageChange(true);
      }
    } catch (error) {
      console.log('ℹ️ Error in handleSendMessage:', error);
      setIsLoading(false);
      onThinkingChange(false);
    }
  };

  const handleStopGeneration = () => {
    // Clear all active streaming intervals
    activeIntervalsRef.current.forEach(interval => clearInterval(interval));
    activeIntervalsRef.current = [];
    
    // Clear all active timeouts
    activeTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    activeTimeoutsRef.current = [];
    
    // Find the last user message
    let lastUserMessage = '';
    let lastUserMessageIndex = -1;
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      if (chatMessages[i].role === 'user') {
        lastUserMessage = chatMessages[i].content;
        lastUserMessageIndex = i;
        break;
      }
    }
    
    // Keep messages up to and including the last user message, remove all AI responses after it
    if (lastUserMessageIndex !== -1) {
      const newMessages = chatMessages.slice(0, lastUserMessageIndex + 1); // +1 to include user message
      onChatMessagesChange(newMessages);
      
      // Copy the user message to the input field for editing
      setUserInput(lastUserMessage);
    }
    
    // Clear streaming state for removed messages
    const newStreamingText: { [key: string]: string } = {};
    Object.keys(streamingText).forEach(key => {
      const idx = parseInt(key);
      if (lastUserMessageIndex !== -1 && idx <= lastUserMessageIndex) {
        newStreamingText[idx] = streamingText[idx];
      }
    });
    setStreamingText(newStreamingText);
    
    // Update completed messages
    const newCompletedSet = new Set<number>();
    completedMessages.forEach(idx => {
      if (lastUserMessageIndex !== -1 && idx <= lastUserMessageIndex) {
        newCompletedSet.add(idx);
      }
    });
    setCompletedMessages(newCompletedSet);
    
    // Update last message count
    lastMessageCountRef.current = lastUserMessageIndex + 1;
    
    // Stop loading state
    setIsLoading(false);
    onThinkingChange(false);
  };

  const generateSuggestionsWithAI = async (specificFields?: string[]) => {
    // 🔧 CHECK: Make sure we have a conversation context step before generating suggestions
    if (!conversationContextStepRef.current && !currentStepId) {
      console.log('🔍 No conversation context step yet, attempting auto-selection...');
      console.log('🔍 Available steps:', availableSteps?.map(s => ({ id: s.id, name: s.name })) || []);
      
      // Try to infer the step from available steps
      if (availableSteps && availableSteps.length > 0) {
        // If there's only one action step (excluding trigger), use it
        const actionSteps = availableSteps.filter(s => s.id !== 'trigger');
        if (actionSteps.length === 1) {
          console.log('✅ Auto-selecting single action step:', actionSteps[0].id);
          conversationContextStepRef.current = actionSteps[0].id;
          // Also call onStepClick to update the UI
          if (onStepClick) {
            onStepClick(actionSteps[0].id);
          }
          // Wait a bit for fieldsToFill to update, then retry
          setTimeout(() => generateSuggestionsWithAI(specificFields), 300);
          return;
        } else if (actionSteps.length > 1) {
          // Multiple steps - auto-select first one and ask user
          console.log('🎯 Multiple steps available, auto-selecting first and asking user');
          conversationContextStepRef.current = actionSteps[0].id;
          if (onStepClick) {
            onStepClick(actionSteps[0].id);
          }
          
          // Generate a message asking which step to work on
          const stepOptions = actionSteps.map((s, idx) => `${idx + 1}. ${s.name}`).join('\n');
          const askStepMessage: ChatMessage = {
            id: generateMessageId(),
            role: 'ai',
            content: `I see you have ${actionSteps.length} steps. Which one would you like to work on?\n\n${stepOptions}\n\nI'll start with "${actionSteps[0].name}" for now, but feel free to tell me which step you'd prefer! 🎯`,
            quickReplySteps: actionSteps.map(s => ({ id: s.id, name: s.name, icon: s.icon, color: s.color }))
          };
          
          onChatMessagesChange([...chatMessagesRef.current, askStepMessage]);
          setIsLoading(false);
          onThinkingChange(false);
          return;
        } else {
          // No action steps at all (only trigger)
          console.log('ℹ️ No action steps available to configure yet.');
          setIsLoading(false);
          onThinkingChange(false);
          return;
        }
      } else {
        console.log('ℹ️ No steps available yet. Waiting for workflow setup.');
        setIsLoading(false);
        onThinkingChange(false);
        return;
      }
    }
    
    // 🔥 Ensure conversation context is set before generating suggestions
    if (currentStepId && !conversationContextStepRef.current) {
      console.log('🔧 Setting conversation context right before generating suggestions:', currentStepId);
      conversationContextStepRef.current = currentStepId;
    }
    
    const timeout = setTimeout(async () => {
      // Generate suggestions (all or specific fields)
      const generatedSuggestions: Suggestion[] = await generateAISuggestions(chatMessagesRef.current, specificFields);

      // Add step info to suggestions
      const suggestionsWithStepInfo = generatedSuggestions.map(s => ({
        ...s,
        stepId: currentStepId,
        stepName: currentStepName,
        stepIcon: currentStepIcon,
        stepColor: currentStepColor
      }));

      // Add suggestions as a message in the chat (without intro text)
      const messagesWithSuggestions = [...chatMessagesRef.current, {
        role: 'suggestions' as const,
        content: '',
        suggestions: suggestionsWithStepInfo,
        id: generateMessageId()
      }];
      onChatMessagesChange(messagesWithSuggestions);
      chatMessagesRef.current = messagesWithSuggestions;
      
      onSuggestionsChange(suggestionsWithStepInfo);
      onShowSuggestionsChange(true);
      setIsLoading(false);
      onThinkingChange(false);
      onHasNewMessageChange(true);
      
      // Remove timeout from active list
      activeTimeoutsRef.current = activeTimeoutsRef.current.filter(t => t !== timeout);
    }, 1800);
    
    activeTimeoutsRef.current.push(timeout);
  };

  // Detect user language from chat history
  const detectUserLanguage = (): 'ar' | 'en' | 'he' => {
    const userMessages = chatMessagesRef.current.filter(msg => msg.role === 'user');
    
    // Check last few user messages for language patterns
    const recentMessages = userMessages.slice(-3);
    const hebrewPattern = /[\u0590-\u05FF]/;
    const arabicPattern = /[\u0600-\u06FF]/;
    
    for (const msg of recentMessages) {
      if (hebrewPattern.test(msg.content)) {
        return 'he';
      }
      if (arabicPattern.test(msg.content)) {
        return 'ar';
      }
    }
    
    return 'en';
  };

  const handleInsertSuggestion = (suggestion: Suggestion) => {
    // If suggestion has stepId, open that step first
    if (suggestion.stepId && onStepClick) {
      onStepClick(suggestion.stepId);
    }
    
    // DON'T request focus - just fill the field silently to avoid opening Data Selector
    // if (onCurrentFieldChange) {
    //   onCurrentFieldChange(suggestion.fieldName);
    // }
    
    // Simulate streaming effect when inserting - SKIP FOCUS to prevent Data Selector
    onFieldFilled(suggestion.fieldName, suggestion.value, true); // skipFocus = true
    
    // Remove suggestion from the external list
    const newSuggestions = suggestions.filter(s => s.fieldName !== suggestion.fieldName);
    onSuggestionsChange(newSuggestions);
    
    // Update all suggestion messages in chat to remove this suggestion (no completion message for manual actions)
    const updatedMessages = chatMessagesRef.current
      .map(msg => {
        if ((msg.role === 'suggestions' || msg.role === 'code-suggestion') && msg.suggestions) {
          const filteredSuggestions = msg.suggestions.filter(s => s.fieldName !== suggestion.fieldName);
          
          return {
            ...msg,
            suggestions: filteredSuggestions
          };
        }
        return msg;
      })
      .filter(msg => {
        // Remove code-suggestion messages that have no suggestions left
        if (msg.role === 'code-suggestion' && (!msg.suggestions || msg.suggestions.length === 0)) {
          return false;
        }
        return true;
      });
    
    onChatMessagesChange(updatedMessages);
    
    // Check if all suggestions have been inserted
    const hasAnySuggestionsLeft = updatedMessages.some(msg => 
      (msg.role === 'suggestions' || msg.role === 'code-suggestion') && msg.suggestions && msg.suggestions.length > 0
    );
    
    if (!hasAnySuggestionsLeft) {
      // Detect user language and add completion message
      const language = detectUserLanguage();
      const completionMessage = language === 'ar' 
        ? 'تم إدراج كل المقترحات ✅' 
        : language === 'he'
        ? 'כל ההצעות הוכנסו ✅'
        : 'All suggestions have been inserted ✅';
      
      const messagesWithCompletion = [...updatedMessages, {
        role: 'ai' as const,
        content: completionMessage,
        id: generateMessageId()
      }];
      onChatMessagesChange(messagesWithCompletion);
      onHasNewMessageChange(true);
    }
  };

  const handleRemoveSuggestion = (fieldName: string) => {
    // Remove from external list
    const newSuggestions = suggestions.filter(s => s.fieldName !== fieldName);
    onSuggestionsChange(newSuggestions);
    
    // Update all suggestion messages in chat (no completion message for manual actions)
    const updatedMessages = chatMessagesRef.current
      .map(msg => {
        if ((msg.role === 'suggestions' || msg.role === 'code-suggestion') && msg.suggestions) {
          const filteredSuggestions = msg.suggestions.filter(s => s.fieldName !== fieldName);
          
          return {
            ...msg,
            suggestions: filteredSuggestions
          };
        }
        return msg;
      })
      .filter(msg => {
        // Remove code-suggestion messages that have no suggestions left
        if (msg.role === 'code-suggestion' && (!msg.suggestions || msg.suggestions.length === 0)) {
          return false;
        }
        return true;
      });
    
    onChatMessagesChange(updatedMessages);
  };

  // 🎯 Handle step selection from quick reply buttons
  const handleStepSelection = async (stepId: string, stepNumber: string, stepName: string) => {
    if (isLoading) return;
    
    conversationContextStepRef.current = stepId;
    console.log('🎯 User selected step via button:', stepId);
    
    if (onStepClick) {
      onStepClick(stepId);
    }
    
    const message = `Step ${stepNumber}`;
    setUserInput('');
    setIsLoading(true);
    onThinkingChange(true);
    
    const messagesWithoutQuickReplies = chatMessagesRef.current.filter(msg => !msg.quickReplySteps);
    
    const newMessagesWithUser = [...messagesWithoutQuickReplies, {
      role: 'user' as const,
      content: message,
      id: generateMessageId()
    }];
    onChatMessagesChange(newMessagesWithUser);
    
    try {
      const aiResponse = await callOpenAI(newMessagesWithUser, message);
      const codeMatch = aiResponse.match(/\[GENERATE_CODE\]/);
      const suggestionMatch = aiResponse.match(/\[GENERATE_SUGGESTIONS(?::([^\]]+))?\]/);
      let cleanedResponse = aiResponse.replace(/\[GENERATE_CODE\]|\[GENERATE_SUGGESTIONS(?::([^\]]+))?\]/, '').trim();
      
      const messagesWithAI = [...chatMessagesRef.current, {
        role: 'ai' as const,
        content: cleanedResponse,
        id: generateMessageId()
      }];
      onChatMessagesChange(messagesWithAI);
      
      if (suggestionMatch) {
        const fieldsToGenerate = suggestionMatch[1] ? suggestionMatch[1].split(',').map(f => f.trim()) : undefined;
        setTimeout(async () => {
          const newSuggestions = await generateAISuggestions(chatMessagesRef.current, fieldsToGenerate);
          onSuggestionsChange(newSuggestions);
          onShowSuggestionsChange(true);
          setIsLoading(false);
          onThinkingChange(false);
        }, 800);
      } else {
        setIsLoading(false);
        onThinkingChange(false);
      }
    } catch (error) {
      console.log('ℹ️ Note: Step selection flow adjustment needed:', error);
      setIsLoading(false);
      onThinkingChange(false);
    }
  };

  const handleQuickReply = async (reply: string) => {
    if (isLoading) return;
    
    // Treat it as if user typed and sent this message
    setUserInput('');
    setIsLoading(true);
    onThinkingChange(true);
    
    // User replied in this step - confirm pending messages
    if (pendingMessageIdsRef.current.size > 0 && pendingStepRef.current === currentStepNumber) {
      pendingMessageIdsRef.current.clear();
      pendingStepRef.current = '';
    }
    
    // ✅ Hide quick replies but keep the messages (don't delete them)
    const messagesWithoutQuickReplies = chatMessagesRef.current.map(msg => {
      if (msg.quickReplies || msg.quickReplySteps) {
        // Remove quick replies/steps but keep the message itself
        const { quickReplies, quickReplySteps, ...messageWithoutReplies } = msg;
        return messageWithoutReplies;
      }
      return msg;
    });
    onChatMessagesChange(messagesWithoutQuickReplies);
    
    // Add user message as a new separate message
    const newMessagesWithUser = [...messagesWithoutQuickReplies, {
      role: 'user' as const,
      content: reply,
      id: generateMessageId(),
      fieldTag: fieldsToFillRef.current.find(field => field.label === reply)?.name // Add field name tag if applicable
    }];
    onChatMessagesChange(newMessagesWithUser);

    // Call OpenAI for intelligent response
    try {
      const aiResponse = await callOpenAI(newMessagesWithUser, reply);
      
      // Check if AI wants to generate suggestions
      const suggestionMatch = aiResponse.match(/\[GENERATE_SUGGESTIONS(?::([^\]]+))?\]/);
      let cleanedResponse = aiResponse;
      let fieldsToGenerate: string[] | undefined;
      
      if (suggestionMatch) {
        // Remove the signal from the response
        cleanedResponse = aiResponse.replace(/\[GENERATE_SUGGESTIONS(?::([^\]]+))?\]/, '').trim();
        
        // Parse field names if specified
        if (suggestionMatch[1]) {
          fieldsToGenerate = suggestionMatch[1].split(',').map(f => f.trim());
        }
        
        // Note: Quick replies don't support reply-to-suggestion context
        // If we need this in the future, we can add it here
      }
      
      // Add AI response
      const messagesWithAI = [...chatMessagesRef.current, {
        role: 'ai' as const,
        content: cleanedResponse,
        id: generateMessageId()
      }];
      onChatMessagesChange(messagesWithAI);
      
      // Generate suggestions if AI signaled
      if (suggestionMatch) {
        setTimeout(async () => {
          await generateSuggestionsWithAI(fieldsToGenerate);
        }, 1000);
      } else {
        setIsLoading(false);
        onThinkingChange(false);
        onHasNewMessageChange(true);
      }
    } catch (error) {
      console.log('ℹ️ Quick reply processing note:', error);
      setIsLoading(false);
      onThinkingChange(false);
    }
  };

  // Minimized notch view - return null, will be rendered by parent
  if (isMinimized) {
    return null;
  }

  return (
    <div 
      className="w-full bg-white flex flex-col overflow-hidden relative" 
      style={{ height: '100%' }}
      onMouseDown={(e) => {
        // If clicking outside textarea, blur it
        if (textareaRef.current && e.target !== textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
          textareaRef.current.blur();
        }
      }}
    >
      {/* Blur animation for streaming words */}
      <style>{`
        @keyframes wordUnblur {
          0% {
            filter: blur(4px);
            opacity: 0.4;
          }
          100% {
            filter: blur(0px);
            opacity: 1;
          }
        }
        .streaming-word {
          display: inline-block;
          animation: wordUnblur 0.3s ease-out forwards;
        }
        
        @keyframes slideFromIcon {
          from {
            opacity: 0;
            transform: translateX(-10px) scale(0.85);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        
        /* Hide scrollbar when not needed */
        .chat-container-hidden-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {/* Header */}
      <div className="sticky top-0 left-0 right-0 flex items-center justify-between px-4 py-2.5 bg-gradient-to-b from-white from-85% to-transparent shrink-0 z-10 pointer-events-none">
        <h3 className="text-sm font-medium text-gray-900">AI Assistant</h3>
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="relative">
            <button
              ref={resetButtonRef}
              onClick={() => {
                // If AI is currently writing, stop it first
                if (isLoading) {
                  // Stop generation
                  activeIntervalsRef.current.forEach(interval => clearInterval(interval));
                  activeIntervalsRef.current = [];
                  activeTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
                  activeTimeoutsRef.current = [];
                  setIsLoading(false);
                  onThinkingChange(false);
                }
                
                // Clear input box
                setUserInput('');
                
                // Reset conversation
                hasStartedRef.current = false; // Reset to show general greeting again
                hasAddedHeaderOnMountRef.current = false;
                conversationContextStepRef.current = null;
                onChatMessagesChange([]);
                onSuggestionsChange([]);
                onShowSuggestionsChange(false);
                onThinkingChange(false);
                setShowResetTooltip(false);
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Reset Conversation"
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setResetTooltipPos({
                  top: rect.bottom + 4,
                  left: rect.left + rect.width / 2
                });
                setShowResetTooltip(true);
              }}
              onMouseLeave={() => setShowResetTooltip(false)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
            </button>
            
            {showResetTooltip && (
              <div className="fixed bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap" style={{ 
                top: `${resetTooltipPos.top}px`,
                left: `${resetTooltipPos.left}px`,
                transform: 'translateX(-50%)',
                zIndex: 99999 
              }}>
                Reset Conversation
              </div>
            )}
          </div>
          
          {onClose && (
            <div className="relative">
              <button
                ref={minimizeButtonRef}
                onClick={() => {
                  // حفظ أن المستخدم صغّر الشات لأول مرة
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('aiChatMinimizedOnce', 'true');
                  }
                  onMinimizedChange?.(true);
                  setShowMinimizeTooltip(false);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMinimizeTooltipPos({
                    top: rect.bottom + 4,
                    left: rect.left + rect.width / 2
                  });
                  setShowMinimizeTooltip(true);
                }}
                onMouseLeave={() => setShowMinimizeTooltip(false)}
              >
                <PanelLeft size={16} className="text-gray-400" />
              </button>
              
              {showMinimizeTooltip && (
                <div className="fixed bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap" style={{ 
                  top: `${minimizeTooltipPos.top}px`,
                  left: `${minimizeTooltipPos.left}px`,
                  transform: 'translateX(-50%)',
                  zIndex: 99999 
                }}>
                  Minimize
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Start Actions - Show only when chat is empty */}
      {/* Chat Messages */}
      <div 
        ref={chatContainerRef}
        className={`flex-1 p-0 relative ${shouldShowScroll ? 'overflow-y-auto' : 'overflow-y-hidden chat-container-hidden-scroll'}`}
        style={{
          // Hide scrollbar when not needed
          scrollbarWidth: shouldShowScroll ? 'thin' : 'none',
          msOverflowStyle: shouldShowScroll ? 'auto' : 'none',
        }}
      >
        <QuickStartActions 
          onActionClick={handleQuickAction}
          isVisible={chatMessages.length === 0}
        />

        <div className="p-4 pb-[120px] space-y-8">
        {chatMessages.map((msg, index) => {
          // Render step header
          if (msg.role === 'step-header') {
            // Check if this is the first step header
            const isFirstStepHeader = !chatMessages.slice(0, index).some(m => m.role === 'step-header');
            
            return null;
          }
          
          // Render code box with streaming
          if (msg.role === 'code' && codeVisible[msg.id]) {
            const displayCode = streamingCode[msg.id] || msg.content;
            console.log('📺 Displaying code for message:', msg.id, 'length:', displayCode?.length || 0);
            
            return (
              <div 
                key={msg.id || index}
                ref={(el) => {
                  if (el) messageRefsMap.current.set(msg.id, el);
                }}
                className="transition-opacity duration-500"
                style={{ 
                  opacity: codeVisible[msg.id] ? 1 : 0,
                }}
              >
                <div className="border border-gray-200 rounded-lg bg-white overflow-hidden" style={{ maxHeight: '150px' }}>
                  <div 
                    ref={(el) => {
                      if (el) codeContainerRefs.current.set(msg.id, el);
                    }}
                    className="p-3 overflow-y-auto h-[150px]"
                  >
                    <SyntaxHighlighter
                      language="javascript"
                      style={prism}
                      customStyle={{
                        fontSize: '12px',
                        margin: 0,
                        padding: 0,
                        background: 'transparent',
                      }}
                      codeTagProps={{
                        style: {
                          background: 'transparent',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        }
                      }}
                      showLineNumbers={false}
                    >
                      {displayCode}
                    </SyntaxHighlighter>
                  </div>
                </div>
                
                {/* Show new tag info */}
                {msg.newTag && msg.isCodeComplete && (
                  <div className="mt-2 text-xs text-gray-600 flex items-center gap-1">
                    <Sparkles size={12} className="text-[hsl(257,74%,57%)]" />
                    <span>
                      {detectUserLanguage() === 'ar' 
                        ? `سيتم إنشاء: ${msg.newTag.name} - ${msg.newTag.description}`
                        : detectUserLanguage() === 'he'
                        ? `יוצר: ${msg.newTag.name} - ${msg.newTag.description}`
                        : `Creating: ${msg.newTag.name} - ${msg.newTag.description}`
                      }
                    </span>
                  </div>
                )}
              </div>
            );
          }
          
          // Render code suggestion box (without header)
          if (msg.role === 'code-suggestion' && msg.suggestions && msg.suggestions.length > 0) {
            return (
              <div 
                key={msg.id || index} 
                ref={(el) => {
                  if (el) messageRefsMap.current.set(msg.id, el);
                }}
                className="border border-gray-300 rounded-lg bg-white overflow-hidden p-3"
              >
                {/* No header for code suggestions */}
                {msg.suggestions.map((suggestion, suggestionIndex) => (
                  <div 
                    key={suggestionIndex} 
                    className="mb-3 last:mb-0"
                  >
                    {/* Show description for code-generated tags */}
                    {suggestion.description && (
                      <div className="mb-2 text-[14px] text-black font-sans flex items-center gap-1.5">
                        {suggestion.description}
                      </div>
                    )}
                    
                    <div className="text-[11px] text-gray-700 font-mono mb-2 break-words whitespace-pre-wrap">
                      {renderSuggestionValueWrapped(suggestion.value)}
                    </div>
                    
                    {/* Code expansion area */}
                    {expandedCode.has(`${msg.id}-${suggestionIndex}`) && (
                      <div className="mt-3 mb-3 border border-gray-200 rounded-lg bg-gray-50 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] text-gray-500 font-sans">Code</span>
                          <button
                            onClick={() => {
                              // Fallback copy method for browsers with clipboard restrictions
                              const textarea = document.createElement('textarea');
                              textarea.value = suggestion.value;
                              textarea.style.position = 'fixed';
                              textarea.style.opacity = '0';
                              document.body.appendChild(textarea);
                              textarea.select();
                              try {
                                document.execCommand('copy');
                              } catch (err) {
                                console.log('ℹ️ Copy operation note:', err);
                              }
                              document.body.removeChild(textarea);
                            }}
                            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                            title="Copy code"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                        {suggestion.value.startsWith('{{Code.') ? (
                          <SyntaxHighlighter
                            language="javascript"
                            style={prism}
                            customStyle={{
                              fontSize: '12px',
                              margin: 0,
                              padding: 0,
                              background: 'transparent',
                            }}
                            codeTagProps={{
                              style: {
                                background: 'transparent',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                              }
                            }}
                            showLineNumbers={false}
                          >
                              {`/**
 * Dummy JavaScript code
 * Purpose: simulate a fake API client with async behavior
 */

// Fake in-memory database
const fakeDB = {
  users: [
    { id: "u1", name: "Alice", role: "admin" },
    { id: "u2", name: "Bob", role: "viewer" },
  ],
  messages: [],
};

// Utility helpers
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const generateId = (prefix = "id") =>
  \`\${prefix}_\${Math.random().toString(36).slice(2)}_\${Date.now()}\`;

function log(event, data = {}) {
  const timestamp = new Date().toISOString();
  try {
    console.log(\`[\${timestamp}] \${event}\`, JSON.parse(JSON.stringify(data)));
  } catch (e) {
    console.log(\`[\${timestamp}] \${event}\`, '[Complex object - cannot stringify]');
  }
}

// Fake API client
class FakeApiClient {
  constructor({ apiKey }) {
    this.apiKey = apiKey;
  }

  #validateKey() {
    if (!this.apiKey || !this.apiKey.startsWith("sk-")) {
      const error = new Error("Unauthorized: invalid API key");
      error.status = 401;
      throw error;
    }
  }

  async getUser(userId) {
    this.#validateKey();
    log("getUser:start", { userId });

    await sleep(200);

    const user = fakeDB.users.find((u) => u.id === userId);
    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      log("getUser:error", { status: error.status });
      throw error;
    }

    log("getUser:success", user);
    return { success: true, data: user };
  }

  async createMessage(userId, content) {
    this.#validateKey();
    log("createMessage:start", { userId });

    await sleep(300);

    const message = {
      id: generateId("msg"),
      userId,
      content: String(content),
      createdAt: new Date().toISOString(),
    };

    fakeDB.messages.push(message);

    log("createMessage:success", message);
    return { success: true, data: message };
  }

  async listMessages(userId) {
    this.#validateKey();
    log("listMessages:start", { userId });

    await sleep(150);

    const messages = fakeDB.messages.filter((m) => m.userId === userId);
    log("listMessages:success", { count: messages.length });

    return { success: true, data: messages };
  }
}

// Demo runner
(async function runDemo() {
  log("app:start");

  const client = new FakeApiClient({
    apiKey: "sk-demo_fake_key",
  });

  try {
    const user = await client.getUser("u1");
    await client.createMessage(user.data.id, "This is a dummy message.");

    const messages = await client.listMessages(user.data.id);

    console.log("\\n--- MESSAGES ---");
    messages.data.forEach((m) => {
      console.log(\`[\${m.id}] \${m.content}\`);
    });
  } catch (err) {
    console.log("ℹ️ Note:", err.message, err.status);
  } finally {
    log("app:end");
  }
})();`}
                          </SyntaxHighlighter>
                        ) : (
                          <pre className="text-[11px] text-gray-800 font-mono overflow-x-auto">
                            <code className="block whitespace-pre-wrap break-all">
                              {renderSuggestionValueWrapped(suggestion.value)}
                            </code>
                          </pre>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between gap-2 mt-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setReplyToSuggestion({ ...suggestion, messageId: msg.id });
                            setSelectedFieldTag(null);
                            setSelectedDataTags([]); // Clear data tags when replying
                          }}
                          className="px-2 py-1 text-gray-600 border border-gray-300 rounded text-[11px] hover:bg-gray-50 transition-colors flex items-center gap-1 bg-white font-sans"
                        >
                          <CornerDownLeft size={11} />
                          Reply
                        </button>
                        <button
                          onClick={() => {
                            const suggestionId = `${msg.id}-${suggestion.fieldName}`;
                            setSavedSuggestions(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(suggestionId)) {
                                newSet.delete(suggestionId);
                              } else {
                                newSet.add(suggestionId);
                              }
                              return newSet;
                            });
                          }}
                          className="px-2 py-1 text-gray-600 border border-gray-300 rounded text-[11px] hover:bg-gray-50 transition-colors flex items-center gap-1 bg-white font-sans"
                        >
                          <Bookmark 
                            size={11} 
                            fill={savedSuggestions.has(`${msg.id}-${suggestion.fieldName}`) ? 'currentColor' : 'none'}
                            className={savedSuggestions.has(`${msg.id}-${suggestion.fieldName}`) ? 'text-[hsl(257,74%,57%)]' : ''}
                          />
                          {savedSuggestions.has(`${msg.id}-${suggestion.fieldName}`) ? 'Saved' : 'Save'}
                        </button>
                      </div>
                      
                      <button
                        onClick={() => {
                          const codeId = `${msg.id}-${suggestionIndex}`;
                          setExpandedCode(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(codeId)) {
                              newSet.delete(codeId);
                            } else {
                              newSet.add(codeId);
                            }
                            return newSet;
                          });
                        }}
                        className="px-2 py-1 text-gray-600 rounded text-[11px] hover:bg-gray-100 transition-colors font-sans outline-none"
                      >
                        {expandedCode.has(`${msg.id}-${suggestionIndex}`) ? 'Hide Code' : 'Show Code'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          }
          
          // Render suggestions box
          if (msg.role === 'suggestions' && msg.suggestions && msg.suggestions.length > 0) {
            return (
              <div 
                key={msg.id || index} 
                ref={(el) => {
                  if (el) messageRefsMap.current.set(msg.id, el);
                }}
                className="bg-white overflow-hidden"
              >
                <div>
                  {msg.suggestions.map((suggestion, suggestionIndex) => (
                    <div 
                      key={suggestionIndex} 
                      className="mb-4 last:mb-0"
                    >
                      {/* Label with asterisk */}
                      <div className="flex gap-[2px] items-center mb-1">
                        <p className="font-semibold text-[14px] text-[#364153] tracking-[-0.1504px]">
                          {suggestion.fieldLabel || 'Field'}
                        </p>
                        {!suggestion.description && (
                          <span className="text-[#fb2c36] text-[14px]">*</span>
                        )}
                      </div>
                      
                      {/* Container for line + content + buttons */}
                      <div className="flex items-stretch">
                        {/* Left vertical line */}
                        <div className="w-[12px] shrink-0 flex items-stretch">
                          <svg className="block w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 100">
                            <path d="M6 0L6 100" stroke="#D3DAE6" strokeWidth="4" vectorEffect="non-scaling-stroke" />
                          </svg>
                        </div>
                        
                        {/* Content area - flex column wrapper */}
                        <div className="flex flex-col flex-1 min-w-0">
                            {/* Show description if available (for code-generated tags) */}
                            {suggestion.description && (
                              <div className="mb-2 text-[11px] text-gray-600 italic px-[10px] pt-[10px]">
                                {suggestion.description}
                              </div>
                            )}
                            
                            {/* Value */}
                            <div className="text-[14px] text-[#747c88] font-normal leading-[16.5px] p-[10px]">
                              {renderSuggestionValue(suggestion.value)}
                            </div>
                          
                          {/* Show example if available (for code-generated tags) */}
                          {suggestion.example && (
                            <div className="text-[10px] text-gray-500 px-[10px] pb-[10px]">
                              {detectUserLanguage() === 'ar' ? 'مثال: ' : detectUserLanguage() === 'he' ? 'דוגמה: ' : 'Example: '}
                              <span className="font-mono text-gray-700">{suggestion.example}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Buttons on the right */}
                        <div className="flex gap-1 items-start py-1 px-1">
                          <div className="relative group">
                            <button
                              onClick={() => {
                                setReplyToSuggestion({ ...suggestion, messageId: msg.id });
                                setSelectedFieldTag(null);
                                setSelectedDataTags([]);
                              }}
                              className="bg-white w-6 h-6 flex items-center justify-center border-0 rounded hover:bg-gray-50 transition-colors"
                              title="Reply"
                            >
                              <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 14 14">
                                <path d="M11.6667 2.33333V6.41667C11.6667 7.03551 11.4208 7.629 10.9832 8.06658C10.5457 8.50417 9.95217 8.75 9.33333 8.75H2.33333" stroke="#4A5565" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
                                <path d="M5.25 5.83333L2.33333 8.75L5.25 11.6667" stroke="#4A5565" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
                              </svg>
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                              Reply
                            </div>
                          </div>
                          <div className="relative group">
                            <button
                              onClick={() => handleInsertSuggestion(suggestion)}
                              className="bg-white w-6 h-6 flex items-center justify-center border-0 rounded hover:bg-gray-50 transition-colors"
                              title="Insert"
                            >
                              <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 14 14">
                                <path d="M11.6667 3.5L5.25 9.91667L2.33333 7" stroke="#4A5565" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
                              </svg>
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                              Insert
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          
          // Render regular messages
          return (
            <div
              key={msg.id || index}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* Field Tag - Above the message bubble for user messages */}
              {msg.role === 'user' && msg.fieldTag && (
                <div className="flex items-center gap-1.5 bg-[hsl(257,74%,97%)] rounded px-[6px] py-[4px] w-fit mb-1 mr-10">
                  <TextCursorInput size={14} className="text-[hsl(257,74%,65%)]" />
                  <span className="text-[10px] text-[hsl(257,74%,45%)]">{msg.fieldTag}</span>
                </div>
              )}
              
              {/* Data Tags - Above the message bubble for user messages */}
              {msg.role === 'user' && msg.dataTags && msg.dataTags.length > 0 && (
                <div className="flex items-end gap-2 w-fit max-w-[90%] mb-1 mr-10 ml-10 opacity-55 hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1 flex-wrap">
                    {msg.dataTags.map((tag, index) => (
                      <DataTag
                        key={index}
                        tag={tag}
                        size="sm"
                        disableHover={true}
                      />
                    ))}
                  </div>
                  <CornerDownLeft size={14} className="text-gray-600 shrink-0" />
                </div>
              )}
              
              {/* Reply to Suggestion - Above the message bubble for user messages */}
              {msg.role === 'user' && msg.replyToSuggestion && (
                <div 
                  className="flex items-end gap-2 w-fit max-w-[90%] mb-1 mr-10 ml-10 opacity-55 hover:opacity-100 cursor-pointer transition-opacity"
                  onClick={() => {
                    if (msg.replyToSuggestion?.messageId) {
                      scrollToMessage(msg.replyToSuggestion.messageId);
                    }
                  }}
                >
                  <div className="text-xs text-gray-900 flex-1 line-clamp-3">
                    {renderSuggestionValueWrapped(msg.replyToSuggestion.value)}
                  </div>
                  <CornerDownLeft size={14} className="text-gray-600 shrink-0" />
                </div>
              )}
              
              <div className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'user' && (
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center order-2 overflow-hidden ${msg.fieldTag || msg.dataTags || msg.replyToSuggestion ? '-mt-3' : ''}`}>
                    <img 
                      src="https://images.unsplash.com/photo-1729824186959-ba83cbd1978d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBwZXJzb24lMjBhdmF0YXJ8ZW58MXx8fHwxNzY4MjI2Nzc2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
                      alt="User Avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div
                  className={`${
                    msg.role === 'user'
                      ? 'max-w-[90%] bg-gray-100 text-gray-900 rounded-lg p-3 order-1'
                      : 'w-full text-gray-900'
                  }`}
                >
                  <div className="text-sm whitespace-normal break-words leading-relaxed">
                    {msg.role === 'ai' 
                      ? (completedMessages.has(msg.id) 
                        ? renderAIMessage(msg.content) 
                        : (() => {
                            const currentText = streamingText[msg.id] || '';
                            if (!currentText) return null;
                            
                            const words = currentText.split(' ');
                            if (words.length === 0) return null;
                            
                            const lastWord = words[words.length - 1];
                            const previousWords = words.slice(0, -1).join(' ');
                            
                            return (
                              <span>
                                {previousWords && renderAIMessage(previousWords)}
                                {previousWords && lastWord && ' '}
                                {lastWord && <span key={currentText.length} className="streaming-word">{lastWord}</span>}
                              </span>
                            );
                          })()) 
                      : msg.content}
                  </div>
                  
                  {/* Quick Replies - Show after streaming completes */}
                  {msg.role === 'ai' && msg.quickReplies && msg.quickReplies.length > 0 && completedMessages.has(msg.id) && (
                    <div className="flex flex-col gap-[4px] mt-2 mr-[0px] mb-[0px] ml-[0px]">
                      {msg.quickReplies.map((reply, replyIndex) => (
                        <button
                          key={replyIndex}
                          onClick={() => handleQuickReply(reply)}
                          disabled={isLoading}
                          className="px-3 py-1.5 text-xs text-[rgb(22,35,51)] bg-gray-100 rounded-md hover:bg-gray-200 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed w-fit"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Step Selection Quick Replies - Show after streaming completes */}
                  {msg.role === 'ai' && msg.quickReplySteps && msg.quickReplySteps.length > 0 && completedMessages.has(msg.id) && (
                    <div className="flex flex-col gap-[6px] mt-2">
                      {msg.quickReplySteps.map((step, stepIndex) => (
                        <button
                          key={stepIndex}
                          onClick={() => handleStepSelection(step.id, step.number, step.name)}
                          disabled={isLoading}
                          className="px-4 py-2.5 text-sm text-left rounded-lg border border-gray-300 hover:border-[hsl(257,74%,57%)] hover:bg-[hsl(257,74%,97%)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-[hsl(257,74%,57%)] group-hover:text-[hsl(257,74%,47%)]">
                              {step.number}
                            </span>
                            <span className="text-gray-900">
                              {step.name}
                            </span>
                          </div>
                          <ArrowUp size={14} className="text-gray-400 group-hover:text-[hsl(257,74%,57%)] transform -rotate-90 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Thinking</span>
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="absolute bottom-0 w-full px-3 pb-3 pt-[20px] shrink-0 bg-gradient-to-t from-white from-85% to-transparent pointer-events-none z-10">
        <div 
          className="rounded-[10px] bg-white relative pointer-events-auto shadow-[0px_4px_0px_0px_#f7e2ff] transition-all"
          style={{
            border: '1.5px solid transparent',
            backgroundImage: isInputFocused 
              ? 'linear-gradient(white, white), linear-gradient(90deg, #8800F7 0%, #EF9C01 50%, #007DEA 100%)'
              : 'linear-gradient(white, white), linear-gradient(90deg, #FAADFF 0%, #FFD68A 50%, #8AC8FF 100%)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          {/* Field Tag Preview - above textarea */}
          {selectedFieldTag && (
            <div className="p-[4px] border-b border-gray-200 bg-white rounded-t-lg px-[8px] py-[6px]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 bg-[#F9FAFB]">
                  <TextCursorInput size={14} className="text-gray-600" />
                  <span className="text-xs text-gray-700">{selectedFieldTag}</span>
                </div>
                <button
                  onClick={() => setSelectedFieldTag(null)}
                  className="p-0.5 hover:bg-gray-300 rounded transition-colors"
                >
                  <X size={12} className="text-gray-600" />
                </button>
              </div>
            </div>
          )}
          
          {/* Data Tags Preview - above textarea */}
          {selectedDataTags.length > 0 && (
            <div className="max-h-32 overflow-y-auto border-b border-gray-200 bg-white rounded-t-lg px-[8px] py-[6px]">
              <div className="flex items-center gap-1 flex-wrap">
                {selectedDataTags.map((tag, index) => (
                  <DataTag
                    key={index}
                    tag={tag}
                    onRemove={() => {
                      setSelectedDataTags(prev => prev.filter((_, i) => i !== index));
                    }}
                    size="sm"
                    disableHover={true}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Reply to Suggestion Box - above textarea */}
          {replyToSuggestion && (
            <div className="p-[4px] border-b border-gray-200 bg-white rounded-t-lg px-[8px] py-[6px]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-0.5 flex-1 min-w-0 overflow-hidden">
                  <CornerDownLeft size={12} className="text-gray-600 shrink-0" />
                  <span className="text-xs text-gray-700 truncate">{renderSuggestionValueInline(replyToSuggestion.value)}</span>
                </div>
                <button
                  onClick={() => setReplyToSuggestion(null)}
                  className="p-0.5 hover:bg-gray-300 rounded transition-colors shrink-0"
                >
                  <X size={12} className="text-gray-600" />
                </button>
              </div>
            </div>
          )}
          
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            onKeyDown={(e) => {
              // Allow Ctrl+A and other keyboard shortcuts
              if (e.ctrlKey || e.metaKey) {
                e.stopPropagation(); // Prevent any parent handlers from interfering
                return; // Let default behavior happen for all Ctrl/Cmd shortcuts
              }
              
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!isLoading) {
                  handleSendMessage();
                }
              }
            }}
            placeholder="Ask to configure your steps..."
            className="w-full px-3 pt-2.5 pb-1 text-sm focus:outline-none resize-none bg-transparent"
            rows={3}
            style={{ minHeight: '80px', maxHeight: '150px' }}
          />
          
          {/* Buttons Row */}
          <div className="flex items-center gap-2 px-2 pb-2">
            {/* Debug: fieldsToFill length = {fieldsToFill.length} */}
            {fieldsToFill.length > 0 && (
              <div className="flex items-center gap-1">
                {/* Step indicator badge with icon */}
                {currentStepId && availableSteps && (
                  (() => {
                    const currentStep = availableSteps.find(step => step.id === currentStepId);
                    if (currentStep) {
                      return (
                        <div 
                          className={`w-5 h-5 ${currentStep.color} rounded flex items-center justify-center shrink-0 mr-0.5 [&>svg]:w-2.5 [&>svg]:h-2.5`}
                          style={{ 
                            fontSize: '7px',
                            color: 'white'
                          }}
                        >
                          {currentStep.icon}
                        </div>
                      );
                    }
                    return null;
                  })()
                )}
                
                <div key={`box-${currentStepId}`} className="relative animate-[slideFromIcon_0.15s_ease-out] opacity-0" ref={dataSelectorMenuRef} style={{ animationFillMode: 'forwards', animationDelay: '0ms' }}>
                  <button
                    className={`p-1 text-gray-500 hover:bg-gray-100 rounded transition-colors ${isDataSelectorOpen ? 'bg-gray-100' : ''}`}
                    title="Step data"
                    onMouseEnter={() => setShowPlusTooltip(true)}
                    onMouseLeave={() => setShowPlusTooltip(false)}
                    onClick={() => {
                      setIsDataSelectorOpen(!isDataSelectorOpen);
                      setShowPlusTooltip(false);
                    }}
                  >
                    <BetweenHorizontalStart size={16} />
                  </button>
                  
                  {showPlusTooltip && !isDataSelectorOpen && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap">
                      Step data
                    </div>
                  )}
                  
                  {/* Data Selector Menu */}
                  {isDataSelectorOpen && availableSteps && (
                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                      <DataSelectorContent
                        availableSteps={(() => {
                          // Get only previous steps (exclude current step)
                          const contextStepId = conversationContextStepRef.current || currentStepId;
                          const currentStepIndex = availableSteps.findIndex(s => s.id === contextStepId);
                          
                          // If step found, return only previous steps
                          if (currentStepIndex > 0) {
                            return availableSteps.slice(0, currentStepIndex);
                          }
                          
                          // If it's the first step (trigger), return empty array
                          if (currentStepIndex === 0) {
                            return [];
                          }
                          
                          // Fallback: return all steps
                          return availableSteps;
                        })()}
                        onFieldClick={(step, fieldName, fieldValue, type) => {
                          // Add data tag instead of inserting text
                          let newTag: DataTagValue;
                          
                          if (type === 'function' || type === 'operator' || type === 'keyword' || type === 'variable') {
                            const displayVal = String(fieldValue);
                            // Function pair: add open bracket tag + close bracket tag
                            if (type === 'function' && displayVal.endsWith('()')) {
                              const funcName = displayVal.slice(0, -1); // e.g. "length("
                              const openTag: DataTagValue = {
                                type: 'function',
                                id: `fn-open-${Date.now()}`,
                                value: funcName,
                                displayValue: funcName
                              };
                              const closeTag: DataTagValue = {
                                type: 'function',
                                id: `fn-close-${Date.now()}`,
                                value: ')',
                                displayValue: ')'
                              };
                              setSelectedDataTags(prev => [...prev, openTag, closeTag]);
                              setSelectedFieldTag(null);
                              setReplyToSuggestion(null);
                              textareaRef.current?.focus();
                              return;
                            }
                            newTag = {
                              type: type,
                              id: `math-${Date.now()}`,
                              value: fieldName,
                              displayValue: String(fieldValue)
                            };
                          } else {
                            newTag = {
                              type: 'step',
                              id: step.id,
                              stepName: step.name,
                              stepIcon: step.icon,
                              stepColor: step.color,
                              path: fieldName,
                              displayValue: String(fieldValue)
                            };
                          }

                          setSelectedDataTags(prev => [...prev, newTag]);
                          setSelectedFieldTag(null); // Clear field tag when adding data tag
                          setReplyToSuggestion(null); // Clear reply when adding data tag
                          textareaRef.current?.focus();
                        }}
                        maxHeight="320px"
                        showInsertButton={false}
                      />
                    </div>
                  )}
                </div>
                
                <div key={`fields-${currentStepId}`} className="relative animate-[slideFromIcon_0.15s_ease-out] opacity-0" ref={fieldsMenuRef} style={{ animationFillMode: 'forwards', animationDelay: '50ms' }}>
                  <button
                    onClick={() => {
                      setIsFieldsMenuOpen(!isFieldsMenuOpen);
                      setShowAtTooltip(false);
                    }}
                    className={`p-1 text-gray-500 hover:bg-gray-100 rounded transition-colors ${isFieldsMenuOpen ? 'bg-gray-100' : ''}`}
                    title="Step Fields"
                    onMouseEnter={() => setShowAtTooltip(true)}
                    onMouseLeave={() => setShowAtTooltip(false)}
                  >
                    <TextCursorInput size={16} />
                  </button>
                  
                  {showAtTooltip && !isFieldsMenuOpen && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap">
                      Step Fields
                    </div>
                  )}
                  
                  {/* Fields Menu */}
                  {isFieldsMenuOpen && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto">
                      <div className="p-1">
                        <div className="text-xs font-normal text-gray-400 px-2 py-1.5">Step Fields</div>
                        {fieldsToFill.length > 0 ? (
                          <div className="space-y-0">
                            {fieldsToFill.map((field, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  setSelectedFieldTag(field.label);
                                  setSelectedDataTags([]); // Clear data tags when selecting field tag
                                  setIsFieldsMenuOpen(false);
                                  setReplyToSuggestion(null);
                                }}
                                className="w-full text-left px-2 py-1.5 text-[12px] text-gray-700 hover:bg-gray-100 rounded transition-colors"
                              >
                                {field.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="px-2 py-3 text-xs text-gray-400 text-center">
                            No fields available
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <button
              onClick={isLoading ? handleStopGeneration : handleSendMessage}
              disabled={!isLoading && !userInput.trim()}
              className="w-7 h-7 bg-[hsl(257,74%,57%)] text-white rounded-full hover:bg-[hsl(257,74%,52%)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0 ml-auto"
            >
              {isLoading ? <Square size={13} fill="currentColor" /> : <ArrowUp size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
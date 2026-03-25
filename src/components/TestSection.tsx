import { CheckCircle2, XCircle, ChevronDown, ChevronRight, Copy, Loader2 } from 'lucide-react';
import { useState, forwardRef, useImperativeHandle } from 'react';
import { JsonViewer } from './JsonViewer';

interface TestResult {
  status: 'idle' | 'testing' | 'success' | 'failed';
  output: any;
  date: string | null;
}

interface TestSectionProps {
  stepId: string;
  testResult?: TestResult;
  onTestComplete: (stepId: string, result: TestResult) => void;
  isAIFilling?: boolean;
  testButtonRef?: React.RefObject<HTMLButtonElement>;
  isGlowing?: boolean;
}

export interface TestSectionHandle {
  triggerTest: () => void;
}

export const TestSection = forwardRef<TestSectionHandle, TestSectionProps>(({ stepId, testResult, onTestComplete, isAIFilling, testButtonRef, isGlowing }, ref) => {
  const currentStatus = testResult?.status || 'idle';
  const currentOutput = testResult?.output || null;
  const currentDate = testResult?.date || null;
  
  const [isOutputExpanded, setIsOutputExpanded] = useState(true);
  const [copiedOutput, setCopiedOutput] = useState(false);

  // دالة الاختبار
  const handleTest = async () => {
    onTestComplete(stepId, { status: 'testing', output: null, date: null });
    
    // محاكاة API call
    setTimeout(() => {
      // محاكاة نجاح أو فشل عشوائي
      const isSuccess = Math.random() > 0.3; // 70% نجاح
      
      if (isSuccess) {
        onTestComplete(stepId, {
          status: 'success',
          output: {
            status: 'success',
            messageId: 'msg_1234567890',
            to: 'recipient@example.com',
            subject: 'Test Email',
            sentAt: new Date().toISOString(),
            data: {
              threadId: 'thread_abc123',
              labelIds: ['SENT', 'INBOX'],
              snippet: 'This is a test email...'
            }
          },
          date: new Date().toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        });
      } else {
        onTestComplete(stepId, {
          status: 'failed',
          output: {
            error: 'Authentication failed',
            message: 'Invalid credentials or expired token',
            code: 'AUTH_ERROR_401',
            details: {
              timestamp: new Date().toISOString(),
              endpoint: '/api/send-email',
              suggestion: 'Please reconnect your account'
            }
          },
          date: new Date().toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        });
      }
    }, 1500);
  };

  // دالة نسخ الـ output
  const handleCopyOutput = () => {
    if (currentOutput) {
      const text = JSON.stringify(currentOutput, null, 2);
      
      // Fallback method للنسخ
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        setCopiedOutput(true);
        setTimeout(() => setCopiedOutput(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
      
      document.body.removeChild(textArea);
    }
  };

  // تعيين الدالة triggerTest للوصول إليها من خارج المكون
  useImperativeHandle(ref, () => ({
    triggerTest: handleTest
  }));

  return (
    <div>
      <p className="text-sm text-gray-900 mb-3">Test Configuration</p>
      
      {/* Glow Animation Styles */}
      <style>{`
        @keyframes test-glow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(147, 51, 234, 0);
          }
          50% {
            box-shadow: 0 0 20px 5px rgba(147, 51, 234, 0.6);
          }
        }
        .test-button-glow {
          animation: test-glow 1.5s ease-in-out infinite;
        }
      `}</style>
      
      {/* Test Button */}
      <button 
        ref={testButtonRef}
        onClick={handleTest}
        disabled={currentStatus === 'testing' || isAIFilling}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isGlowing ? 'test-button-glow' : ''}`}
      >
        {currentStatus === 'testing' ? (
          <Loader2 size={16} className="animate-spin text-gray-400" />
        ) : (
          <span className="text-gray-400">⊗</span>
        )}
        {currentStatus === 'testing' ? 'Testing...' : 'Test Step'}
      </button>

      {/* Test Result */}
      {currentStatus !== 'idle' && currentStatus !== 'testing' && currentOutput && (
        <div className="mt-4 space-y-3">
          {/* Status Header */}
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            currentStatus === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {currentStatus === 'success' ? (
              <CheckCircle2 size={18} className="text-green-600 shrink-0" />
            ) : (
              <XCircle size={18} className="text-red-600 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${
                currentStatus === 'success' ? 'text-green-900' : 'text-red-900'
              }`}>
                {currentStatus === 'success' ? 'Tested Successfully' : 'Test Failed'}
              </p>
              {currentDate && (
                <p className="text-xs text-gray-500 mt-0.5">{currentDate}</p>
              )}
            </div>
          </div>

          {/* Output Section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Output Header */}
            <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
              <button
                onClick={() => setIsOutputExpanded(!isOutputExpanded)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {isOutputExpanded ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
                Output
              </button>
              <button
                onClick={handleCopyOutput}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors relative group"
              >
                <Copy size={14} />
                {copiedOutput && (
                  <div className="absolute -top-8 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    Copied!
                  </div>
                )}
              </button>
            </div>

            {/* Output Content */}
            {isOutputExpanded && (
              <div className="p-3 bg-gray-50 max-h-64 overflow-y-auto">
                <JsonViewer data={currentOutput} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

TestSection.displayName = 'TestSection';
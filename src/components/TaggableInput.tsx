import { useRef, useState, useEffect } from 'react';
import { DataTag, DataTagValue } from './DataTag';

export interface TaggableContent {
  type: 'text' | 'tag';
  value: string | DataTagValue;
}

interface TaggableInputProps {
  value: TaggableContent[];
  onChange: (value: TaggableContent[]) => void;
  onFocus?: (e: React.FocusEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
}

export function TaggableInput({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  className = '',
  multiline = false,
  rows = 1
}: TaggableInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // إدراج tag جديد في الموقع الحالي للمؤشر
  const insertTag = (tag: DataTagValue) => {
    const selection = window.getSelection();
    if (!selection || !containerRef.current) return;

    // احصل على الموقع الحالي
    const range = selection.getRangeAt(0);
    const currentText = containerRef.current.textContent || '';
    
    // أدرج الـ tag في المحتوى
    const newContent: TaggableContent[] = [...value];
    
    // إذا كان فيه نص، أضف الـ tag في النهاية
    if (newContent.length === 0 || newContent[newContent.length - 1].type === 'tag') {
      newContent.push({ type: 'tag', value: tag });
      newContent.push({ type: 'text', value: ' ' }); // مسافة بعد الـ tag
    } else {
      // أضف الـ tag قبل آخر نص
      const lastIndex = newContent.length - 1;
      const lastText = newContent[lastIndex].value as string;
      newContent[lastIndex] = { type: 'text', value: lastText };
      newContent.push({ type: 'tag', value: tag });
      newContent.push({ type: 'text', value: ' ' });
    }
    
    onChange(newContent);
  };

  // عرض المحتوى المختلط
  const renderContent = () => {
    if (value.length === 0) {
      return <span className="text-gray-400">{placeholder}</span>;
    }

    return value.map((item, index) => {
      if (item.type === 'tag') {
        return (
          <DataTag
            key={`tag-${index}`}
            tag={item.value as DataTagValue}
            onRemove={() => {
              const newContent = value.filter((_, i) => i !== index);
              onChange(newContent);
            }}
          />
        );
      } else {
        const text = item.value as string;
        return text ? <span key={`text-${index}`}>{text}</span> : null;
      }
    });
  };

  // التعامل مع تغيير النص
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const text = e.currentTarget.textContent || '';
    
    // حافظ على الـ tags الموجودة وحدّث النص فقط
    const newContent: TaggableContent[] = value.filter(item => item.type === 'tag');
    
    if (text) {
      newContent.push({ type: 'text', value: text });
    }
    
    onChange(newContent);
  };

  // Expose insertTag method to parent
  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as any).insertTag = insertTag;
    }
  }, [value]);

  const baseClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent";
  
  return (
    <div
      ref={containerRef}
      contentEditable
      onInput={handleInput}
      onFocus={(e) => {
        setIsFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        onBlur?.(e);
      }}
      className={`${baseClasses} ${className} ${multiline ? '' : 'whitespace-nowrap overflow-x-auto'}`}
      style={{
        minHeight: multiline ? `${rows * 1.5}rem` : 'auto',
        maxHeight: multiline ? 'none' : '2.5rem',
        overflowY: multiline ? 'auto' : 'hidden'
      }}
      suppressContentEditableWarning
    >
      {renderContent()}
    </div>
  );
}

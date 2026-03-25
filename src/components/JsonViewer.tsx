interface JsonViewerProps {
  data: any;
  theme?: 'default' | 'error'; // إضافة theme للأخطاء
}

export function JsonViewer({ data, theme = 'default' }: JsonViewerProps) {
  const formatJson = (obj: any, indent: number = 0): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    const indentStr = '  '.repeat(indent);
    
    // ألوان حسب الـ theme
    const colors = theme === 'error' ? {
      string: 'text-red-600',
      number: 'text-gray-900',
      boolean: 'text-red-600',
      key: 'text-gray-900',
      bracket: 'text-gray-900',
      null: 'text-gray-500'
    } : {
      string: 'text-green-600',
      number: 'text-blue-600',
      boolean: 'text-purple-600',
      key: 'text-blue-500',
      bracket: 'text-gray-700',
      null: 'text-gray-500'
    };
    
    if (obj === null) {
      elements.push(
        <span key={`null-${indent}`} className={colors.null}>null</span>
      );
    } else if (typeof obj === 'string') {
      elements.push(
        <span key={`string-${indent}`} className={colors.string}>"{obj}"</span>
      );
    } else if (typeof obj === 'number') {
      elements.push(
        <span key={`number-${indent}`} className={colors.number}>{obj}</span>
      );
    } else if (typeof obj === 'boolean') {
      elements.push(
        <span key={`boolean-${indent}`} className={colors.boolean}>{obj.toString()}</span>
      );
    } else if (Array.isArray(obj)) {
      if (obj.length === 0) {
        elements.push(
          <span key={`array-empty-${indent}`} className={colors.bracket}>[]</span>
        );
      } else {
        elements.push(
          <span key={`array-open-${indent}`} className={colors.bracket}>{'[\n'}</span>
        );
        obj.forEach((item, index) => {
          elements.push(
            <span key={`array-item-${indent}-${index}`}>
              {indentStr}  {formatJson(item, indent + 1)}
              {index < obj.length - 1 ? <span className={colors.bracket}>,</span> : ''}
              {'\n'}
            </span>
          );
        });
        elements.push(
          <span key={`array-close-${indent}`}>{indentStr}<span className={colors.bracket}>]</span></span>
        );
      }
    } else if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) {
        elements.push(
          <span key={`obj-empty-${indent}`} className={colors.bracket}>{'{}'}</span>
        );
      } else {
        elements.push(
          <span key={`obj-open-${indent}`} className={colors.bracket}>{'{\n'}</span>
        );
        keys.forEach((key, index) => {
          elements.push(
            <span key={`obj-key-${indent}-${key}`}>
              {indentStr}  <span className={colors.key}>"{key}"</span>
              <span className={colors.bracket}>: </span>
              {formatJson(obj[key], indent + 1)}
              {index < keys.length - 1 ? <span className={colors.bracket}>,</span> : ''}
              {'\n'}
            </span>
          );
        });
        elements.push(
          <span key={`obj-close-${indent}`}>{indentStr}<span className={colors.bracket}>{'}'}</span></span>
        );
      }
    }
    
    return elements;
  };

  return (
    <pre className="text-xs font-mono whitespace-pre-wrap break-words">
      {formatJson(data)}
    </pre>
  );
}
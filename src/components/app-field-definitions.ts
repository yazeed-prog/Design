// 🎯 Dynamic Field Definitions for all apps
export interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  rows?: number;
}

// 🔍 Map common step name patterns to appIds (for fallback matching)
export const STEP_NAME_TO_APP_MAP: Record<string, string> = {
  'send email': 'gmail',
  'email': 'gmail',
  'gmail': 'gmail',
  'send message': 'slack',
  'slack': 'slack',
  'post message': 'slack',
  'create page': 'notion',
  'notion': 'notion',
  'add row': 'gsheets',
  'google sheets': 'gsheets',
  'gsheets': 'gsheets',
  'create event': 'gcal',
  'google calendar': 'gcal',
  'gcal': 'gcal',
  'calendar': 'gcal',
  'stripe': 'stripe',
  'payment': 'stripe',
  'charge': 'stripe',
  'github': 'github',
  'create issue': 'github',
  'webhook': 'trigger',
  'catch webhook': 'trigger',
  'trigger': 'trigger'
};

export const APP_FIELD_DEFINITIONS: Record<string, FieldDefinition[]> = {
  'gmail': [
    { name: 'to', label: 'To', type: 'text', placeholder: 'recipient@example.com', required: true },
    { name: 'subject', label: 'Subject', type: 'text', placeholder: 'Email subject', required: true },
    { name: 'body', label: 'Message Body', type: 'textarea', placeholder: 'Email content...', required: true, rows: 6 },
    { name: 'action', label: 'Action', type: 'select', required: true, options: [
      { value: 'send', label: 'Send Email' },
      { value: 'read', label: 'Read Email' },
      { value: 'draft', label: 'Create Draft' }
    ]}
  ],
  'slack': [
    { name: 'channel', label: 'Channel', type: 'select', required: true, options: [
      { value: 'general', label: '#general' },
      { value: 'random', label: '#random' },
      { value: 'dev-team', label: '#dev-team' },
      { value: 'marketing', label: '#marketing' }
    ]},
    { name: 'message', label: 'Message', type: 'textarea', placeholder: 'Message text', required: true, rows: 4 }
  ],
  'notion': [
    { name: 'database', label: 'Database', type: 'select', required: true, options: [
      { value: 'tasks', label: 'Tasks' },
      { value: 'projects', label: 'Projects' },
      { value: 'contacts', label: 'Contacts' },
      { value: 'notes', label: 'Notes' }
    ]},
    { name: 'title', label: 'Title', type: 'text', placeholder: 'Page title', required: true },
    { name: 'content', label: 'Content', type: 'textarea', placeholder: 'Page content', required: false, rows: 5 }
  ],
  'stripe': [
    { name: 'amount', label: 'Amount', type: 'text', placeholder: '100.00', required: true },
    { name: 'currency', label: 'Currency', type: 'select', required: true, options: [
      { value: 'usd', label: 'USD ($)' },
      { value: 'eur', label: 'EUR (€)' },
      { value: 'gbp', label: 'GBP (£)' },
      { value: 'aed', label: 'AED (د.إ)' }
    ]},
    { name: 'customerEmail', label: 'Customer Email', type: 'text', placeholder: 'customer@example.com', required: true }
  ],
  'github': [
    { name: 'repository', label: 'Repository', type: 'text', placeholder: 'owner/repo', required: true },
    { name: 'title', label: 'Title', type: 'text', placeholder: 'Issue title', required: true },
    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Issue description', required: false, rows: 5 }
  ],
  'gcal': [
    { name: 'title', label: 'Event Title', type: 'text', placeholder: 'Team Meeting', required: true },
    { name: 'date', label: 'Date', type: 'text', placeholder: '2024-01-15', required: true },
    { name: 'time', label: 'Time', type: 'text', placeholder: '14:00', required: true },
    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Event details...', required: false, rows: 4 }
  ],
  'airtable': [
    { name: 'table', label: 'Table', type: 'text', placeholder: 'Table name', required: true },
    { name: 'field1', label: 'Field 1', type: 'text', placeholder: 'Value 1', required: true },
    { name: 'field2', label: 'Field 2', type: 'text', placeholder: 'Value 2', required: false }
  ],
  'hubspot': [
    { name: 'email', label: 'Contact Email', type: 'text', placeholder: 'contact@example.com', required: true },
    { name: 'firstName', label: 'First Name', type: 'text', placeholder: 'John', required: true },
    { name: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Doe', required: true },
    { name: 'company', label: 'Company', type: 'text', placeholder: 'Company Name', required: false }
  ],
  'shopify': [
    { name: 'productName', label: 'Product Name', type: 'text', placeholder: 'Product title', required: true },
    { name: 'price', label: 'Price', type: 'text', placeholder: '99.99', required: true },
    { name: 'quantity', label: 'Quantity', type: 'text', placeholder: '100', required: true }
  ],
  'asana': [
    { name: 'taskName', label: 'Task Name', type: 'text', placeholder: 'Task title', required: true },
    { name: 'project', label: 'Project', type: 'text', placeholder: 'Project name', required: true },
    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Task details...', required: false, rows: 4 }
  ],
  'telegram': [
    { name: 'chatId', label: 'Chat ID', type: 'text', placeholder: '@username or chat_id', required: true },
    { name: 'message', label: 'Message', type: 'textarea', placeholder: 'Message text', required: true, rows: 4 }
  ],
  'twilio': [
    { name: 'to', label: 'To Number', type: 'text', placeholder: '+1234567890', required: true },
    { name: 'message', label: 'Message', type: 'textarea', placeholder: 'SMS text', required: true, rows: 3 }
  ],
  'zoom': [
    { name: 'topic', label: 'Meeting Topic', type: 'text', placeholder: 'Team Sync', required: true },
    { name: 'date', label: 'Date', type: 'text', placeholder: '2024-01-15', required: true },
    { name: 'duration', label: 'Duration (minutes)', type: 'text', placeholder: '60', required: true }
  ],
  'dropbox': [
    { name: 'filePath', label: 'File Path', type: 'text', placeholder: '/folder/file.pdf', required: true },
    { name: 'content', label: 'Content', type: 'textarea', placeholder: 'File content or URL', required: false, rows: 4 }
  ],
  'gdrive': [
    { name: 'fileName', label: 'File Name', type: 'text', placeholder: 'document.pdf', required: true },
    { name: 'folder', label: 'Folder', type: 'text', placeholder: 'My Folder', required: false },
    { name: 'content', label: 'Content', type: 'textarea', placeholder: 'File content', required: false, rows: 4 }
  ],
  'gsheets': [
    { name: 'spreadsheet', label: 'Spreadsheet', type: 'text', placeholder: 'Spreadsheet name', required: true },
    { name: 'sheet', label: 'Sheet Name', type: 'text', placeholder: 'Sheet1', required: true },
    { name: 'range', label: 'Range', type: 'text', placeholder: 'A1:B10', required: true }
  ],
  'spotify': [
    { name: 'playlistName', label: 'Playlist Name', type: 'text', placeholder: 'My Playlist', required: true },
    { name: 'trackUri', label: 'Track URI', type: 'text', placeholder: 'spotify:track:...', required: false }
  ],
  'unsplash': [
    { name: 'query', label: 'Search Query', type: 'text', placeholder: 'nature landscape', required: true },
    { name: 'count', label: 'Number of Images', type: 'text', placeholder: '10', required: false }
  ],
  'trigger': [
    { name: 'url', label: 'Webhook URL', type: 'text', placeholder: 'https://...', required: false },
    { name: 'method', label: 'HTTP Method', type: 'select', required: false, options: [
      { value: 'POST', label: 'POST' },
      { value: 'GET', label: 'GET' },
      { value: 'PUT', label: 'PUT' }
    ]},
    { name: 'headers', label: 'Headers', type: 'textarea', placeholder: 'Content-Type: application/json', required: false, rows: 3 }
  ]
};

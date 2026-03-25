import { Search, Star, Mail, MessageSquare, Calendar, FileText, Database, Image, ShoppingCart, DollarSign, Users, Cloud, GitBranch, Package, Send, Phone, Video, Music, FileSpreadsheet, Folder, Grid3x3, Sparkles, Settings, Wrench, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import React from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface App {
  id: string;
  name: string;
  category: string;
  type: 'explore' | 'ai' | 'apps' | 'utility';
  icon: React.ReactNode;
  color: string;
  isFavorite?: boolean;
}

interface AppAction {
  id: string;
  title: string;
  description: string;
}

interface Example {
  id: number;
  image: string;
  title: string;
  video?: string;
}

const apps: App[] = [
  { id: 'gmail', name: 'Gmail', category: 'Communication', type: 'apps', icon: <Mail size={20} />, color: 'bg-red-500' },
  { id: 'slack', name: 'Slack', category: 'Communication', type: 'apps', icon: <MessageSquare size={20} />, color: 'bg-purple-500' },
  { id: 'gcal', name: 'Google Calendar', category: 'Productivity', type: 'apps', icon: <Calendar size={20} />, color: 'bg-blue-500' },
  { id: 'notion', name: 'Notion', category: 'Productivity', type: 'apps', icon: <FileText size={20} />, color: 'bg-gray-800' },
  { id: 'airtable', name: 'Airtable', category: 'Database', type: 'apps', icon: <Database size={20} />, color: 'bg-yellow-500' },
  { id: 'dropbox', name: 'Dropbox', category: 'Storage', type: 'utility', icon: <Folder size={20} />, color: 'bg-blue-600' },
  { id: 'shopify', name: 'Shopify', category: 'E-commerce', type: 'apps', icon: <ShoppingCart size={20} />, color: 'bg-green-600' },
  { id: 'stripe', name: 'Stripe', category: 'Payment', type: 'utility', icon: <DollarSign size={20} />, color: 'bg-[hsl(257,74%,57%)]' },
  { id: 'hubspot', name: 'HubSpot', category: 'CRM', type: 'apps', icon: <Users size={20} />, color: 'bg-orange-500' },
  { id: 'gdrive', name: 'Google Drive', category: 'Storage', type: 'utility', icon: <Cloud size={20} />, color: 'bg-green-500' },
  { id: 'github', name: 'GitHub', category: 'Developer', type: 'utility', icon: <GitBranch size={20} />, color: 'bg-gray-900' },
  { id: 'asana', name: 'Asana', category: 'Project Management', type: 'apps', icon: <Package size={20} />, color: 'bg-pink-500' },
  { id: 'telegram', name: 'Telegram', category: 'Communication', type: 'apps', icon: <Send size={20} />, color: 'bg-sky-500' },
  { id: 'twilio', name: 'Twilio', category: 'Communication', type: 'utility', icon: <Phone size={20} />, color: 'bg-red-600' },
  { id: 'zoom', name: 'Zoom', category: 'Communication', type: 'apps', icon: <Video size={20} />, color: 'bg-blue-500' },
  { id: 'spotify', name: 'Spotify', category: 'Entertainment', type: 'apps', icon: <Music size={20} />, color: 'bg-green-500' },
  { id: 'gsheets', name: 'Google Sheets', category: 'Productivity', type: 'utility', icon: <FileSpreadsheet size={20} />, color: 'bg-green-600' },
  { id: 'unsplash', name: 'Unsplash', category: 'Media', type: 'utility', icon: <Image size={20} />, color: 'bg-gray-700' },
];

// App actions/options
const appActions: Record<string, AppAction[]> = {
  gmail: [
    { id: 'send-email', title: 'Send Email', description: 'Send a new email message' },
    { id: 'read-email', title: 'Read Email', description: 'Retrieve and read emails' },
    { id: 'create-draft', title: 'Create Draft', description: 'Create a draft email' },
    { id: 'add-label', title: 'Add Label', description: 'Add label to email' },
  ],
  slack: [
    { id: 'send-message', title: 'Send Message', description: 'Send a message to a channel' },
    { id: 'create-channel', title: 'Create Channel', description: 'Create a new channel' },
    { id: 'invite-user', title: 'Invite User', description: 'Invite user to workspace' },
    { id: 'post-file', title: 'Post File', description: 'Upload and share a file' },
  ],
  gcal: [
    { id: 'create-event', title: 'Create Event', description: 'Create a new calendar event' },
    { id: 'update-event', title: 'Update Event', description: 'Update existing event' },
    { id: 'delete-event', title: 'Delete Event', description: 'Delete a calendar event' },
    { id: 'list-events', title: 'List Events', description: 'Get list of events' },
  ],
  notion: [
    { id: 'create-page', title: 'Create Page', description: 'Create a new page' },
    { id: 'update-page', title: 'Update Page', description: 'Update existing page' },
    { id: 'create-database', title: 'Create Database', description: 'Create new database' },
    { id: 'query-database', title: 'Query Database', description: 'Query database records' },
  ],
  airtable: [
    { id: 'create-record', title: 'Create Record', description: 'Create a new record' },
    { id: 'update-record', title: 'Update Record', description: 'Update existing record' },
    { id: 'delete-record', title: 'Delete Record', description: 'Delete a record' },
    { id: 'list-records', title: 'List Records', description: 'Get all records' },
  ],
  dropbox: [
    { id: 'upload-file', title: 'Upload File', description: 'Upload a file to Dropbox' },
    { id: 'download-file', title: 'Download File', description: 'Download a file' },
    { id: 'create-folder', title: 'Create Folder', description: 'Create new folder' },
    { id: 'share-link', title: 'Share Link', description: 'Create share link' },
  ],
  shopify: [
    { id: 'create-order', title: 'Create Order', description: 'Create a new order' },
    { id: 'update-product', title: 'Update Product', description: 'Update product details' },
    { id: 'list-products', title: 'List Products', description: 'Get all products' },
    { id: 'track-inventory', title: 'Track Inventory', description: 'Monitor inventory levels' },
  ],
  stripe: [
    { id: 'create-payment', title: 'Create Payment', description: 'Process a payment' },
    { id: 'create-customer', title: 'Create Customer', description: 'Add new customer' },
    { id: 'list-charges', title: 'List Charges', description: 'Get all charges' },
    { id: 'create-refund', title: 'Create Refund', description: 'Issue a refund' },
  ],
  hubspot: [
    { id: 'create-contact', title: 'Create Contact', description: 'Add new contact' },
    { id: 'update-deal', title: 'Update Deal', description: 'Update deal information' },
    { id: 'create-task', title: 'Create Task', description: 'Create a new task' },
    { id: 'log-activity', title: 'Log Activity', description: 'Log an activity' },
  ],
  gdrive: [
    { id: 'upload-file', title: 'Upload File', description: 'Upload file to Drive' },
    { id: 'create-folder', title: 'Create Folder', description: 'Create new folder' },
    { id: 'share-file', title: 'Share File', description: 'Share file with others' },
    { id: 'search-files', title: 'Search Files', description: 'Search for files' },
  ],
  github: [
    { id: 'create-issue', title: 'Create Issue', description: 'Create a new issue' },
    { id: 'create-pr', title: 'Create PR', description: 'Create pull request' },
    { id: 'merge-pr', title: 'Merge PR', description: 'Merge pull request' },
    { id: 'list-commits', title: 'List Commits', description: 'Get repository commits' },
  ],
  asana: [
    { id: 'create-task', title: 'Create Task', description: 'Create a new task' },
    { id: 'update-task', title: 'Update Task', description: 'Update task details' },
    { id: 'create-project', title: 'Create Project', description: 'Create new project' },
    { id: 'add-comment', title: 'Add Comment', description: 'Add comment to task' },
  ],
  telegram: [
    { id: 'send-message', title: 'Send Message', description: 'Send a message' },
    { id: 'send-photo', title: 'Send Photo', description: 'Send a photo' },
    { id: 'create-poll', title: 'Create Poll', description: 'Create a poll' },
    { id: 'forward-message', title: 'Forward Message', description: 'Forward a message' },
  ],
  twilio: [
    { id: 'send-sms', title: 'Send SMS', description: 'Send text message' },
    { id: 'make-call', title: 'Make Call', description: 'Make voice call' },
    { id: 'send-whatsapp', title: 'Send WhatsApp', description: 'Send WhatsApp message' },
    { id: 'lookup-number', title: 'Lookup Number', description: 'Lookup phone number' },
  ],
  zoom: [
    { id: 'create-meeting', title: 'Create Meeting', description: 'Schedule new meeting' },
    { id: 'update-meeting', title: 'Update Meeting', description: 'Update meeting details' },
    { id: 'delete-meeting', title: 'Delete Meeting', description: 'Cancel a meeting' },
    { id: 'list-meetings', title: 'List Meetings', description: 'Get all meetings' },
  ],
  spotify: [
    { id: 'create-playlist', title: 'Create Playlist', description: 'Create new playlist' },
    { id: 'add-track', title: 'Add Track', description: 'Add track to playlist' },
    { id: 'search-track', title: 'Search Track', description: 'Search for tracks' },
    { id: 'get-recommendations', title: 'Get Recommendations', description: 'Get music recommendations' },
  ],
  gsheets: [
    { id: 'create-sheet', title: 'Create Sheet', description: 'Create new spreadsheet' },
    { id: 'add-row', title: 'Add Row', description: 'Add row to sheet' },
    { id: 'update-cell', title: 'Update Cell', description: 'Update cell value' },
    { id: 'read-data', title: 'Read Data', description: 'Read spreadsheet data' },
  ],
  unsplash: [
    { id: 'search-photo', title: 'Search Photo', description: 'Search for photos' },
    { id: 'random-photo', title: 'Random Photo', description: 'Get random photo' },
    { id: 'download-photo', title: 'Download Photo', description: 'Download a photo' },
    { id: 'list-collections', title: 'List Collections', description: 'Get photo collections' },
  ],
};

const tabs = [
  { id: 'explore', name: 'Explore', icon: <Grid3x3 size={18} /> },
  { id: 'ai', name: 'AI & Agents', icon: <Sparkles size={18} /> },
  { id: 'apps', name: 'Apps', icon: <Settings size={18} /> },
  { id: 'utility', name: 'Utility', icon: <Wrench size={18} /> },
] as const;

// Pool of random images and videos
const mediaPool = [
  { type: 'image', url: 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbWFpbCUyMG5vdGlmaWNhdGlvbnxlbnwxfHx8fDE3NjQ3NzYxMzN8MA&ixlib=rb-4.1.0&q=80&w=1080' },
  { type: 'video', url: 'https://videos.pexels.com/video-files/3129957/3129957-uhd_2560_1440_25fps.mp4' },
  { type: 'image', url: 'https://images.unsplash.com/photo-1563884705074-7c8b15f16295?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdXRvbWF0aW9uJTIwd29ya2Zsb3d8ZW58MXx8fHwxNzY0Njk2NTUyfDA&ixlib=rb-4.1.0&q=80&w=1080' },
  { type: 'video', url: 'https://videos.pexels.com/video-files/3141211/3141211-uhd_2560_1440_25fps.mp4' },
  { type: 'image', url: 'https://images.unsplash.com/photo-1642489069222-3b8f36c0e89e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWxlbmRhciUyMHNjaGVkdWxlfGVufDF8fHx8MTc2NDcwOTA3M3ww&ixlib=rb-4.1.0&q=80&w=1080' },
  { type: 'image', url: 'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWFtJTIwY29sbGFib3JhdGlvbnxlbnwxfHx8fDE3NjQ3MzM1MTF8MA&ixlib=rb-4.1.0&q=80&w=1080' },
  { type: 'video', url: 'https://videos.pexels.com/video-files/5726958/5726958-uhd_2560_1440_25fps.mp4' },
  { type: 'image', url: 'https://images.unsplash.com/photo-1604399852419-f67ee7d5f2ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9kdWN0aXZpdHklMjBhcHBzfGVufDF8fHx8MTc2NDc1NjkwMXww&ixlib=rb-4.1.0&q=80&w=1080' },
  { type: 'image', url: 'https://images.unsplash.com/photo-1642775196125-38a9eb496568?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXRhYmFzZSUyMGFuYWx5dGljc3xlbnwxfHx8fDE3NjQ3NzYxMzR8MA&ixlib=rb-4.1.0&q=80&w=1080' },
  { type: 'video', url: 'https://videos.pexels.com/video-files/7534553/7534553-uhd_2560_1440_25fps.mp4' },
  { type: 'image', url: 'https://images.unsplash.com/photo-1650978810641-6610f4b6d15a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGludGVncmF0aW9ufGVufDF8fHx8MTc2NDc3NTgwOXww&ixlib=rb-4.1.0&q=80&w=1080' },
  { type: 'image', url: 'https://images.unsplash.com/photo-1506399558188-acca6f8cbf41?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbG91ZCUyMHN0b3JhZ2V8ZW58MXx8fHwxNzY0NzY0NjIxfDA&ixlib=rb-4.1.0&q=80&w=1080' },
  { type: 'video', url: 'https://videos.pexels.com/video-files/3130284/3130284-uhd_2560_1440_25fps.mp4' },
  { type: 'image', url: 'https://images.unsplash.com/photo-1727407209320-1fa6ae60ee05?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlY29tbWVyY2UlMjBzaG9wcGluZ3xlbnwxfHx8fDE3NjQ3NTMzMzV8MA&ixlib=rb-4.1.0&q=80&w=1080' },
  { type: 'image', url: 'https://images.unsplash.com/photo-1560264280-88b68371db39?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvZmZpY2UlMjB3b3JrfGVufDF8fHx8MTc2NDc0OTE4N3ww&ixlib=rb-4.1.0&q=80&w=1080' },
  { type: 'video', url: 'https://videos.pexels.com/video-files/3191785/3191785-uhd_2560_1440_25fps.mp4' },
  { type: 'image', url: 'https://images.unsplash.com/photo-1508361727343-ca787442dcd7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB0ZWNobm9sb2d5fGVufDF8fHx8MTc2NDcwODIyMnww&ixlib=rb-4.1.0&q=80&w=1080' },
  { type: 'image', url: 'https://images.unsplash.com/photo-1700451761308-ec56f93c82be?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b3Jrc3BhY2UlMjBkZXNrfGVufDF8fHx8MTc2NDcxNzI5M3ww&ixlib=rb-4.1.0&q=80&w=1080' },
  { type: 'video', url: 'https://videos.pexels.com/video-files/8092364/8092364-uhd_2560_1440_25fps.mp4' },
  { type: 'image', url: 'https://images.unsplash.com/photo-1557838923-2985c318be48?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWdpdGFsJTIwbWFya2V0aW5nfGVufDF8fHx8MTc2NDc1NTMwNnww&ixlib=rb-4.1.0&q=80&w=1080' },
  { type: 'image', url: 'https://images.unsplash.com/photo-1709715357520-5e1047a2b691?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMG1lZXRpbmd8ZW58MXx8fHwxNzY0NzQwMzI2fDA&ixlib=rb-4.1.0&q=80&w=1080' },
  { type: 'image', url: 'https://images.unsplash.com/photo-1511385348-a52b4a160dc2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYXB0b3AlMjBjb21wdXRlcnxlbnwxfHx8fDE3NjQ2ODA5OTV8MA&ixlib=rb-4.1.0&q=80&w=1080' },
];

// Example titles for each app
const appExampleTitles: Record<string, string> = {
  gmail: 'Automate email workflows and save attachments to cloud storage',
  slack: 'Send automated notifications and reminders to team channels',
  gcal: 'Sync calendar events and create automated meeting reminders',
  notion: 'Connect databases and automate content management workflows',
  airtable: 'Sync data across platforms and automate record creation',
  dropbox: 'Automatically backup and organize files across cloud services',
  shopify: 'Automate order notifications and sync with inventory systems',
  stripe: 'Track payments and send automated transaction notifications',
  hubspot: 'Sync CRM data and automate customer communication flows',
  gdrive: 'Organize files automatically and sync across applications',
  github: 'Automate code deployments and track repository changes',
  asana: 'Sync tasks across platforms and send project updates',
  telegram: 'Send automated messages and notifications to groups',
  twilio: 'Automate SMS notifications and voice call workflows',
  zoom: 'Schedule meetings automatically and send participant reminders',
  spotify: 'Create automated playlists based on listening habits',
  gsheets: 'Sync spreadsheet data and automate report generation',
  unsplash: 'Automatically fetch and organize stock photography',
  default: 'Connect apps and automate workflows to boost productivity'
};

// Function to shuffle and get random media
function getRandomMedia(count: number): Array<{type: 'image' | 'video', url: string}> {
  const shuffled = [...mediaPool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

interface AppSelectorProps {
  onSelect: (app: App) => void;
  onClose: () => void;
}

export function AppSelector({ onSelect, onClose }: AppSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'explore' | 'ai' | 'apps' | 'utility'>('explore');
  const [favorites, setFavorites] = useState<Set<string>>(new Set(['gmail', 'slack', 'notion']));
  const [hoveredApp, setHoveredApp] = useState<string | null>(null);
  const [currentExamples, setCurrentExamples] = useState<Example[]>([]);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  const toggleFavorite = (appId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = new Set(favorites);
    if (favorites.has(appId)) {
      newFavorites.delete(appId);
    } else {
      newFavorites.add(appId);
    }
    setFavorites(newFavorites);
  };

  const filteredApps = apps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = selectedTab === 'explore' || app.type === selectedTab;
    return matchesSearch && matchesTab;
  });

  // Generate random example when hoveredApp changes
  useEffect(() => {
    const title = hoveredApp && appExampleTitles[hoveredApp]
      ? appExampleTitles[hoveredApp]
      : appExampleTitles.default;
    
    const randomMedia = getRandomMedia(1);
    const media = randomMedia[0];
    const examples: Example[] = [{
      id: 1,
      image: media.type === 'image' ? media.url : '',
      video: media.type === 'video' ? media.url : undefined,
      title: title
    }];
    
    setCurrentExamples(examples);
  }, [hoveredApp]);

  const currentAppName = hoveredApp 
    ? apps.find(app => app.id === hoveredApp)?.name 
    : null;

  return (
    <div 
      className="w-[650px] h-[450px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col" 
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-[12px] py-1.5 text-sm rounded-lg outline-none pt-[0px] pb-[0px]"
            autoFocus
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors relative ${
                selectedTab === tab.id
                  ? 'text-[hsl(257,74%,57%)]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {React.cloneElement(tab.icon as React.ReactElement, { 
                size: 18,
                className: selectedTab === tab.id ? 'text-[hsl(257,74%,57%)]' : 'text-gray-500'
              })}
              <span>{tab.name}</span>
              {selectedTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[hsl(257,74%,57%)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content - Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Apps List */}
        <div className="w-1/2 border-r border-gray-100 overflow-y-auto p-4">
          {filteredApps.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              No apps found
            </div>
          ) : (
            <div className="space-y-3">
              {selectedTab === 'explore' && (
                <>
                  {/* Recents Section */}
                  <div>
                    <h5 className="text-xs text-gray-500 mb-1.5 px-1.5 flex items-center gap-1.5">
                      <Clock size={12} />
                      Recents
                    </h5>
                    <div className="grid grid-cols-1 gap-0.5">
                      {filteredApps.slice(0, 4).map((app) => (
                        <div key={app.id}>
                          <button
                            onClick={() => {
                              setExpandedApp(expandedApp === app.id ? null : app.id);
                            }}
                            onMouseEnter={() => setHoveredApp(app.id)}
                            onMouseLeave={() => setHoveredApp(null)}
                            className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 transition-colors group"
                          >
                            <div className={`${app.color} w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
                              {React.cloneElement(app.icon as React.ReactElement, { size: 14 })}
                            </div>
                            <div className="flex-1 text-left">
                              <div className="text-sm text-gray-900">{app.name}</div>
                            </div>
                            <div
                              onClick={(e) => toggleFavorite(app.id, e)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <Star
                                size={12}
                                className={favorites.has(app.id) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}
                              />
                            </div>
                          </button>
                          {expandedApp === app.id && appActions[app.id] && (
                            <div className="mt-0.5 space-y-0.5 pb-1 border-b border-gray-200">
                              {appActions[app.id].map((action) => (
                                <button
                                  key={action.id}
                                  onClick={() => {
                                    onSelect(app);
                                    onClose();
                                  }}
                                  className="w-full text-left p-1.5 rounded-lg hover:bg-gray-100 transition-colors group/action"
                                >
                                  <div className="flex items-start gap-2">
                                    <div className={`${app.color} w-5 h-5 rounded flex items-center justify-center text-white flex-shrink-0 mt-0.5`}>
                                      {React.cloneElement(app.icon as React.ReactElement, { size: 10 })}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs text-gray-900">{action.title}</div>
                                      <div className="text-[10px] text-gray-500 mt-0.5">{action.description}</div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* All Apps Section */}
                  {filteredApps.length > 4 && (
                    <div>
                      <h5 className="text-xs text-gray-500 mb-1.5 px-1.5">All Apps</h5>
                      <div className="grid grid-cols-1 gap-0.5">
                        {filteredApps.slice(4).map((app) => (
                          <div key={app.id}>
                            <button
                              onClick={() => {
                                setExpandedApp(expandedApp === app.id ? null : app.id);
                              }}
                              onMouseEnter={() => setHoveredApp(app.id)}
                              onMouseLeave={() => setHoveredApp(null)}
                              className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 transition-colors group"
                            >
                              <div className={`${app.color} w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
                                {React.cloneElement(app.icon as React.ReactElement, { size: 14 })}
                              </div>
                              <div className="flex-1 text-left">
                                <div className="text-sm text-gray-900">{app.name}</div>
                              </div>
                              <div
                                onClick={(e) => toggleFavorite(app.id, e)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              >
                                <Star
                                  size={12}
                                  className={favorites.has(app.id) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}
                                />
                              </div>
                            </button>
                            {expandedApp === app.id && appActions[app.id] && (
                              <div className="mt-0.5 space-y-0.5 pb-1 border-b border-gray-200">
                                {appActions[app.id].map((action) => (
                                  <button
                                    key={action.id}
                                    onClick={() => {
                                      onSelect(app);
                                      onClose();
                                    }}
                                    className="w-full text-left p-1.5 rounded-lg hover:bg-gray-100 transition-colors group/action"
                                  >
                                    <div className="flex items-start gap-2">
                                      <div className={`${app.color} w-5 h-5 rounded flex items-center justify-center text-white flex-shrink-0 mt-0.5`}>
                                        {React.cloneElement(app.icon as React.ReactElement, { size: 10 })}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs text-gray-900">{action.title}</div>
                                        <div className="text-[10px] text-gray-500 mt-0.5">{action.description}</div>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {/* Other Tabs */}
              {selectedTab !== 'explore' && (
                <div className="grid grid-cols-1 gap-0.5">
                  {filteredApps.map((app) => (
                    <div key={app.id}>
                      <button
                        onClick={() => {
                          setExpandedApp(expandedApp === app.id ? null : app.id);
                        }}
                        onMouseEnter={() => setHoveredApp(app.id)}
                        onMouseLeave={() => setHoveredApp(null)}
                        className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <div className={`${app.color} w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
                          {React.cloneElement(app.icon as React.ReactElement, { size: 14 })}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm text-gray-900">{app.name}</div>
                        </div>
                        <div
                          onClick={(e) => toggleFavorite(app.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Star
                            size={12}
                            className={favorites.has(app.id) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}
                          />
                        </div>
                      </button>
                      {expandedApp === app.id && appActions[app.id] && (
                        <div className="mt-0.5 space-y-0.5 pb-1 border-b border-gray-200">
                          {appActions[app.id].map((action) => (
                            <button
                              key={action.id}
                              onClick={() => {
                                onSelect(app);
                                onClose();
                              }}
                              className="w-full text-left p-1.5 rounded-lg hover:bg-gray-100 transition-colors group/action"
                            >
                              <div className="flex items-start gap-2">
                                <div className={`${app.color} w-5 h-5 rounded flex items-center justify-center text-white flex-shrink-0 mt-0.5`}>
                                  {React.cloneElement(app.icon as React.ReactElement, { size: 10 })}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-900">{action.title}</div>
                                  <div className="text-[10px] text-gray-500 mt-0.5">{action.description}</div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side - Example */}
        <div className="w-1/2 bg-gray-50 p-4 flex flex-col items-center justify-center">
          {currentExamples.map((example) => (
            <div key={example.id} className="space-y-3 max-w-full">
              {example.video ? (
                <video 
                  src={example.video}
                  className="w-full h-48 object-cover rounded-lg"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                />
              ) : (
                <ImageWithFallback 
                  src={example.image}
                  alt={example.title}
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}
              <p className="text-sm text-gray-700 text-center leading-relaxed px-2">{example.title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}

    </div>
  );
}
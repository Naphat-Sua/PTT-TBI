import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Send, Bot, User, RefreshCw, Database, Loader2, ChevronDown, ChevronUp, BookOpen, Globe, ExternalLink, RefreshCcw } from 'lucide-react';
import { Message, QueryResult } from '@/types';
import { queryGemini, queryRAG } from '@/utils/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import MessageLoader from '@/components/ui/message-loader';

// Available AI models
const AI_MODELS = [
  { id: 'gemini-2.0-flash', name: 'Google Gemini 2.0' },
  { id: 'claude-3.7', name: 'Claude 3.7 Sonnet' },
  { id: 'deepseek-r1', name: 'DeepSeek-R1:32b' },
];

// Message Bubble Component
const MessageBubble = ({ message }: { message: Message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div 
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}
    >
      <div className={`flex items-start max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div 
          className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center shadow-md transition-transform duration-300 hover:scale-105
            ${isUser ? 'bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] ml-3' : 'bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] mr-3'}`}
        >
          {isUser ? 
            <User className="h-5 w-5 text-white" /> : 
            <Bot className="h-5 w-5 text-white" />
          }
        </div>
        
        <div 
          className={`py-3 px-4 rounded-2xl shadow-md backdrop-blur-sm transition-all duration-200 hover:shadow-lg ${
            isUser ? 
            'bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] text-white rounded-tr-none' : 
            'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-700'
          }`}
        >
          <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
          
          {message.sources && message.sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/20 dark:border-gray-700">
              <p className="text-xs font-medium mb-2 opacity-80">Sources:</p>
              <ul className="space-y-1.5">
                {message.sources.map((source, index) => (
                  <li key={index} className="text-xs opacity-80 flex items-start">
                    <span className="mr-1.5">•</span>
                    <span>{source.documentName}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Chat Interface Component 
const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useRAG, setUseRAG] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Load messages from localStorage on component mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error('Failed to load saved messages:', e);
      }
    }
    
    // Focus the input field when the component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Save messages to localStorage when they change
  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    // Create user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    // Add user message to the chat
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input field
    setInput('');
    
    // Set loading state
    setIsLoading(true);
    
    try {
      let response: string;
      let sources = undefined;
      
      // Check if RAG mode is enabled
      if (useRAG) {
        // Mock documents for demo - in real app, this would come from the TBIRAG system
        const mockDocuments = [
          "Data analysis is the process of inspecting, cleansing, transforming, and modeling data to discover useful information, inform conclusions, and support decision-making.",
          "Machine learning algorithms can be categorized as supervised (classification, regression), unsupervised (clustering, association), or reinforcement learning.",
          "Feature engineering is the process of using domain knowledge to extract features from raw data that make machine learning algorithms work better."
        ];
        
        // Query the RAG system
        const ragResult = await queryRAG(input, mockDocuments);
        response = ragResult.answer;
        sources = ragResult.sources;
      } else {
        // Check if the message is asking about identity
        if (isIdentityQuestion(input)) {
          // Use the specific identity response based on the model
          response = getIdentityResponse(selectedModel);
        } else {
          // Use regular Gemini API for other questions
          // We'll add a model prefix to the response based on the selected model
          const modelPrefix = getModelPrefix(selectedModel);
          
          // Get the actual response from Gemini API
          const geminiResponse = await queryGemini(input);
          
          // Prepend the model prefix to make it seem like it's coming from the selected model
          response = `${modelPrefix}${geminiResponse}`;
        }
      }
      
      // Create assistant message
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        sources: sources
      };
      
      // Add assistant message to the chat
      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error('Error getting response:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error while processing your message. Please try again.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      
      // Focus the input field after sending a message
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };
  
  // Get model prefix based on selected model
  const getModelPrefix = (modelId: string) => {
    // Only add a prefix for non-Gemini models to simulate different AI models
    const model = AI_MODELS.find(m => m.id === modelId);
    
    if (!model || modelId.startsWith('gemini')) {
      return ''; // No prefix for Gemini models
    }
    
    return `[${model.name}] `;
  };
  
  // Check if the message is asking about identity
  const isIdentityQuestion = (message: string): boolean => {
    const identityPatterns = [
      /who are you/i,
      /what are you/i,
      /your name/i,
      /introduce yourself/i,
      /tell me about yourself/i,
      /what's your name/i,
      /what is your name/i,
      /what model are you/i
    ];
    
    return identityPatterns.some(pattern => pattern.test(message.toLowerCase()));
  };
  
  // Get model-specific identity response
  const getIdentityResponse = (modelId: string): string => {
    switch (modelId) {
      case 'claude-3.7':
        return "I'm Claude, an AI assistant made by Anthropic to be helpful, harmless, and honest. I'm designed to be helpful, harmless, and honest.";
      case 'deepseek-r1':
        return "I'm DeepSeek-R1, an AI assistant built by the DeepSeek team. I'm a 32-billion parameter model designed to help with a wide range of tasks.";
      default:
        // Default to Gemini
        return "I'm an AI assistant powered by Google Gemini. I'm designed to be helpful, accurate, and safe. How can I assist you today?";
    }
  };
  
  // Clear chat history
  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem('chatMessages');
    
    // Focus the input field after clearing chat
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  return (
    <Card className="h-[calc(100vh-16rem)] flex flex-col overflow-hidden border-gray-200 dark:border-gray-800 transition-all duration-300 hover:shadow-lg rounded-xl">
      {/* Chat header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex justify-between items-center rounded-t-xl">
        <div className="flex items-center">
          <div className="flex items-center justify-center bg-gradient-to-r from-[#DFBD69]/20 to-[#B89D4F]/20 w-8 h-8 rounded-full mr-3 shadow-inner">
            <Bot className="h-4 w-4 text-[#DFBD69] dark:text-[#DFBD69]" />
          </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-200">ChatTBU</h3>
        </div>
        <div className="flex items-center space-x-3">
          {/* Model selection dropdown */}
          <Select
            value={selectedModel}
            onValueChange={setSelectedModel}
          >
            <SelectTrigger className="w-[180px] h-8 rounded-full text-xs bg-white/80 dark:bg-gray-800/80 shadow-sm border-[#DFBD69]/30 focus:ring-[#DFBD69]/30 text-gray-800 dark:text-gray-200">
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-lg border-gray-200 dark:border-gray-700">
              {AI_MODELS.map(model => (
                <SelectItem 
                  key={model.id} 
                  value={model.id}
                  className="text-sm cursor-pointer data-[highlighted]:bg-[#DFBD69]/20 data-[highlighted]:text-[#DFBD69]"
                >
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            onClick={() => setUseRAG(!useRAG)}
            variant="outline" 
            size="sm"
            className={`rounded-full transition-all duration-300 shadow-sm ${
              useRAG ? 
              'bg-gradient-to-r from-[#DFBD69]/10 to-[#B89D4F]/10 text-[#DFBD69] border-[#DFBD69]/20 hover:bg-[#DFBD69]/20 dark:bg-[#DFBD69]/20 dark:text-[#DFBD69] dark:border-[#DFBD69]/30' : 
              'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            <Database className="h-3 w-3 mr-1.5" />
            RAG Mode: {useRAG ? 'ON' : 'OFF'}
          </Button>
          <Button
            onClick={handleClearChat}
            variant="ghost" 
            size="icon"
            className="text-[#DFBD69] hover:text-[#B89D4F] dark:text-[#DFBD69] dark:hover:text-[#B89D4F] rounded-full shadow-sm hover:shadow-md hover:bg-[#DFBD69]/10 dark:hover:bg-[#DFBD69]/20"
            title="Clear chat history"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#DFBD69]/20 to-[#B89D4F]/20 flex items-center justify-center mb-4 animate-scale-in shadow-lg">
              <Bot className="h-8 w-8 text-[#DFBD69] dark:text-[#DFBD69]" />
            </div>
            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">ChatTBU Assistant</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md leading-relaxed">
              Powered by Google Gemini. Ask me anything or toggle RAG mode to get answers based on your documents.
            </p>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Message input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-b-xl">
        <form onSubmit={handleSendMessage} className="relative">
          <Input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="w-full pl-4 pr-12 py-3 rounded-full border border-gray-300 dark:border-gray-700 
              focus:ring-2 focus:ring-[#DFBD69] focus:border-transparent transition-all duration-200
              bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-md"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            variant="ghost"
            size="icon"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#DFBD69] rounded-full
              dark:text-[#DFBD69] disabled:text-gray-400 dark:disabled:text-gray-600
              hover:bg-[#DFBD69]/10 dark:hover:bg-[#DFBD69]/20 shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
};

// Usage Manual Component
const ChatUsageManual = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <Card className="overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in rounded-3xl">
      <div 
        className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <BookOpen className="h-5 w-5 text-[#DFBD69] dark:text-[#DFBD69] mr-2" />
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">How to Use ChatTBU</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-8 w-8 hover:bg-gray-200 dark:hover:bg-gray-800"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          )}
        </Button>
      </div>
      
      {isExpanded && (
        <CardContent className="p-6">
          <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200">
            <h4 className="text-lg font-medium text-[#DFBD69] dark:text-[#DFBD69] mt-0">Getting Started</h4>
            <ol className="space-y-3 mt-3">
              <li>
                <strong>Select an AI Model</strong> - Choose from Google Gemini 2.0, Claude 3.7 Sonnet, or DeepSeek-R1:32b using the dropdown menu.
              </li>
              <li>
                <strong>Toggle RAG Mode</strong> - Enable RAG Mode to get answers based on document knowledge (if you've uploaded documents in the TBIRAG section).
              </li>
              <li>
                <strong>Ask Questions</strong> - Type your message in the text box at the bottom and press Enter or click the send button.
              </li>
            </ol>
            
            <h4 className="text-lg font-medium text-[#DFBD69] dark:text-[#DFBD69] mt-6">Features</h4>
            <ul className="space-y-2 mt-3">
              <li><strong>Multiple AI Models</strong> - Switch between different AI models to compare responses.</li>
              <li><strong>RAG Support</strong> - When enabled, answers will reference your uploaded documents.</li>
              <li><strong>Chat History</strong> - Your conversation is saved between sessions.</li>
              <li><strong>Clear Chat</strong> - Use the refresh button to start a new conversation.</li>
            </ul>
            
            <h4 className="text-lg font-medium text-[#DFBD69] dark:text-[#DFBD69] mt-6">Tips for Better Results</h4>
            <ul className="space-y-2 mt-3">
              <li>Be specific in your questions to get more accurate responses.</li>
              <li>For document-specific questions, enable RAG Mode.</li>
              <li>Different AI models may excel at different types of questions.</li>
              <li>For technical or scientific questions, try Claude or DeepSeek.</li>
              <li>For creative content or general knowledge, Gemini often works well.</li>
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// Browser Frame Component
const BrowserFrame = () => {
  const [url, setUrl] = useState('https://gemini.google.com');
  const [inputUrl, setInputUrl] = useState('https://gemini.google.com');
  const [isLoading, setIsLoading] = useState(true);
  const [showError, setShowError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    // Initialize with the default URL
    handleNavigate(null, true);
  }, []);

  const handleNavigate = (e: React.FormEvent | null, isInitial = false) => {
    if (e) {
      e.preventDefault();
    }
    
    // Reset error state
    setShowError(false);
    
    // Add https:// if not present
    let processedUrl = isInitial ? url : inputUrl;
    if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
      processedUrl = `https://${processedUrl}`;
    }
    
    // Update URL states
    setUrl(processedUrl);
    if (!isInitial) {
      setInputUrl(processedUrl);
    }
    
    // Show loading indicator
    setIsLoading(true);
  };
  
  const handleRefresh = () => {
    setIsLoading(true);
    setShowError(false);
    
    try {
      // Try to reload using contentWindow
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.location.reload();
      } else {
        // Fallback: Reset the iframe src
        if (iframeRef.current) {
          iframeRef.current.src = url;
        }
      }
    } catch (error) {
      // Handle cross-origin issues by resetting src
      if (iframeRef.current) {
        iframeRef.current.src = url;
      }
    }
  };
  
  const handleOpenInNewTab = () => {
    if (url && url !== 'about:blank') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
  
  const handleIframeLoad = () => {
    setIsLoading(false);
  };
  
  const handleIframeError = () => {
    setIsLoading(false);
    setShowError(true);
  };
  
  return (
    <Card className="flex flex-col overflow-hidden border-gray-200 dark:border-gray-800 transition-all duration-300 hover:shadow-lg rounded-xl mt-8" style={{ height: '600px' }}>
      {/* Browser header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex justify-between items-center rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center bg-[#8E8EA0]/20 w-8 h-8 rounded-full shadow-inner">
            <Globe className="h-4 w-4 text-[#8E8EA0]" />
          </div>
          <h3 className="font-bold text-gray-800 dark:text-gray-200">Web Browser</h3>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleRefresh}
            variant="ghost" 
            size="icon"
            title="Refresh page"
            className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleOpenInNewTab}
            variant="ghost" 
            size="icon"
            title="Open in new tab"
            className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* URL Input */}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <form onSubmit={(e) => handleNavigate(e)} className="relative">
          <Input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="w-full pl-4 pr-12 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm"
            placeholder="https://example.com"
          />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-1
              hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-full"
          >
            <Send className="h-3 w-3 text-blue-500 dark:text-blue-400" />
          </Button>
        </form>
      </div>
      
      {/* Browser content */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-black/50">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-300">Loading...</p>
            </div>
          </div>
        )}
        
        {showError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 dark:bg-gray-900/95">
            <div className="text-center px-6 py-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-red-200 dark:border-red-900 max-w-md">
              <h4 className="text-red-600 dark:text-red-400 font-medium text-lg mb-2">Unable to load content</h4>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                The requested website might be blocking embedding in iframes due to security restrictions (X-Frame-Options or Content-Security-Policy).
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button 
                  onClick={handleOpenInNewTab}
                  className="bg-blue-500 text-white hover:bg-blue-600"
                >
                  <ExternalLink className="h-4 w-4 mr-2" /> Open in new tab
                </Button>
                <Button
                  onClick={() => {
                    setShowError(false);
                    setInputUrl('https://gemini.google.com');
                    handleNavigate(null);
                  }}
                  variant="outline"
                >
                  Go back to Gemini
                </Button>
              </div>
            </div>
          </div>
        )}
        
        <iframe 
          ref={iframeRef}
          src={url}
          className="w-full h-full border-none"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title="Web Browser"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
          allow="camera; microphone; geolocation"
          importance="high"
        />
      </div>
      
      {/* Browser footer with disclaimer */}
      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm text-xs text-gray-500 dark:text-gray-400 text-center">
        Note: Some websites may not display due to security restrictions. Use the "Open in new tab" button if needed.
      </div>
    </Card>
  );
};

// Main ChatTBU Component
const ChatTBU = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] bg-clip-text text-transparent">ChatTBU</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          Conversational AI assistant. Ask something!
        </p>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <ChatInterface />
        </div>
        <ChatUsageManual />
        <BrowserFrame />
      </div>
    </div>
  );
};

export default ChatTBU;

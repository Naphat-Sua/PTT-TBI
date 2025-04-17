
import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Send, Bot, User, RefreshCw, Database, Loader2, ChevronDown } from 'lucide-react';
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
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0' },
  { id: 'claude-3.7', name: 'Claude 3.7' },
  { id: 'claude-3.5', name: 'Claude 3.5' },
  { id: 'gpt-o1', name: 'GPT-o1' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'deepseek-r1', name: 'DeepSeek-R1:32b (locally)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' }
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
            ${isUser ? 'bg-apple-blue ml-3' : 'bg-gray-200 dark:bg-gray-700 mr-3'}`}
        >
          {isUser ? 
            <User className="h-5 w-5 text-white" /> : 
            <Bot className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          }
        </div>
        
        <div 
          className={`py-3 px-4 rounded-2xl shadow-md backdrop-blur-sm transition-all duration-200 hover:shadow-lg ${
            isUser ? 
            'bg-apple-blue text-white rounded-tr-none' : 
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
        // Use regular Gemini API
        // We'll add a model prefix to the response based on the selected model
        const modelPrefix = getModelPrefix(selectedModel);
        
        // Get the actual response from Gemini API
        const geminiResponse = await queryGemini(input);
        
        // Prepend the model prefix to make it seem like it's coming from the selected model
        response = `${modelPrefix}${geminiResponse}`;
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
          <div className="flex items-center justify-center bg-apple-blue/10 dark:bg-apple-blue/20 w-8 h-8 rounded-full mr-3 shadow-inner">
            <Bot className="h-4 w-4 text-apple-blue dark:text-apple-highlight" />
          </div>
          <h3 className="font-medium text-gray-800 dark:text-gray-200">ChatTBU</h3>
        </div>
        <div className="flex items-center space-x-3">
          {/* Model selection dropdown */}
          <Select
            value={selectedModel}
            onValueChange={setSelectedModel}
          >
            <SelectTrigger className="w-[180px] h-8 rounded-full text-xs bg-white/80 dark:bg-gray-800/80 shadow-sm">
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-lg border-gray-200 dark:border-gray-700">
              {AI_MODELS.map(model => (
                <SelectItem 
                  key={model.id} 
                  value={model.id}
                  className="text-sm cursor-pointer"
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
              'bg-apple-blue/10 text-apple-blue border-apple-blue/20 hover:bg-apple-blue/20 dark:bg-apple-blue/20 dark:text-apple-highlight dark:border-apple-blue/30' : 
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
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full shadow-sm hover:shadow-md"
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
            <div className="w-16 h-16 rounded-full bg-apple-blue/10 dark:bg-apple-blue/20 flex items-center justify-center mb-4 animate-scale-in shadow-lg">
              <Bot className="h-8 w-8 text-apple-blue dark:text-apple-highlight" />
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
              focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-all duration-200
              bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-md"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            variant="ghost"
            size="icon"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-apple-blue rounded-full
              dark:text-apple-highlight disabled:text-gray-400 dark:disabled:text-gray-600
              hover:bg-apple-blue/10 dark:hover:bg-apple-blue/20 shadow-sm"
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

// Main ChatTBU Component
const ChatTBU = () => {
  return (
    <div className="animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">ChatTBU</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Conversational AI assistant powered by Google Gemini. Ask anything or enable RAG mode to query your documents.
        </p>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <ChatInterface />
      </div>
    </div>
  );
};

export default ChatTBU;


import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Send, Bot, User, RefreshCw, Database } from 'lucide-react';
import { Message, QueryResult } from '@/types';
import { queryGemini, queryRAG } from '@/utils/api';

// Message Bubble Component
const MessageBubble = ({ message }: { message: Message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex items-start max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center
          ${isUser ? 'bg-apple-blue ml-3' : 'bg-gray-300 dark:bg-gray-700 mr-3'}`}>
          {isUser ? 
            <User className="h-4 w-4 text-white" /> : 
            <Bot className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          }
        </div>
        
        <div className={`py-3 px-4 rounded-2xl ${
          isUser ? 
          'bg-apple-blue text-white rounded-tr-none' : 
          'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
        }`}>
          <p className="whitespace-pre-line">{message.content}</p>
          
          {message.sources && message.sources.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/20 dark:border-gray-700">
              <p className="text-xs font-medium mb-1 opacity-80">Sources:</p>
              <ul className="space-y-1">
                {message.sources.map((source, index) => (
                  <li key={index} className="text-xs opacity-80">
                    • {source.documentName}
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
        response = await queryGemini(input);
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
    }
  };
  
  // Clear chat history
  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem('chatMessages');
  };
  
  return (
    <div className="h-[calc(100vh-16rem)] flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Chat header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
        <div className="flex items-center">
          <Bot className="h-5 w-5 text-apple-blue dark:text-apple-highlight mr-2" />
          <h3 className="font-medium text-gray-800 dark:text-gray-200">ChatTBU</h3>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setUseRAG(!useRAG)}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center
              ${useRAG ? 
                'bg-apple-blue/10 text-apple-blue dark:bg-apple-blue/20 dark:text-apple-highlight' : 
                'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}
          >
            <Database className="h-3 w-3 mr-1" />
            RAG Mode: {useRAG ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={handleClearChat}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Clear chat history"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Bot className="h-12 w-12 text-gray-300 dark:text-gray-700 mb-4" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">ChatTBU Assistant</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
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
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <form onSubmit={handleSendMessage} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 dark:border-gray-700 
              focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent
              bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-apple-blue 
              dark:text-apple-highlight disabled:text-gray-400 dark:disabled:text-gray-600"
          >
            {isLoading ? (
              <div className="h-5 w-5 rounded-full border-2 border-apple-blue dark:border-apple-highlight border-t-transparent animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

// Main ChatTBU Component
const ChatTBU = () => {
  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">ChatTBU</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
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

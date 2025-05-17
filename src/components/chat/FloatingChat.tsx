import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Bot, User, Send, X, MessageSquare, Loader2, ExternalLink, Mail } from 'lucide-react';
import { queryGemini, sendMessageToAdmin } from '@/utils/api';
import { cn } from "@/lib/utils";
import MessageLoader from '@/components/ui/message-loader';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  navigationLink?: string;
};

// Define available pages for navigation
const AVAILABLE_PAGES = {
  'chat': { path: '/chat', label: 'ChatTBU' },
  'chattbu': { path: '/chat', label: 'ChatTBU' },
  'tbirag': { path: '/rag', label: 'TBIRAG' },
  'fullrag': { path: '/fullrag', label: 'Full RAG' },
  'algotrade': { path: '/algotrade', label: 'AlgoTrade' },
  'algo': { path: '/algotrade', label: 'AlgoTrade' },
  'trading': { path: '/algotrade', label: 'AlgoTrade' },
  'trade': { path: '/algotrade', label: 'AlgoTrade' },
  'oil': { path: '/fullrag', label: 'Full RAG' },
  'modeling': { path: '/modeling', label: 'M-Modeling' },
  'mmodeling': { path: '/modeling', label: 'M-Modeling' },
  'home': { path: '/', label: 'Home' },
  'home page': { path: '/', label: 'Home' },
  'landing': { path: '/', label: 'Home' },
  'main': { path: '/', label: 'Home' },
  'main page': { path: '/', label: 'Home' },
  // Removed ambiguous 'rag' mapping
};

// Ambiguous navigation terms that need clarification
const AMBIGUOUS_TERMS = {
  'rag': ['TBIRAG', 'Full RAG']
};

const FloatingChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Contact admin dialog state
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sendingContactMessage, setSendingContactMessage] = useState(false);
  
  // Initial welcome message when chat is opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: uuidv4(),
        role: 'assistant',
        content: "Hi there! I'm your TBU Platform assistant. How can I help you with the website today? If you need to contact the admin, just ask me.",
        timestamp: new Date()
      }]);
    }
  }, [isOpen, messages.length]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);
  
  // Toggle chat open/closed and reset chat when closed
  const toggleChat = () => {
    if (isOpen) {
      // Reset chat when closing
      setMessages([]);
      setInput('');
    }
    setIsOpen(!isOpen);
  };
  
  // Handle navigation to a different page
  const handleNavigate = (path: string) => {
    // Close chat
    setIsOpen(false);
    
    // Reset messages
    setMessages([]);
    
    // Navigate to the requested page
    navigate(path);
  };
  
  // Check if the user is asking to navigate to a page
  const detectNavigation = (userInput: string): { path: string | null, isAmbiguous: boolean, ambiguousOptions?: string[] } => {
    // Convert to lowercase for matching
    const lowercaseInput = userInput.toLowerCase();
    
    // Check for navigation phrases
    const navigationPhrases = [
      'take me to', 'go to', 'navigate to', 'open', 'show me', 'bring me to', 'switch to'
    ];
    
    let isNavigationRequest = false;
    for (const phrase of navigationPhrases) {
      if (lowercaseInput.includes(phrase)) {
        isNavigationRequest = true;
        break;
      }
    }
    
    if (!isNavigationRequest) return { path: null, isAmbiguous: false };
    
    // Check for ambiguous terms first
    for (const [term, options] of Object.entries(AMBIGUOUS_TERMS)) {
      if (lowercaseInput.includes(term)) {
        // Check if the input specifies which option is meant
        let isSpecific = false;
        for (const option of options) {
          if (lowercaseInput.includes(option.toLowerCase())) {
            isSpecific = true;
            const normalizedOption = option.toLowerCase().replace(/\s+/g, '');
            if (Object.keys(AVAILABLE_PAGES).includes(normalizedOption)) {
              return { 
                path: AVAILABLE_PAGES[normalizedOption as keyof typeof AVAILABLE_PAGES].path, 
                isAmbiguous: false 
              };
            }
          }
        }
        
        // If no specific option is mentioned, it's ambiguous
        if (!isSpecific) {
          return { 
            path: null, 
            isAmbiguous: true, 
            ambiguousOptions: options
          };
        }
      }
    }
    
    // Check regular navigation terms
    for (const [key, value] of Object.entries(AVAILABLE_PAGES)) {
      if (lowercaseInput.includes(key)) {
        return { path: value.path, isAmbiguous: false };
      }
    }
    
    return { path: null, isAmbiguous: false };
  };
  
  // Check if user is asking to contact admin
  const detectContactAdminRequest = (userInput: string): boolean => {
    const lowercaseInput = userInput.toLowerCase();
    const contactPhrases = [
      'contact admin', 'contact the admin', 'message admin', 'email admin', 
      'send message to admin', 'send email to admin', 'reach admin',
      'talk to admin', 'contact support', 'message support', 'support team'
    ];
    
    return contactPhrases.some(phrase => lowercaseInput.includes(phrase));
  };
  
  // Handle sending a message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
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
    
    // Check if this is a contact admin request
    if (detectContactAdminRequest(input)) {
      // Show the contact admin form
      setContactDialogOpen(true);
      
      // Add assistant's response about contacting admin
      const contactMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: "I see you'd like to contact the admin. I've opened a form where you can send a direct message to the admin.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, contactMessage]);
      setInput('');
      return;
    }
    
    // Check if this is a navigation request
    const navigationResult = detectNavigation(input);
    
    // Clear input field
    setInput('');
    
    // Handle ambiguous navigation request
    if (navigationResult.isAmbiguous && navigationResult.ambiguousOptions) {
      const options = navigationResult.ambiguousOptions.join(' or ');
      
      // Add assistant's ambiguity response
      const ambiguityMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `I notice you want to navigate to a RAG page. Could you please clarify whether you want to go to ${options}? You can say "Take me to TBIRAG" or "Navigate to Full RAG".`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, ambiguityMessage]);
      return;
    }
    
    // Handle valid navigation request
    if (navigationResult.path) {
      const pageName = Object.values(AVAILABLE_PAGES).find(page => page.path === navigationResult.path)?.label || 'requested page';
      
      // Add assistant's navigation confirmation
      const navMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `Navigating you to ${pageName} now...`,
        timestamp: new Date(),
        navigationLink: navigationResult.path
      };
      
      setMessages(prev => [...prev, navMessage]);
      
      // Wait a moment to let the user see the message, then navigate
      setTimeout(() => {
        handleNavigate(navigationResult.path!);
      }, 1500);
      
      return;
    }
    
    // Set loading state for regular messages
    setIsLoading(true);
    
    try {
      // Prepare a context-aware prompt for website support
      const supportPrompt = `The user is asking about the TBU Platform website. They said: "${input}" 
As the TBU Platform support assistant, please provide a helpful response focused on website navigation, 
features, or troubleshooting. The platform includes: TBIRAG (document search), Full RAG (oil market data), 
AlgoTrade (trading strategies), ChatTBU (AI assistant), and M-Modeling (coming soon).

If they want to navigate to a specific page, also mention that they can ask you to navigate them directly.
If they want to contact the admin, inform them they can ask you to "contact admin" and you'll provide a contact form.`;
      
      // Get response from Gemini API with the support context
      const response = await queryGemini(supportPrompt);
      
      // Create assistant message
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      // Add assistant message to the chat
      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error('Error getting response:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error while processing your question about the website. Please try again.",
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

  // Handle sending contact message to admin
  const handleSendContactMessage = async () => {
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields before sending",
        variant: "destructive"
      });
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }
    
    setSendingContactMessage(true);
    
    try {
      await sendMessageToAdmin(contactName, contactEmail, contactMessage);
      
      // Close the dialog and add confirmation message
      setContactDialogOpen(false);
      
      // Clear the form
      setContactName('');
      setContactEmail('');
      setContactMessage('');
      
      // Add success message to the chat
      const successMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: "Your message has been sent to the admin successfully. Thank you for reaching out!",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, successMessage]);
      
      // Show toast notification
      toast({
        title: "Message sent",
        description: "Your message has been sent to the admin successfully",
        variant: "default"
      });
      
    } catch (error) {
      console.error('Error sending message to admin:', error);
      
      // Show error toast
      toast({
        title: "Failed to send message",
        description: "There was an error sending your message. Please try again later.",
        variant: "destructive"
      });
      
      // Add error message to chat
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: "I'm sorry, there was an error sending your message to the admin. Please try again later.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSendingContactMessage(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={toggleChat}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] shadow-lg flex items-center justify-center",
          "hover:shadow-xl transition-all duration-300 transform hover:scale-105",
          isOpen ? "rotate-90" : "rotate-0"
        )}
        aria-label="Chat support"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageSquare className="h-6 w-6 text-white" />
        )}
      </button>
      
      {/* Chat Panel */}
      <div 
        className={cn(
          "fixed bottom-24 right-6 z-50 w-80 bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] rounded-3xl shadow-xl border border-[#DFBD69]/30",
          "transition-all duration-300 transform overflow-hidden",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
        )}
      >
        {/* Chat Header */}
        <div className="p-3 border-b border-[#DFBD69]/30 bg-gradient-to-r from-[#DFBD69]/90 to-[#B89D4F]/90 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mr-3 shadow-inner">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-white">TBU Assistant</h3>
                <p className="text-xs text-white/80">How can I help you?</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setContactDialogOpen(true)}
              className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30"
              title="Contact Admin"
            >
              <Mail className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>
        
        {/* Chat Messages */}
        <div 
          ref={chatContainerRef}
          className="p-4 h-80 overflow-y-auto bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm"
        >
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`mb-3 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={cn(
                  "max-w-[85%] p-3 rounded-3xl shadow-sm",
                  message.role === 'user' 
                    ? "bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] text-white rounded-tr-none"
                    : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none border border-[#DFBD69]/20"
                )}
              >
                <p className="text-sm break-words">{message.content}</p>
                
                {message.navigationLink && (
                  <div className="mt-2 pt-2 border-t border-[#DFBD69]/20 dark:border-[#DFBD69]/10">
                    <button
                      onClick={() => handleNavigate(message.navigationLink!)}
                      className="flex items-center text-xs font-medium text-[#DFBD69] dark:text-[#DFBD69] hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Navigate now
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start mb-3">
              <div className="bg-white dark:bg-gray-700 rounded-3xl rounded-tl-none p-3 shadow-sm max-w-[85%] border border-[#DFBD69]/20">
                <MessageLoader size="sm" color="secondary" />
              </div>
            </div>
          )}
        </div>
        
        {/* Chat Input */}
        <div className="p-3 border-t border-[#DFBD69]/30 bg-gradient-to-r from-[#DFBD69]/90 to-[#B89D4F]/90">
          <form onSubmit={handleSendMessage} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the website or navigate..."
              disabled={isLoading}
              className="w-full pl-4 pr-12 py-3 text-sm rounded-full border border-[#DFBD69]/30 
                focus:ring-2 focus:ring-white/50 focus:border-transparent bg-white/90 dark:bg-gray-800/90 
                text-gray-800 dark:text-gray-200 transition-all duration-200 shadow-inner"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full
                bg-white/90 text-[#DFBD69] hover:bg-white/100 hover:text-[#B89D4F] h-8 w-8 p-1.5 
                shadow-sm flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
      
      {/* Contact Admin Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-xl">
          <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <DialogTitle className="flex items-center gap-2 text-[#DFBD69]">
              <Mail className="h-5 w-5" />
              Contact Admin
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              Send a message directly to the admin
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-6">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right text-gray-600 dark:text-gray-300 font-normal">
                Name
              </Label>
              <div className="col-span-3 relative">
                <Input
                  id="name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="border-gray-200 dark:border-gray-700 focus:border-[#DFBD69] focus:ring-1 focus:ring-[#DFBD69] bg-white dark:bg-gray-800 rounded-full shadow-sm"
                  placeholder="Your name"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right text-gray-600 dark:text-gray-300 font-normal">
                Email
              </Label>
              <div className="col-span-3">
                <Input
                  id="email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="border-gray-200 dark:border-gray-700 focus:border-[#DFBD69] focus:ring-1 focus:ring-[#DFBD69] bg-white dark:bg-gray-800 rounded-full shadow-sm"
                  placeholder="Your email"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="message" className="text-right text-gray-600 dark:text-gray-300 font-normal">
                Message
              </Label>
              <div className="col-span-3">
                <Textarea
                  id="message"
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  className="border-gray-200 dark:border-gray-700 focus:border-[#DFBD69] focus:ring-1 focus:ring-[#DFBD69] bg-white dark:bg-gray-800 rounded-xl shadow-sm resize-none"
                  placeholder="Your message"
                  rows={5}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <Button
              variant="outline"
              onClick={() => setContactDialogOpen(false)}
              disabled={sendingContactMessage}
              className="rounded-full border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-6"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={handleSendContactMessage}
              disabled={sendingContactMessage || !contactName || !contactEmail || !contactMessage}
              className="rounded-full bg-[#DFBD69] hover:bg-[#B89D4F] text-white shadow-sm px-6"
            >
              {sendingContactMessage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingChat;
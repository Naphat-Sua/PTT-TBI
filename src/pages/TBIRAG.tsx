import { useState, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Upload, Search, File, XCircle, Send, FileText, Trash2, AlertCircle, ChevronDown, ChevronUp, Info, BookOpen } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Document, QueryResult, ChatMessage } from '@/types';
import { processFile, chunkText, queryRAG } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import FileUploadZone from '@/components/ui/FileUploadZone';
import MessageLoader from '@/components/ui/message-loader';
import { useToast } from '@/hooks/use-toast';

// Document Uploader Component
const DocumentUploader = ({ onDocumentProcessed }: { onDocumentProcessed: (doc: Document) => void }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFilesAdded = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    setIsProcessing(true);
    setProcessingError(null);
    
    try {
      // Process the file to extract text
      const content = await processFile(file);
      
      // Create document chunks for later embedding
      const chunks = chunkText(content);
      
      // Create a new document object
      const newDocument: Document = {
        id: uuidv4(),
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date(),
        content,
        chunks: chunks.map((chunkContent, index) => ({
          id: uuidv4(),
          documentId: '', // Will be filled in after document creation
          content: chunkContent,
          index
        }))
      };
      
      // Update the documentId in each chunk
      newDocument.chunks = newDocument.chunks.map(chunk => ({
        ...chunk,
        documentId: newDocument.id
      }));
      
      // Pass the processed document up to the parent component
      onDocumentProcessed(newDocument);
      
      // Show success toast
      toast({
        title: "Document processed",
        description: `Successfully processed "${file.name}"`,
      });
      
    } catch (error) {
      console.error('Error processing file:', error);
      setProcessingError('Failed to process the file. Please try again.');
      
      // Show error toast
      toast({
        title: "Processing failed",
        description: "Could not process the document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [onDocumentProcessed, toast]);
  
  const acceptedFileTypes = {
    'text/plain': ['.txt'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/csv': ['.csv']
  };
  
  return (
    <div className="mb-8 animate-fade-in">
      <FileUploadZone
        onFilesAdded={handleFilesAdded}
        acceptedFileTypes={acceptedFileTypes}
        maxSize={100 * 1024 * 1024} // Allow up to 100MB files
        icon="document"
        label="Drag & drop a document here, or click to select"
        sublabel="Supported formats: TXT, PDF, DOC, DOCX, CSV"
        isProcessing={isProcessing}
        error={processingError}
      />
    </div>
  );
};

// Document List Component
const DocumentList = ({ 
  documents, 
  onRemoveDocument 
}: { 
  documents: Document[], 
  onRemoveDocument: (id: string) => void 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { toast } = useToast();

  if (documents.length === 0) {
    return null;
  }
  
  const handleRemove = (id: string, name: string) => {
    onRemoveDocument(id);
    toast({
      title: "Document removed",
      description: `"${name}" has been removed from your library`,
    });
  };

  return (
    <Card className="mb-8 overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in rounded-3xl">
      <div 
        className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <FileText className="h-5 w-5 text-[#DFBD69] dark:text-[#DFBD69] mr-2" />
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Your Documents ({documents.length})</h3>
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
        <div className="divide-y divide-gray-200 dark:divide-gray-800 max-h-[350px] overflow-y-auto">
          {documents.map(doc => (
            <div 
              key={doc.id} 
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-850 transition-colors duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg mr-3">
                    <File className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-200 line-clamp-1">{doc.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(doc.uploadedAt).toLocaleDateString()} • {(doc.size / 1024).toFixed(1)} KB
                      {doc.chunks && ` • ${doc.chunks.length} chunks`}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleRemove(doc.id, doc.name)}
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-full h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// RAG Query Component
const QueryInterface = ({ 
  documents, 
  onQueryResult,
  isQuerying 
}: { 
  documents: Document[], 
  onQueryResult: (result: QueryResult) => void,
  isQuerying: boolean 
}) => {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim() || documents.length === 0 || isQuerying) return;
    
    setError(null);
    
    try {
      // Create a temporary user-facing message with the query
      const tempResult: QueryResult = {
        answer: 'Searching documents...',
        query: query, // Store the user's query
        sources: []
      };
      
      // Pass the temporary result to show searching status
      onQueryResult(tempResult);
      
      // Get document contents and names for context
      const docContents = documents.map(doc => doc.content || '');
      const docNames = documents.map(doc => doc.name);
      
      // Query the RAG system with both document contents and names
      const result = await queryRAG(query, docContents, docNames);
      
      // Make sure to include the user's query in the result
      result.query = query;
      
      // Pass result to parent component
      onQueryResult(result);
      
      // Clear the query input
      setQuery('');
      
    } catch (error) {
      console.error('Error querying RAG system:', error);
      setError('Failed to process your query. Please try again.');
      
      toast({
        title: "Query failed",
        description: "Could not process your question. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const hasDocuments = documents.length > 0;
  
  return (
    <Card className="mb-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in rounded-3xl">
      <CardContent className="p-6">
        <div className="flex items-center mb-4">
          <Search className="h-5 w-5 text-[#DFBD69] dark:text-[#DFBD69] mr-2" />
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Ask a Question</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="relative">
          <div className="chat-input-container relative bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={hasDocuments ? "Type your message..." : "Upload documents first..."}
              disabled={!hasDocuments || isQuerying}
              className="w-full px-6 py-4 bg-transparent border-none focus:outline-none focus:ring-0
                text-gray-800 dark:text-gray-200 pr-14
                disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
            />
            <Button
              type="submit"
              disabled={!hasDocuments || !query.trim() || isQuerying}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full
                text-white bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] hover:bg-gradient-to-r hover:from-[#DFBD69]/90 hover:to-[#B89D4F]/90 disabled:bg-gray-400
                dark:bg-gradient-to-r dark:from-[#DFBD69] dark:to-[#B89D4F] dark:hover:from-[#DFBD69]/90 dark:hover:to-[#B89D4F]/90 dark:disabled:bg-gray-700 
                disabled:cursor-not-allowed transition-colors duration-200 h-10 w-10 p-0 flex items-center justify-center"
            >
              {isQuerying ? (
                <MessageLoader size="sm" color="secondary" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          
          {error && (
            <div className="mt-2 text-sm text-red-500 dark:text-red-400 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {error}
            </div>
          )}
          
          {!hasDocuments && (
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center">
              <Info className="h-4 w-4 mr-1" />
              Upload some documents to start asking questions
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

// Results Display Component
const ResultsDisplay = ({ results, isQuerying }: { results: QueryResult[], isQuerying: boolean }) => {
  if (results.length === 0) {
    return null;
  }
  
  return (
    <div className="animate-fade-in">
      <div className="flex items-center mb-4">
        <Search className="h-5 w-5 text-[#DFBD69] dark:text-[#DFBD69] mr-2" />
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Results</h3>
      </div>
      
      <div className="space-y-6">
        {results.map((result, index) => (
          <Card 
            key={index}
            className={`border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md 
              transition-all duration-300 overflow-hidden rounded-3xl ${index === 0 && isQuerying ? 'animate-pulse' : 'animate-scale-in'}`}
          >
            <div className="p-6">
              <div className="prose dark:prose-invert max-w-none">
                {index === 0 && isQuerying ? (
                  <div className="flex items-center space-x-3">
                    <MessageLoader color="primary" />
                    <p className="text-gray-600 dark:text-gray-300">Searching documents and generating response...</p>
                  </div>
                ) : (
                  <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed">
                    {result.answer}
                  </p>
                )}
              </div>
              
              {/* Display the user's query below the answer */}
              {result.query && !isQuerying && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex items-start">
                    <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full mr-3 mt-0.5">
                      <Search className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">You asked:</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{result.query}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {result.sources.length > 0 && !isQuerying && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <p className="font-medium text-sm text-gray-600 dark:text-gray-300 mb-3 flex items-center">
                    <FileText className="h-4 w-4 mr-1.5 text-[#DFBD69] dark:text-[#DFBD69]" />
                    Sources
                  </p>
                  <ul className="space-y-3">
                    {result.sources.map((source, i) => (
                      <li 
                        key={i} 
                        className="text-sm bg-gray-50 dark:bg-gray-900 rounded-2xl p-3 border border-gray-200 dark:border-gray-800"
                      >
                        <p className="font-medium text-[#DFBD69] dark:text-[#DFBD69] mb-1">
                          {source.documentName}
                        </p>
                        {source.excerpt && (
                          <p className="text-gray-600 dark:text-gray-300 text-xs mt-1 italic">
                            "{source.excerpt}"
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Chat History Display Component
const ChatHistoryDisplay = ({ 
  chatHistory,
  isQuerying,
  onClear
}: { 
  chatHistory: ChatMessage[], 
  isQuerying: boolean,
  onClear: () => void
}) => {
  if (chatHistory.length === 0 && !isQuerying) {
    return null;
  }

  // Format timestamp to HH:MM:SS
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };
  
  // Create a reversed copy of chat history to show newest first
  const reversedChatHistory = [...chatHistory].reverse();

  return (
    <div className="animate-fade-in mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <FileText className="h-5 w-5 text-[#DFBD69] dark:text-[#DFBD69] mr-2" />
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Conversation History</h3>
        </div>
        {chatHistory.length > 0 && (
          <Button
            onClick={onClear}
            variant="ghost"
            size="sm"
            className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
          >
            Clear history
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {isQuerying && (
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm animate-pulse rounded-3xl">
            <div className="p-4">
              <div className="flex items-center space-x-3">
                <MessageLoader color="primary" />
                <p className="text-gray-600 dark:text-gray-300">Searching documents and generating response...</p>
              </div>
            </div>
          </Card>
        )}

        {/* Display chat messages with newest first */}
        {reversedChatHistory.map((message) => {
          // Find the next message to link user questions with AI responses
          const isUserMessage = message.type === 'user';
          
          return (
            <Card 
              key={message.id}
              className={`border ${
                isUserMessage 
                  ? 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50' 
                  : 'border-gray-200 dark:border-gray-800'
              } shadow-sm transition-all duration-300 rounded-3xl`}
            >
              <div className="p-4">
                {/* User message */}
                {isUserMessage && (
                  <div className="flex items-start">
                    <div className="bg-gray-200 dark:bg-gray-800 p-2 rounded-full mr-3 mt-0.5">
                      <Search className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          You asked:
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed mt-1">
                        {message.content}
                      </p>
                    </div>
                  </div>
                )}

                {/* Assistant message */}
                {!isUserMessage && (
                  <div>
                    <div className="flex items-start mb-3">
                      <div className="bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] p-2 rounded-full mr-3 mt-0.5">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Answer:
                          </p>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="prose dark:prose-invert max-w-none ml-9">
                      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed">
                        {message.content}
                      </p>
                    </div>

                    {/* Sources section */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 ml-9">
                        <p className="font-medium text-sm text-gray-600 dark:text-gray-300 mb-3 flex items-center">
                          <FileText className="h-4 w-4 mr-1.5 text-[#DFBD69] dark:text-[#DFBD69]" />
                          Sources
                        </p>
                        <ul className="space-y-3">
                          {message.sources.map((source, i) => (
                            <li 
                              key={i} 
                              className="text-sm bg-gray-50 dark:bg-gray-900 rounded-2xl p-3 border border-gray-200 dark:border-gray-800"
                            >
                              <p className="font-medium text-[#DFBD69] dark:text-[#DFBD69] mb-1">
                                {source.documentName}
                              </p>
                              {source.excerpt && (
                                <p className="text-gray-600 dark:text-gray-300 text-xs mt-1 italic">
                                  "{source.excerpt}"
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// Usage Manual Component
const UsageManual = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <Card className="mb-8 overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in rounded-3xl">
      <div 
        className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <BookOpen className="h-5 w-5 text-[#DFBD69] dark:text-[#DFBD69] mr-2" />
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">How to Use TBIRAG</h3>
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
                <strong>Upload Documents</strong> - Start by uploading one or more documents (PDF, TXT, DOC, DOCX, CSV) using the document uploader at the top of the page.
              </li>
              <li>
                <strong>Ask Questions</strong> - Once your documents are uploaded, use the question box to ask anything related to the content of your documents.
              </li>
              <li>
                <strong>Review Answers</strong> - The system will analyze your documents and provide an answer with relevant sources from your documents.
              </li>
            </ol>
            
            <h4 className="text-lg font-medium text-[#DFBD69] dark:text-[#DFBD69] mt-6">Tips for Better Results</h4>
            <ul className="space-y-2 mt-3">
              <li>Ask specific questions rather than open-ended ones for more precise answers.</li>
              <li>You can upload multiple documents to compare information across sources.</li>
              <li>The system works best with clearly formatted documents.</li>
              <li>Check the "Sources" section to verify where information came from.</li>
              <li>Your documents and chat history are saved locally and will persist between sessions.</li>
            </ul>
            
            <h4 className="text-lg font-medium text-[#DFBD69] dark:text-[#DFBD69] mt-6">Example Questions</h4>
            <ul className="space-y-2 mt-3">
              <li>"What are the key findings in the document?"</li>
              <li>"Summarize the section about [specific topic]."</li>
              <li>"What does the document say about [specific term]?"</li>
              <li>"Compare how [topic] is discussed in the uploaded documents."</li>
              <li>"What are the recommendations mentioned in the third section?"</li>
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// Main TBIRAG Component
const TBIRAG = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const { toast } = useToast();
  
  // Load documents and chat history from localStorage on component mount
  useEffect(() => {
    // Load documents
    const savedDocs = localStorage.getItem('ragDocuments');
    if (savedDocs) {
      try {
        setDocuments(JSON.parse(savedDocs));
      } catch (e) {
        console.error('Failed to load saved documents:', e);
        toast({
          title: "Error loading documents",
          description: "Could not load your saved documents.",
          variant: "destructive",
        });
      }
    }
    
    // Load chat history
    const savedChat = localStorage.getItem('ragChatHistory');
    if (savedChat) {
      try {
        setChatHistory(JSON.parse(savedChat));
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
    }
  }, [toast]);
  
  // Save documents and chat history to localStorage when they change
  useEffect(() => {
    localStorage.setItem('ragDocuments', JSON.stringify(documents));
  }, [documents]);
  
  useEffect(() => {
    localStorage.setItem('ragChatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);
  
  // Handle adding a new document
  const handleDocumentProcessed = (newDocument: Document) => {
    setDocuments(prevDocs => [newDocument, ...prevDocs]);
  };
  
  // Handle removing a document
  const handleRemoveDocument = (id: string) => {
    setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== id));
  };
  
  // Handle query results
  const handleQueryResult = async (result: QueryResult) => {
    // If this is a "searching" placeholder, just set the querying state
    if (result.answer === 'Searching documents...') {
      setIsQuerying(true);
      return;
    }
    
    // For real results, add both the user query and the AI response to the chat history
    if (result.query) {
      const userMessage: ChatMessage = {
        id: uuidv4(),
        type: 'user',
        content: result.query,
        timestamp: new Date(),
      };
      
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        type: 'assistant',
        content: result.answer,
        timestamp: new Date(),
        sources: result.sources
      };
      
      // Add both messages to the chat history
      setChatHistory(prev => [...prev, userMessage, assistantMessage]);
    }
    
    setIsQuerying(false);
  };
  
  // Clear chat history
  const handleClearChat = () => {
    setChatHistory([]);
  };
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] bg-clip-text text-transparent">TBIRAG</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          Retrieval-Augmented Generation System. Upload documents and ask questions to get smart, contextual answers.
        </p>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <DocumentUploader onDocumentProcessed={handleDocumentProcessed} />
        <DocumentList documents={documents} onRemoveDocument={handleRemoveDocument} />
        <QueryInterface 
          documents={documents} 
          onQueryResult={handleQueryResult} 
          isQuerying={isQuerying}
        />
        <ChatHistoryDisplay 
          chatHistory={chatHistory} 
          isQuerying={isQuerying} 
          onClear={handleClearChat}
        />
        <UsageManual />
      </div>
    </div>
  );
};

export default TBIRAG;

import { useState, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Upload, Search, File, XCircle, Send, FileText, Trash2, AlertCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Document, QueryResult } from '@/types';
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
    <Card className="mb-8 overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in">
      <div 
        className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <FileText className="h-5 w-5 text-apple-blue dark:text-apple-highlight mr-2" />
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
      // Get document content for context
      const docContents = documents.map(doc => doc.content || '');
      
      // Create a temporary user-facing message with the query
      const tempResult: QueryResult = {
        answer: 'Searching documents...',
        sources: []
      };
      
      // Pass the temporary result to show searching status
      onQueryResult(tempResult);
      
      // Query the RAG system (This will be replaced by the real response)
      const result = await queryRAG(query, docContents);
      
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
    <Card className="mb-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in">
      <CardContent className="p-6">
        <div className="flex items-center mb-4">
          <Search className="h-5 w-5 text-apple-blue dark:text-apple-highlight mr-2" />
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Ask a Question</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={hasDocuments ? "Ask something about your documents..." : "Upload documents first..."}
              disabled={!hasDocuments || isQuerying}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 
                focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent
                bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 pr-12
                disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed
                transition-all duration-200"
            />
            <Button
              type="submit"
              disabled={!hasDocuments || !query.trim() || isQuerying}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-lg
                text-white bg-apple-blue hover:bg-apple-blue/90 disabled:bg-gray-400
                dark:bg-apple-highlight dark:hover:bg-apple-highlight/90 dark:disabled:bg-gray-700 
                disabled:cursor-not-allowed transition-colors duration-200 h-8 w-8 p-0"
            >
              {isQuerying ? (
                <MessageLoader size="sm" color="secondary" />
              ) : (
                <Send className="h-4 w-4" />
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
        <Search className="h-5 w-5 text-apple-blue dark:text-apple-highlight mr-2" />
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Results</h3>
      </div>
      
      <div className="space-y-6">
        {results.map((result, index) => (
          <Card 
            key={index}
            className={`border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md 
              transition-all duration-300 overflow-hidden ${index === 0 && isQuerying ? 'animate-pulse' : 'animate-scale-in'}`}
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
              
              {result.sources.length > 0 && !isQuerying && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <p className="font-medium text-sm text-gray-600 dark:text-gray-300 mb-3 flex items-center">
                    <FileText className="h-4 w-4 mr-1.5 text-apple-blue dark:text-apple-highlight" />
                    Sources
                  </p>
                  <ul className="space-y-3">
                    {result.sources.map((source, i) => (
                      <li 
                        key={i} 
                        className="text-sm bg-gray-50 dark:bg-gray-900 rounded-xl p-3 border border-gray-200 dark:border-gray-800"
                      >
                        <p className="font-medium text-apple-blue dark:text-apple-highlight mb-1">
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

// Main TBIRAG Component
const TBIRAG = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [results, setResults] = useState<QueryResult[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const { toast } = useToast();
  
  // Load documents from localStorage on component mount
  useEffect(() => {
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
  }, [toast]);
  
  // Save documents to localStorage when they change
  useEffect(() => {
    localStorage.setItem('ragDocuments', JSON.stringify(documents));
  }, [documents]);
  
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
    // If this is a "searching" placeholder, replace the first result
    if (result.answer === 'Searching documents...') {
      setIsQuerying(true);
      setResults(prevResults => [result, ...prevResults.slice(1)]);
      return;
    }
    
    // For real results, add them at the beginning
    setResults(prevResults => [result, ...prevResults]);
    setIsQuerying(false);
  };
  
  return (
    <div className="animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">TBIRAG</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
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
        <ResultsDisplay results={results} isQuerying={isQuerying} />
      </div>
    </div>
  );
};

export default TBIRAG;


import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Upload, Search, File, XCircle, Send } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Document, QueryResult } from '@/types';
import { processFile, chunkText, queryRAG } from '@/utils/api';

// Document Uploader Component
const DocumentUploader = ({ onDocumentProcessed }: { onDocumentProcessed: (doc: Document) => void }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
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
      
    } catch (error) {
      console.error('Error processing file:', error);
      setProcessingError('Failed to process the file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [onDocumentProcessed]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });
  
  return (
    <div className="mb-8">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-apple-blue bg-blue-50 dark:bg-blue-900/10' : 
          'border-gray-300 dark:border-gray-700 hover:border-apple-blue dark:hover:border-apple-highlight'}`}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
        
        {isProcessing ? (
          <p className="text-gray-600 dark:text-gray-300">Processing document...</p>
        ) : (
          <>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
              Drag & drop a document here, or click to select
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Supported formats: TXT, PDF, DOC, DOCX, CSV
            </p>
          </>
        )}
        
        {processingError && (
          <p className="mt-3 text-red-500 dark:text-red-400">{processingError}</p>
        )}
      </div>
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
  if (documents.length === 0) {
    return null;
  }
  
  return (
    <div className="mb-8">
      <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Your Documents</h3>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {documents.map(doc => (
            <li key={doc.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center">
                <File className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{doc.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(doc.uploadedAt).toLocaleDateString()} • {(doc.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => onRemoveDocument(doc.id)}
                className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// RAG Query Component
const QueryInterface = ({ 
  documents, 
  onQueryResult 
}: { 
  documents: Document[], 
  onQueryResult: (result: QueryResult) => void 
}) => {
  const [query, setQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim() || documents.length === 0) return;
    
    setIsQuerying(true);
    setError(null);
    
    try {
      // Get document content for context
      const docContents = documents.map(doc => doc.content || '');
      
      // Query the RAG system
      const result = await queryRAG(query, docContents);
      
      // Pass result to parent component
      onQueryResult(result);
      
      // Clear the query input
      setQuery('');
      
    } catch (error) {
      console.error('Error querying RAG system:', error);
      setError('Failed to process your query. Please try again.');
    } finally {
      setIsQuerying(false);
    }
  };
  
  const hasDocuments = documents.length > 0;
  
  return (
    <div className="mb-8">
      <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Ask a Question</h3>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={hasDocuments ? "Ask something about your documents..." : "Upload documents first..."}
            disabled={!hasDocuments || isQuerying}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
              focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent
              bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 pr-12"
          />
          <button
            type="submit"
            disabled={!hasDocuments || !query.trim() || isQuerying}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full
              text-apple-blue dark:text-apple-highlight hover:bg-gray-100 dark:hover:bg-gray-700 
              disabled:text-gray-400 dark:disabled:text-gray-600 disabled:hover:bg-transparent 
              dark:disabled:hover:bg-transparent transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        
        {error && (
          <p className="mt-2 text-sm text-red-500 dark:text-red-400">{error}</p>
        )}
        
        {!hasDocuments && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Upload some documents to start asking questions
          </p>
        )}
      </form>
    </div>
  );
};

// Results Display Component
const ResultsDisplay = ({ results }: { results: QueryResult[] }) => {
  if (results.length === 0) {
    return null;
  }
  
  return (
    <div>
      <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Results</h3>
      <div className="space-y-6">
        {results.map((result, index) => (
          <div 
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 
              dark:border-gray-700 p-6 animate-scale-in"
          >
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line">
                {result.answer}
              </p>
            </div>
            
            {result.sources.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="font-medium text-sm text-gray-500 dark:text-gray-400 mb-2">Sources:</p>
                <ul className="space-y-2">
                  {result.sources.map((source, i) => (
                    <li key={i} className="text-sm bg-gray-50 dark:bg-gray-900 rounded p-2">
                      <p className="font-medium text-apple-blue dark:text-apple-highlight">
                        {source.documentName}
                      </p>
                      {source.excerpt && (
                        <p className="text-gray-600 dark:text-gray-300 text-xs mt-1">
                          "{source.excerpt}"
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Main TBIRAG Component
const TBIRAG = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [results, setResults] = useState<QueryResult[]>([]);
  
  // Load documents from localStorage on component mount
  useEffect(() => {
    const savedDocs = localStorage.getItem('ragDocuments');
    if (savedDocs) {
      try {
        setDocuments(JSON.parse(savedDocs));
      } catch (e) {
        console.error('Failed to load saved documents:', e);
      }
    }
  }, []);
  
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
  const handleQueryResult = (result: QueryResult) => {
    setResults(prevResults => [result, ...prevResults]);
  };
  
  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">TBIRAG</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Retrieval-Augmented Generation System. Upload documents and ask questions to get smart, contextual answers.
        </p>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <DocumentUploader onDocumentProcessed={handleDocumentProcessed} />
        <DocumentList documents={documents} onRemoveDocument={handleRemoveDocument} />
        <QueryInterface documents={documents} onQueryResult={handleQueryResult} />
        <ResultsDisplay results={results} />
      </div>
    </div>
  );
};

export default TBIRAG;

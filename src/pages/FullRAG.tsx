import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Search, File, Send, FileText, Trash2, AlertCircle, 
  ChevronDown, ChevronUp, Info, SlidersHorizontal, 
  BookOpen, RefreshCw, BarChart, Database
} from 'lucide-react';
import { Document, QueryResult, ChatMessage } from '@/types';
import { queryRAG, queryGemini, queryOilData } from '@/utils/api';
import { createOilDataDocumentFromFile } from '@/utils/oilDataService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import MessageLoader from '@/components/ui/message-loader';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

// OilData Fetcher Component
const OilDataFetcher = ({ onDataFetched }: { onDataFetched: (doc: Document) => void }) => {
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFetchOilData = useCallback(async () => {
    setIsFetching(true);
    setFetchError(null);
    
    try {
      // Load oil data from Oildata-current.txt file
      const response = await fetch('/Oildata-current.txt');
      if (!response.ok) {
        throw new Error(`Failed to fetch Oildata-current.txt: ${response.status} ${response.statusText}`);
      }
      
      // Get the oil document via the service function
      const oilDocument = await createOilDataDocumentFromFile();
      
      // Pass the document to parent component
      onDataFetched(oilDocument);
      
      // Show success toast
      toast({
        title: "Data loaded successfully",
        description: `Retrieved WTI Crude Oil prices from Oildata-current.txt (as of April 24, 2025)`,
      });
      
    } catch (error) {
      console.error('Error loading oil data from file:', error);
      setFetchError('Failed to load oil data from file. Please try again.');
      
      // Show error toast
      toast({
        title: "Data load failed",
        description: "Could not retrieve WTI Crude Oil data from local file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  }, [onDataFetched, toast]);
  
  // No automatic loading - users must click the button
  
  return (
    <Card className="mb-8 overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in rounded-3xl">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center">
          <BarChart className="h-16 w-16 text-[#DFBD69] dark:text-[#DFBD69] mb-3" />
          <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-2">Full-Automation RAG</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">
            Analyze the latest <span className="font-medium text-[#DFBD69] dark:text-[#DFBD69]">WTI crude oil price data</span> powered by <span className="font-medium text-[#DFBD69] dark:text-[#DFBD69]">ollama DeepSeek-R1:32b</span> to get insights, analyze trends, and make informed decisions.
            <br />
            <span className="text-sm italic">(Click the button below to load data from API <span className="font-medium text-[#DFBD69] dark:text-[#DFBD69]">finance.yahoo.com/quote/CL=F/</span>)</span>
            </p>
          
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleFetchOilData}
              disabled={isFetching}
              variant="default"
              className="flex items-center gap-2 bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] hover:opacity-90"
            >
              {isFetching ? (
                <MessageLoader size="sm" color="secondary" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>{isFetching ? 'Loading Data...' : 'Load Oil Data'}</span>
            </Button>
            
            <Button
              onClick={() => window.open('https://finance.yahoo.com/quote/CL=F/', '_blank')}
              variant="outline"
              className="border-[#DFBD69] text-[#DFBD69] hover:bg-[#DFBD69]/10"
            >
              <Database className="h-4 w-4 mr-2" />
              View Source
            </Button>
          </div>
          
          {fetchError && (
            <div className="mt-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{fetchError}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
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
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const { toast } = useToast();

  if (documents.length === 0) {
    return null;
  }
  
  // Format timestamp to display both date and time
  const formatDateTime = (date: Date) => {
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })}`;
  };
  
  const handleRemove = (id: string, name: string) => {
    onRemoveDocument(id);
    toast({
      title: "Document removed",
      description: `"${name}" has been removed from your library`,
    });
  };
  
  const toggleDocumentExpansion = (id: string) => {
    setExpandedDocId(prevId => prevId === id ? null : id);
  };

  return (
    <Card className="mb-8 overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in rounded-3xl">
      <div 
        className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <FileText className="h-5 w-5 text-[#DFBD69] dark:text-[#DFBD69] mr-2" />
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Your Data ({documents.length})</h3>
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
        <div className="divide-y divide-gray-200 dark:divide-gray-800 max-h-[500px] overflow-y-auto">
          {documents.map(doc => (
            <div key={doc.id} className="transition-all duration-200">
              {/* Document header/summary row */}
              <div 
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-850 transition-colors duration-200 cursor-pointer"
                onClick={() => toggleDocumentExpansion(doc.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg mr-3">
                      <File className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200 line-clamp-1">{doc.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDateTime(doc.uploadedAt)} • {(doc.size / 1024).toFixed(1)} KB
                        {doc.chunks && ` • ${doc.chunks.length} chunks`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDocumentExpansion(doc.id);
                      }}
                      variant="ghost"
                      size="icon"
                      className="text-gray-500 dark:text-gray-400 rounded-full h-8 w-8 mr-1"
                    >
                      {expandedDocId === doc.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(doc.id, doc.name);
                      }}
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-full h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Expanded document details */}
              {expandedDocId === doc.id && (
                <div className="bg-gray-50/50 dark:bg-gray-900/50 p-4 border-t border-gray-200 dark:border-gray-800 animate-fade-in">
                  {/* Document summary section */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <FileText className="h-4 w-4 mr-1.5 text-[#DFBD69] dark:text-[#DFBD69]" />
                      Document Summary
                    </h4>
                    
                    {doc.isProcessingSummary ? (
                      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 italic">
                        <MessageLoader size="sm" color="secondary" />
                        <span>Generating summary...</span>
                      </div>
                    ) : doc.summary ? (
                      <div className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                        <span>Crude Oil API from finance.yahoo.com</span>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                        No summary available.
                      </div>
                    )}
                  </div>
                  
                  {/* Document preview section */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <FileText className="h-4 w-4 mr-1.5 text-[#DFBD69] dark:text-[#DFBD69]" />
                      Preview
                    </h4>
                    
                    {doc.preview ? (
                      <div className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                        {doc.preview}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                        No preview available.
                      </div>
                    )}
                  </div>
                </div>
              )}
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
  const [showOptions, setShowOptions] = useState(false);
  const [queryOptions, setQueryOptions] = useState({
    includeSummaries: true,
    focusRecentDocuments: true,
    includeChartAnalysis: true,
    detailedSources: true,
    creativity: 0.7 // Default temperature value
  });
  const { toast } = useToast();
  
  // Example queries for oil data analysis
  const exampleQueries = [
    "What's the current trend for WTI crude oil prices?",
    "Compare the highest and lowest oil prices this month",
    "When was the most significant price drop?",
    "Predict oil price direction for the next week",
    "How does current volume compare to average?"
  ];
  
  const handleExampleQuery = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim() || isQuerying) return;
    setError(null);
    
    try {
      // Create a temporary user-facing message with the query
      const tempResult: QueryResult = {
        answer: 'Analyzing oil data...',
        query: query,
        sources: []
      };
      
      // Pass the temporary result to show searching status
      onQueryResult(tempResult);
      
      // Use our new specialized function that directly uses Oildata-current.txt
      const result = await queryOilData(query);
      
      // Pass result to parent component
      onQueryResult(result);
      
      // Clear the query input
      setQuery('');
      
    } catch (error) {
      console.error('Error querying oil data:', error);
      setError('Failed to process your query. Please try again.');
      
      toast({
        title: "Query failed",
        description: "Could not process your question. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card className="mb-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in rounded-3xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Search className="h-5 w-5 text-[#DFBD69] dark:text-[#DFBD69] mr-2" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Analyze Data</h3>
          </div>
          <Popover open={showOptions} onOpenChange={setShowOptions}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 text-[#DFBD69] dark:text-[#DFBD69] border-[#DFBD69] hover:bg-[#DFBD69]/10"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Options</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <h4 className="font-medium text-sm border-b pb-2 mb-2">Analysis Options</h4>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeSummaries" 
                      checked={queryOptions.includeSummaries}
                      onCheckedChange={(checked) => 
                        setQueryOptions(prev => ({ ...prev, includeSummaries: checked === true }))
                      }
                    />
                    <Label htmlFor="includeSummaries" className="text-sm">Include data summaries</Label>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="focusRecent" 
                      checked={queryOptions.focusRecentDocuments}
                      onCheckedChange={(checked) => 
                        setQueryOptions(prev => ({ ...prev, focusRecentDocuments: checked === true }))
                      }
                    />
                    <Label htmlFor="focusRecent" className="text-sm">Focus on most recent data</Label>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeChartAnalysis" 
                      checked={queryOptions.includeChartAnalysis}
                      onCheckedChange={(checked) => 
                        setQueryOptions(prev => ({ ...prev, includeChartAnalysis: checked === true }))
                      }
                    />
                    <Label htmlFor="includeChartAnalysis" className="text-sm">Include trend analysis</Label>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="detailedSources" 
                      checked={queryOptions.detailedSources}
                      onCheckedChange={(checked) => 
                        setQueryOptions(prev => ({ ...prev, detailedSources: checked === true }))
                      }
                    />
                    <Label htmlFor="detailedSources" className="text-sm">Show detailed data sources</Label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="creativity" className="text-sm">Analysis depth</Label>
                    <span className="text-xs text-gray-500">
                      {queryOptions.creativity < 0.4 ? 'Basic' : 
                       queryOptions.creativity < 0.7 ? 'Standard' : 'Advanced'}
                    </span>
                  </div>
                  <input 
                    id="creativity"
                    type="range" 
                    min="0.1" 
                    max="1.0" 
                    step="0.1" 
                    value={queryOptions.creativity}
                    onChange={(e) => 
                      setQueryOptions(prev => ({ ...prev, creativity: parseFloat(e.target.value) }))
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Example queries */}
        <div className="mb-4 flex flex-wrap gap-2">
          {exampleQueries.map((exampleQuery, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleExampleQuery(exampleQuery)}
              className="text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
            >
              {exampleQuery}
            </Button>
          ))}
        </div>
        
        <form onSubmit={handleSubmit} className="relative">
          <div className="chat-input-container relative bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type your message..."
              disabled={isQuerying}
              className="w-full px-6 py-4 bg-transparent border-none focus:outline-none focus:ring-0 
                text-gray-800 dark:text-gray-200 pr-14
                disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
            />
            <Button
              type="submit"
              disabled={!query.trim() || isQuerying}
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
        </form>
      </CardContent>
    </Card>
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
                <p className="text-gray-600 dark:text-gray-300">Analyzing oil data and generating response...</p>
              </div>
            </div>
          </Card>
        )}

        {/* Display chat messages with newest first */}
        {reversedChatHistory.map((message) => {
          // Handle combined messages (new format)
          if (message.type === 'combined' && 'userQuery' in message && 'aiResponse' in message) {
            return (
              <Card 
                key={message.id}
                className="border border-gray-200 dark:border-gray-800 shadow-sm transition-all duration-300 rounded-3xl"
              >
                <div className="p-4">
                  {/* User question section with timestamp */}
                  <div className="flex items-start mb-4">
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
                        {message.userQuery}
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

                  {/* AI answer section */}
                  <div>
                    <div className="flex items-start mb-3">
                      <div className="bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] p-2 rounded-full mr-3 mt-0.5">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Answer:
                        </p>
                      </div>
                    </div>

                    <div className="prose dark:prose-invert max-w-none ml-9">
                      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed">
                        {message.aiResponse}
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
                </div>
              </Card>
            );
          }
          
          // Handle legacy format messages if any exist
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
                {/* User message with timestamp */}
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
                              className="text-sm bg-gray-50 dark:bg-gray-900 rounded-xl p-3 border border-gray-200 dark:border-gray-800"
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
const FullRAGManual = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <Card className="mb-8 overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in rounded-3xl">
      <div 
        className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <BookOpen className="h-5 w-5 text-[#DFBD69] dark:text-[#DFBD69] mr-2" />
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">How to Use Full-Automation RAG</h3>
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
                <strong>Load Oil Data</strong> - Click the "Load Oil Data" button to fetch the latest WTI crude oil price data from Yahoo Finance.
              </li>
              <li>
                <strong>Review Your Data</strong> - Once loaded, you can view your data in the "Documents" tab. Click on a document to expand and see more details.
              </li>
              <li>
                <strong>Ask Questions</strong> - Use the query interface to ask questions about oil price trends, patterns, and insights.
              </li>
              <li>
                <strong>Analyze Results</strong> - Review the AI-generated analysis in the "Chat" tab, including source information.
              </li>
            </ol>
            
            <h4 className="text-lg font-medium text-[#DFBD69] dark:text-[#DFBD69] mt-6">Features</h4>
            <ul className="space-y-2 mt-3">
              <li><strong>Real-time Data</strong> - Access up-to-date WTI crude oil price data from trusted financial sources.</li>
              <li><strong>Advanced Analysis</strong> - AI-powered analysis of price trends, market patterns, and potential forecasts.</li>
              <li><strong>Query Options</strong> - Customize your analysis with options for depth, focus on recent data, trend analysis, and more.</li>
              <li><strong>Data Export</strong> - Export your data and conversation history for reporting or further analysis.</li>
              <li><strong>Tabbed Interface</strong> - Switch between "Documents" and "Chat" tabs to focus on either your data or your analysis.</li>
            </ul>
            
            <h4 className="text-lg font-medium text-[#DFBD69] dark:text-[#DFBD69] mt-6">Example Questions</h4>
            <ul className="space-y-2 mt-3">
              <li>"What's the current trend for WTI crude oil prices?"</li>
              <li>"Compare the highest and lowest oil prices this month."</li>
              <li>"When was the most significant price drop?"</li>
              <li>"Predict oil price direction for the next week."</li>
              <li>"How does current volume compare to average?"</li>
            </ul>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl mt-6">
              <h4 className="text-md font-medium text-[#DFBD69] dark:text-[#DFBD69] mt-0 mb-2">Pro Tips</h4>
              <ul className="space-y-1 text-sm">
                <li>Use the "Options" button to customize your analysis depth and focus areas.</li>
                <li>Click on document entries to expand and view more details about your data.</li>
                <li>The "Export Data" button lets you save all your data and analyses as a text file.</li>
                <li>Click the example questions to quickly analyze common oil market patterns.</li>
                <li>Check the "Sources" section in responses to understand where specific data points came from.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// Main FullRAG Component
const FullRAG = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'documents' | 'chat'>('documents');
  const { toast } = useToast();
  
  // Load documents and chat history from localStorage on component mount
  useEffect(() => {
    try {
      // Load documents - using a different key than TBIRAG to maintain separate storage
      const savedDocs = localStorage.getItem('fullRagDocuments');
      if (savedDocs) {
        const parsedDocs = JSON.parse(savedDocs);
        // Convert string dates back to Date objects
        const processedDocs = parsedDocs.map((doc: any) => ({
          ...doc,
          uploadedAt: new Date(doc.uploadedAt),
          lastAccessed: doc.lastAccessed ? new Date(doc.lastAccessed) : undefined
        }));
        setDocuments(processedDocs);
      }
      
      // Load chat history - using a different key than TBIRAG
      const savedChat = localStorage.getItem('fullRagChatHistory');
      if (savedChat) {
        const parsedChat = JSON.parse(savedChat);
        // Convert string dates back to Date objects
        const processedChat = parsedChat.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setChatHistory(processedChat);
      }
    } catch (e) {
      console.error('Failed to load saved data:', e);
      toast({
        title: "Error loading data",
        description: "Could not load your saved documents or chat history.",
        variant: "destructive",
      });
    }
  }, [toast]);
  
  // Save documents and chat history to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('fullRagDocuments', JSON.stringify(documents));
    } catch (e) {
      console.error('Failed to save documents:', e);
      toast({
        title: "Error saving documents",
        description: "Your document changes couldn't be saved locally.",
        variant: "destructive",
      });
    }
  }, [documents]);
  
  useEffect(() => {
    try {
      localStorage.setItem('fullRagChatHistory', JSON.stringify(chatHistory));
    } catch (e) {
      console.error('Failed to save chat history:', e);
    }
  }, [chatHistory]);
  
  // Handle adding a new document
  const handleDocumentProcessed = (newDocument: Document) => {
    // Check if this is an update to an existing document (for adding summary)
    const existingDocIndex = documents.findIndex(doc => doc.id === newDocument.id);
    
    if (existingDocIndex >= 0) {
      setDocuments(prevDocs => prevDocs.map((doc, idx) => 
        idx === existingDocIndex ? { ...doc, ...newDocument } : doc
      ));
      
      // If the summary was just added, show a toast notification
      if (newDocument.summary && !newDocument.isProcessingSummary && !documents[existingDocIndex].summary) {
        toast({
          title: "Document summary ready",
          description: `Summary for "${newDocument.name}" has been generated`,
        });
      }
    } else {
      // Add new document
      setDocuments(prevDocs => [newDocument, ...prevDocs]);
      
      // Show success toast
      toast({
        title: "Document added",
        description: `"${newDocument.name}" has been added to your library`,
      });
    }
  };
  
  // Handle removing a document
  const handleRemoveDocument = (id: string) => {
    setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== id));
  };
  
  // Handle query results
  const handleQueryResult = async (result: QueryResult) => {
    // If this is a "searching" placeholder, just set the querying state
    if (result.answer === 'Analyzing oil data...' || result.answer === 'Searching documents...') {
      setIsQuerying(true);
      return;
    }
    
    // Only for real results with answers, create a single combined message
    if (result.query) {
      // Create a single message that contains both the user query and AI response
      const combinedMessage: ChatMessage = {
        id: uuidv4(),
        type: 'combined',
        userQuery: result.query,
        aiResponse: result.answer,
        timestamp: new Date(),
        sources: result.sources
      };
      
      // Add the combined message to chat history
      setChatHistory(prev => [...prev, combinedMessage]);
      
      // Mark any documents that were used as sources as accessed now
      const sourceDocIds = new Set(result.sources.map(source => source.documentId));
      setDocuments(prevDocs => prevDocs.map(doc => 
        sourceDocIds.has(doc.id) ? { ...doc, lastAccessed: new Date() } : doc
      ));
      
      // Switch to chat tab to show the result
      setSelectedTab('chat');
    }
    
    setIsQuerying(false);
  };
  
  // Clear chat history
  const handleClearChat = () => {
    setChatHistory([]);
  };
  
  // Export documents and chat history to .txt format
  const handleExportData = () => {
    try {
      // Create a formatted text representation of the data
      let textContent = "=== FULL RAG EXPORT ===\n";
      textContent += `Generated: ${new Date().toLocaleString()}\n\n`;
      
      // Format documents section
      textContent += "=== DOCUMENTS ===\n";
      if (documents.length > 0) {
        documents.forEach((doc, index) => {
          textContent += `Document #${index + 1}: ${doc.name}\n`;
          textContent += `Uploaded: ${doc.uploadedAt.toLocaleString()}\n`;
          textContent += `Size: ${(doc.size / 1024).toFixed(1)} KB\n`;
          if (doc.summary) {
            textContent += `Summary: ${doc.summary}\n`;
          }
          if (doc.preview) {
            textContent += `Preview: \n${doc.preview}\n`;
          }
          textContent += "\n";
        });
      } else {
        textContent += "No documents available.\n\n";
      }
      
      // Format chat history section
      textContent += "=== CONVERSATION HISTORY ===\n";
      if (chatHistory.length > 0) {
        chatHistory.forEach((message, index) => {
          textContent += `--- Message #${index + 1} (${message.timestamp.toLocaleString()}) ---\n`;
          
          if (message.type === 'combined' && 'userQuery' in message) {
            textContent += `Question: ${message.userQuery}\n\n`;
            textContent += `Answer: ${message.aiResponse}\n\n`;
            
            // Include sources if available
            if (message.sources && message.sources.length > 0) {
              textContent += "Sources:\n";
              message.sources.forEach((source, i) => {
                textContent += `- ${source.documentName}\n`;
                if (source.excerpt) {
                  textContent += `  "${source.excerpt}"\n`;
                }
              });
              textContent += "\n";
            }
          } else if (message.type === 'user') {
            textContent += `User: ${message.content}\n\n`;
          } else {
            textContent += `AI: ${message.content}\n\n`;
            
            // Include sources if available
            if (message.sources && message.sources.length > 0) {
              textContent += "Sources:\n";
              message.sources.forEach((source, i) => {
                textContent += `- ${source.documentName}\n`;
                if (source.excerpt) {
                  textContent += `  "${source.excerpt}"\n`;
                }
              });
              textContent += "\n";
            }
          }
        });
      } else {
        textContent += "No conversation history available.\n";
      }
      
      // Create a Blob with the text content
      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
      
      // Create a download link
      const exportFileDefaultName = `full-rag-export-${new Date().toISOString().split('T')[0]}.txt`;
      
      // Create URL for the blob and trigger download
      const url = URL.createObjectURL(blob);
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', url);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      // Clean up by revoking the URL
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      toast({
        title: "Export successful",
        description: "Your documents and chat history have been exported as text file",
      });
    } catch (e) {
      console.error('Failed to export data:', e);
      toast({
        title: "Export failed",
        description: "Could not export your data. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] bg-clip-text text-transparent">Full-Automation RAG</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          Analyze real-time WTI crude oil market data using AI-powered insights. Ask questions about trends, prices, and market conditions.
        </p>
      </div>
      
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex justify-between items-center">
          <div className="flex space-x-1 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <Button
              variant={selectedTab === 'documents' ? 'default' : 'ghost'}
              className={`rounded-none px-4 py-2 ${
                selectedTab === 'documents' 
                  ? 'bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] text-white' 
                  : 'text-[#DFBD69] dark:text-[#DFBD69] hover:bg-[#DFBD69]/10'
              }`}
              onClick={() => setSelectedTab('documents')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Documents ({documents.length})
            </Button>
            <Button
              variant={selectedTab === 'chat' ? 'default' : 'ghost'}
              className={`rounded-none px-4 py-2 ${
                selectedTab === 'chat' 
                  ? 'bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] text-white' 
                  : 'text-[#DFBD69] dark:text-[#DFBD69] hover:bg-[#DFBD69]/10'
              }`}
              onClick={() => setSelectedTab('chat')}
            >
              <Search className="h-4 w-4 mr-2" />
              Chat
              {chatHistory.length > 0 && ` (${chatHistory.length})`}
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            {chatHistory.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearChat}
                className="text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:text-red-500 dark:hover:text-red-500 hover:border-red-500 hover:bg-red-50 dark:hover:border-red-500 dark:hover:bg-red-900/10"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Clear Chat
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportData}
              className="text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:text-[#DFBD69] hover:border-[#DFBD69] hover:bg-[#DFBD69]/10 dark:hover:text-[#DFBD69] dark:hover:border-[#DFBD69] dark:hover:bg-[#DFBD69]/10"
              disabled={documents.length === 0 && chatHistory.length === 0}
            >
              <BookOpen className="h-4 w-4 mr-1.5" />
              Export Data
            </Button>
          </div>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto">
        {selectedTab === 'documents' && (
          <>
            <OilDataFetcher onDataFetched={handleDocumentProcessed} />
            <DocumentList documents={documents} onRemoveDocument={handleRemoveDocument} />
          </>
        )}
        
        <QueryInterface 
          documents={documents} 
          onQueryResult={handleQueryResult} 
          isQuerying={isQuerying}
        />
        
        {selectedTab === 'chat' && (
          <ChatHistoryDisplay 
            chatHistory={chatHistory} 
            isQuerying={isQuerying} 
            onClear={handleClearChat}
          />
        )}
        
        <FullRAGManual />
      </div>
    </div>
  );
};

export default FullRAG;
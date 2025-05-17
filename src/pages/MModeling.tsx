import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FileUploadZone from '@/components/ui/FileUploadZone';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ArrowUpDown, 
  BarChart3, 
  Database, 
  FileType, 
  Share2, 
  LayoutDashboard, 
  PlusCircle, 
  Workflow, 
  Download,
  RefreshCw,
  Settings2,
  Server,
  BookOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SchemaVisualizer } from '@/components/modeling/SchemaVisualizer';
import { DataProfiler } from '@/components/modeling/DataProfiler';
import { GraphVisualizer } from '@/components/modeling/GraphVisualizer';
import { DatasetList } from '@/components/modeling/DatasetList';
import { fetchDatasets, importDataset, Dataset } from '@/utils/dataModelingService';

const MModeling = () => {
  const [activeTab, setActiveTab] = useState<string>('datasets');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [datasetsTab, setDatasetsTab] = useState<string>('datasets');
  const [activeVisualization, setActiveVisualization] = useState<string>('schema');
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState<boolean>(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const { toast } = useToast();

  // Neo4j connection config
  const [neo4jConfig, setNeo4jConfig] = useState({
    uri: "neo4j://localhost:7687",
    user: "neo4j",
    password: "password"
  });

  // Fetch datasets on component mount
  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      const data = await fetchDatasets();
      setDatasets(data);
    } catch (error) {
      console.error("Failed to load datasets:", error);
      toast({
        title: "Error loading datasets",
        description: "Could not fetch datasets from the server. Please try again later.",
        variant: "destructive"
      });
    }
  };

  const handleFilesDrop = (files: File[]) => {
    setUploadedFiles(files);
  };

  const handleDatasetSelection = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    
    // Switch to data visualization panel
    setActiveVisualization('schema');
  };

  const handleDatasetDeleted = (id: string) => {
    setDatasets(datasets.filter(dataset => dataset.id !== id));
    
    // If the deleted dataset was selected, clear selection
    if (selectedDataset && selectedDataset.id === id) {
      setSelectedDataset(null);
    }
  };

  const processFiles = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to upload first.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Process each file
      const newDatasets = [];
      
      for (const file of uploadedFiles) {
        const dataset = await importDataset(file);
        newDatasets.push(dataset);
      }
      
      // Add to datasets list
      setDatasets([...datasets, ...newDatasets]);
      setUploadedFiles([]);
      
      toast({
        title: "Files processed successfully",
        description: "Your data is now available for modeling.",
      });
      
      // Switch back to datasets tab
      setDatasetsTab('datasets');
    } catch (error) {
      console.error("Error processing files:", error);
      toast({
        title: "Processing failed",
        description: "There was an error processing your files. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] inline-block">
            Data Modeling Studio
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Import, visualize, and model structured data with automated schema discovery and graph relationships
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            className="rounded-xl shadow-md hover:shadow-lg transition-all bg-[#1A202C] hover:bg-opacity-90"
            onClick={loadDatasets}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
          <Button className="rounded-xl shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] hover:opacity-90">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Model
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel - Data Sources */}
        <div className="lg:col-span-1">
          <Card className="rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden h-full">
            <CardHeader className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-gray-900/40 dark:to-gray-800/40 backdrop-blur-sm">
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2 text-[#DFBD69]" />
                Data Sources
              </CardTitle>
              <CardDescription>
                Import and manage your datasets
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <Tabs value={datasetsTab} onValueChange={setDatasetsTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4 rounded-xl">
                  <TabsTrigger value="datasets" className="rounded-lg">Datasets</TabsTrigger>
                  <TabsTrigger value="import" className="rounded-lg">Import</TabsTrigger>
                </TabsList>
                
                <TabsContent value="datasets" className="mt-0">
                  <DatasetList 
                    datasets={datasets}
                    onDatasetSelect={handleDatasetSelection}
                    onDatasetDelete={handleDatasetDeleted}
                    refreshDatasets={loadDatasets}
                  />
                </TabsContent>
                
                <TabsContent value="import" className="mt-0 space-y-4">
                  <FileUploadZone 
                    acceptedFileTypes={{
                      'text/csv': ['.csv'],
                      'application/json': ['.json'],
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                    }}
                    onFilesDrop={handleFilesDrop}
                    maxFiles={5}
                    maxSize={10 * 1024 * 1024} // 10MB
                  />
                  
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium mb-2">Files ready for import:</h3>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-sm">
                            <div className="flex items-center">
                              <FileType className="h-4 w-4 text-[#DFBD69] mr-2" />
                              <span className="truncate max-w-[180px]">{file.name}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      <Button 
                        className="w-full mt-4 rounded-lg"
                        disabled={isProcessing}
                        onClick={processFiles}
                      >
                        {isProcessing ? (
                          <>
                            <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-r-transparent rounded-full"></div>
                            Processing...
                          </>
                        ) : (
                          <>Process Files</>
                        )}
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Right panel - Data Visualization */}
        <div className="lg:col-span-2">
          <Card className="rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-gray-900/40 dark:to-gray-800/40 backdrop-blur-sm">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <LayoutDashboard className="h-5 w-5 mr-2 text-[#DFBD69]" />
                  Data Visualization
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-lg">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analyze
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-lg">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    Sort
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-lg">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
              <CardDescription>
                Explore your data through various visualizations
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-6">
              <Tabs 
                defaultValue="schema" 
                value={activeVisualization} 
                onValueChange={setActiveVisualization} 
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3 mb-6 rounded-xl">
                  <TabsTrigger value="schema" className="rounded-lg">
                    <Database className="h-4 w-4 mr-2" />
                    Schema
                  </TabsTrigger>
                  <TabsTrigger value="profiling" className="rounded-lg">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Data Profiling
                  </TabsTrigger>
                  <TabsTrigger value="graph" className="rounded-lg">
                    <Share2 className="h-4 w-4 mr-2" />
                    Graph View
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="schema" className="mt-0">
                  <SchemaVisualizer datasetId={selectedDataset?.id} />
                </TabsContent>
                
                <TabsContent value="profiling" className="mt-0">
                  <DataProfiler datasetId={selectedDataset?.id} />
                </TabsContent>
                
                <TabsContent value="graph" className="mt-0">
                  <GraphVisualizer />
                </TabsContent>
              </Tabs>
            </CardContent>
            
            <CardFooter className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-900/30 dark:to-gray-800/30 border-t border-gray-100 dark:border-gray-800 py-3 px-6">
              <div className="flex justify-between items-center w-full">
                <div className="text-sm text-gray-500 flex items-center">
                  {selectedDataset ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Showing visualization for <span className="font-medium ml-1">{selectedDataset.name}</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                      No dataset selected. Select a dataset from the left panel.
                    </>
                  )}
                </div>
                <Button variant="outline" size="sm" className="rounded-lg">
                  <Workflow className="h-4 w-4 mr-2" />
                  Export Model
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Advanced Configuration */}
      <Collapsible 
        className="w-full mt-8"
        open={isAdvancedExpanded}
      >
        <Card>
          <div 
            className="flex items-center justify-between p-6 cursor-pointer"
            onClick={() => {
              setIsAdvancedExpanded(!isAdvancedExpanded);
            }}
          >
            <div className="flex items-center">
              <Settings2 className="h-5 w-5 mr-3 text-[#DFBD69]" />
              <h2 className="text-xl font-medium">Advanced Configuration</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsAdvancedExpanded(!isAdvancedExpanded);
              }}
            >
              {isAdvancedExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              )}
            </Button>
          </div>
          
          <CollapsibleContent>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div className="flex items-center mb-4">
                  <Server className="h-5 w-5 mr-2 text-[#DFBD69]" />
                  <h3 className="font-medium">Neo4j Configuration</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Configure connection to your Neo4j database for graph modeling
                </p>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="w-24 text-sm">URI:</span>
                    <input 
                      type="text" 
                      value={neo4jConfig.uri} 
                      onChange={(e) => setNeo4jConfig({...neo4jConfig, uri: e.target.value})}
                      className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded flex-1" 
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="w-24 text-sm">Username:</span>
                    <input 
                      type="text" 
                      value={neo4jConfig.user} 
                      onChange={(e) => setNeo4jConfig({...neo4jConfig, user: e.target.value})}
                      className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded flex-1" 
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="w-24 text-sm">Password:</span>
                    <input 
                      type="password" 
                      value={neo4jConfig.password} 
                      onChange={(e) => setNeo4jConfig({...neo4jConfig, password: e.target.value})}
                      className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded flex-1" 
                    />
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <Button variant="outline" size="sm" className="rounded-lg">
                      Test Connection
                    </Button>
                    <span className="text-sm text-green-500 flex items-center">
                      <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                      Ready to connect
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div className="flex items-center mb-4">
                  <Database className="h-5 w-5 mr-2 text-[#DFBD69]" />
                  <h3 className="font-medium">Great Expectations Suite</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Data validation rules for schema enforcement
                </p>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="w-32 text-sm">Validation Mode:</span>
                    <select className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded flex-1">
                      <option>Warning</option>
                      <option>Error</option>
                      <option>Disabled</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <span className="w-32 text-sm">Profile Path:</span>
                    <span className="text-sm font-mono truncate bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded flex-1">
                      ./expectations/ptt_data.json
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-32 text-sm">Last Run:</span>
                    <span className="text-sm">2023-04-18 11:32 AM</span>
                  </div>
                  <div className="mt-3">
                    <Button variant="outline" size="sm" className="rounded-lg w-full">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Validate Dataset
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Usage Manual at the bottom of the page */}
      <div className="mt-8">
        <ModelingUsageManual />
      </div>
    </div>
  );
};

// Usage Manual Component
const ModelingUsageManual = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <Card className="mb-8 overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in rounded-3xl">
      <div 
        className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <BookOpen className="h-5 w-5 text-[#DFBD69] dark:text-[#DFBD69] mr-2" />
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">How to Use Data Modeling Studio</h3>
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
                <strong>Import Data</strong> - Click on the "Import" tab in the Data Sources panel and upload your datasets (CSV, JSON, XLSX, PDF, TXT).
              </li>
              <li>
                <strong>Process Files</strong> - After uploading, click "Process Files" to analyze and prepare your data for modeling.
              </li>
              <li>
                <strong>Explore Visualizations</strong> - Use the three visualization tabs (Schema, Data Profiling, Graph View) to analyze your data.
              </li>
            </ol>
            
            <h4 className="text-lg font-medium text-[#DFBD69] dark:text-[#DFBD69] mt-6">Key Features</h4>
            <ul className="space-y-2 mt-3">
              <li><strong>Schema Visualization</strong> - View the structure and relationships between your data tables.</li>
              <li><strong>Data Profiling</strong> - See statistical summaries, distributions, and quality metrics of your datasets.</li>
              <li><strong>Graph View</strong> - Explore connections between data points in an interactive network visualization.</li>
              <li><strong>Neo4j Integration</strong> - Connect to Neo4j database for advanced graph modeling.</li>
              <li><strong>Validation Rules</strong> - Apply Great Expectations data validation rules to ensure data quality.</li>
            </ul>
            
            <h4 className="text-lg font-medium text-[#DFBD69] dark:text-[#DFBD69] mt-6">Advanced Configuration</h4>
            <ul className="space-y-2 mt-3">
              <li>Click the Advanced Configuration panel to configure Neo4j connection settings.</li>
              <li>Set up validation rules for your data using Great Expectations.</li>
              <li>Export your model for use in other systems or for sharing with colleagues.</li>
              <li>Use the panel to connect to external databases or data sources.</li>
            </ul>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl mt-6">
              <h4 className="text-md font-medium text-[#DFBD69] dark:text-[#DFBD69] mt-0 mb-2">Pro Tips</h4>
              <ul className="space-y-1 text-sm">
                <li>Process multiple related datasets at once to automatically discover relationships between them.</li>
                <li>Use the Graph View to identify hidden patterns and connections in your data.</li>
                <li>Export visualizations for reports or presentations using the Export button.</li>
                <li>Save your modeling configurations for reuse with similar datasets.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default MModeling;

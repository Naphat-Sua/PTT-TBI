
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
  Server
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SchemaVisualizer } from '@/components/modeling/SchemaVisualizer';
import { DataProfiler } from '@/components/modeling/DataProfiler';
import { GraphVisualizer } from '@/components/modeling/GraphVisualizer';
import { DatasetList } from '@/components/modeling/DatasetList';
import { getNeo4jService, Neo4jConfig } from '@/utils/neo4jService';

const MModeling = () => {
  const [activeTab, setActiveTab] = useState<string>('datasets');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [datasetsTab, setDatasetsTab] = useState<string>('datasets');
  const [activeVisualization, setActiveVisualization] = useState<string>('schema');
  const [datasets, setDatasets] = useState<any[]>([
    { id: 1, name: 'Production Data 2023', size: '120MB', date: '2023-12-01', type: 'CSV' },
    { id: 2, name: 'Asset Registry', size: '45MB', date: '2024-01-15', type: 'JSON' },
    { id: 3, name: 'Maintenance Records', size: '78MB', date: '2024-02-20', type: 'XLSX' },
  ]);
  const { toast } = useToast();

  const [neo4jConfig, setNeo4jConfig] = useState<Neo4jConfig>({
    uri: "neo4j://localhost:7687",
    user: "neo4j",
    password: "password",
    database: "neo4j"
  });

  const handleFileUpload = (files: File[]) => {
    setUploadedFiles([...uploadedFiles, ...files]);
    toast({
      title: "Files ready for processing",
      description: `${files.length} file(s) added to the queue.`,
    });
  };

  const processFiles = () => {
    setIsProcessing(true);
    
    // Simulating processing delay
    setTimeout(() => {
      // Add processed files to datasets
      const newDatasets = uploadedFiles.map((file, index) => ({
        id: datasets.length + index + 1,
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
        date: new Date().toISOString().split('T')[0],
        type: file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN'
      }));
      
      setDatasets([...datasets, ...newDatasets]);
      setUploadedFiles([]);
      setIsProcessing(false);
      
      toast({
        title: "Files processed successfully",
        description: "Your data is now available for modeling.",
      });

      // Switch back to datasets tab after processing
      setDatasetsTab('datasets');
    }, 2000);
  };

  // Initialize Neo4j service
  useEffect(() => {
    try {
      const neo4jService = getNeo4jService(neo4jConfig);
      console.log("Neo4j service initialized");
    } catch (error) {
      console.error("Failed to initialize Neo4j service:", error);
    }
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#FFD700] to-[#FF8C00] inline-block">
            Data Modeling Studio
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Import, visualize, and model structured data with automated schema discovery and graph relationships
          </p>
        </div>
        <div className="flex gap-3">
          <Button className="rounded-xl shadow-md hover:shadow-lg transition-all bg-[#1A202C] hover:bg-opacity-90">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
          <Button className="rounded-xl shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-[#FFD700] to-[#FF8C00] hover:opacity-90">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Model
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden h-full">
            <CardHeader className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-gray-900/40 dark:to-gray-800/40 backdrop-blur-sm">
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2 text-[#FFD700]" />
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
                  <DatasetList datasets={datasets} />
                </TabsContent>
                
                <TabsContent value="import" className="mt-0 space-y-4">
                  <FileUploadZone 
                    acceptedFileTypes={{
                      'text/csv': ['.csv'],
                      'application/json': ['.json'],
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                      'application/pdf': ['.pdf'],
                      'image/jpeg': ['.jpg', '.jpeg'],
                      'image/png': ['.png'],
                      'text/plain': ['.txt'],
                    }}
                    onFilesAdded={handleFileUpload}
                    maxFiles={5}
                    icon="spreadsheet"
                    sublabel="Supported formats: CSV, JSON, XLSX, PDF, TXT, and images"
                  />
                  
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-4">
                      <h3 className="text-sm font-medium">Files ready for processing:</h3>
                      <ul className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <li key={index} className="text-sm flex items-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <FileType className="h-4 w-4 mr-2 text-gray-500" />
                            {file.name}
                            <span className="ml-auto text-xs text-gray-500">
                              {(file.size / (1024 * 1024)).toFixed(2)}MB
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Button 
                        onClick={processFiles} 
                        disabled={isProcessing} 
                        className="w-full rounded-xl shadow-md bg-gradient-to-r from-[#FFD700] to-[#FF8C00] hover:opacity-90"
                      >
                        {isProcessing ? (
                          <>
                            <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-r-transparent rounded-full"></div>
                            Processing...
                          </>
                        ) : (
                          'Process Files'
                        )}
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden h-full">
            <CardHeader className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-gray-900/40 dark:to-gray-800/40 backdrop-blur-sm">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <LayoutDashboard className="h-5 w-5 mr-2 text-[#FFD700]" />
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
                  <SchemaVisualizer />
                </TabsContent>
                
                <TabsContent value="profiling" className="mt-0">
                  <DataProfiler />
                </TabsContent>
                
                <TabsContent value="graph" className="mt-0">
                  <GraphVisualizer />
                </TabsContent>
              </Tabs>
            </CardContent>
            
            <CardFooter className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-900/30 dark:to-gray-800/30 border-t border-gray-100 dark:border-gray-800 py-3 px-6">
              <div className="flex justify-between items-center w-full">
                <div className="text-sm text-gray-500 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Showing visualization for <span className="font-medium ml-1">Production Data 2023</span>
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

      <Collapsible className="w-full mt-8">
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-t-2xl border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold flex items-center">
            <Settings2 className="h-5 w-5 mr-2 text-[#FFD700]" />
            Advanced Configuration
          </h2>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="rounded-xl">
              <PlusCircle className="h-4 w-4" />
              <span className="ml-2">Show Options</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent>
          <Card className="rounded-b-2xl shadow-lg border border-gray-200 dark:border-gray-800 border-t-0 overflow-hidden">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div className="flex items-center mb-4">
                  <Server className="h-5 w-5 mr-2 text-[#FFD700]" />
                  <h3 className="font-medium">Neo4j Configuration</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Configure connection to your Neo4j database for graph modeling
                </p>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="w-24 text-sm">Host:</span>
                    <input 
                      type="text" 
                      value={neo4jConfig.uri}
                      onChange={e => setNeo4jConfig({...neo4jConfig, uri: e.target.value})}
                      className="text-sm font-mono bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded flex-1"
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="w-24 text-sm">Username:</span>
                    <input 
                      type="text" 
                      value={neo4jConfig.user}
                      onChange={e => setNeo4jConfig({...neo4jConfig, user: e.target.value})}
                      className="text-sm font-mono bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded flex-1"
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="w-24 text-sm">Password:</span>
                    <input 
                      type="password" 
                      value={neo4jConfig.password}
                      onChange={e => setNeo4jConfig({...neo4jConfig, password: e.target.value})}
                      className="text-sm font-mono bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded flex-1"
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="w-24 text-sm">Database:</span>
                    <input 
                      type="text" 
                      value={neo4jConfig.database}
                      onChange={e => setNeo4jConfig({...neo4jConfig, database: e.target.value})}
                      className="text-sm font-mono bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded flex-1"
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="w-24 text-sm">Status:</span>
                    <span className="text-sm text-green-500 flex items-center">
                      <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                      Ready to connect
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div className="flex items-center mb-4">
                  <Database className="h-5 w-5 mr-2 text-[#FFD700]" />
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
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default MModeling;

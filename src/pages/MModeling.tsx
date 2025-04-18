
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowUpDown, BarChart3, Database, FileType, Graph, LayoutDashboard, PlusCircle, Workflow } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SchemaVisualizer } from '@/components/modeling/SchemaVisualizer';
import { DataProfiler } from '@/components/modeling/DataProfiler';
import { GraphVisualizer } from '@/components/modeling/GraphVisualizer';
import { DatasetList } from '@/components/modeling/DatasetList';

const MModeling = () => {
  const [activeTab, setActiveTab] = useState<string>('datasets');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [datasets, setDatasets] = useState<any[]>([
    { id: 1, name: 'Production Data 2023', size: '120MB', date: '2023-12-01', type: 'CSV' },
    { id: 2, name: 'Asset Registry', size: '45MB', date: '2024-01-15', type: 'JSON' },
    { id: 3, name: 'Maintenance Records', size: '78MB', date: '2024-02-20', type: 'XLSX' },
  ]);
  const { toast } = useToast();

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
    }, 2000);
  };

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
        <Button className="rounded-xl shadow-md hover:shadow-lg transition-all">
          <PlusCircle className="mr-2 h-4 w-4" />
          New Model
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden h-full">
            <CardHeader className="bg-gray-50/80 dark:bg-gray-900/40 backdrop-blur-sm">
              <CardTitle>Data Sources</CardTitle>
              <CardDescription>
                Import and manage your datasets
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                    }}
                    onFilesAdded={handleFileUpload}
                    maxFiles={5}
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
                        className="w-full rounded-xl shadow-md"
                      >
                        {isProcessing ? 'Processing...' : 'Process Files'}
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
            <CardHeader className="bg-gray-50/80 dark:bg-gray-900/40 backdrop-blur-sm">
              <div className="flex justify-between items-center">
                <CardTitle>Data Visualization</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-lg">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analyze
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-lg">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    Sort
                  </Button>
                </div>
              </div>
              <CardDescription>
                Explore your data through various visualizations
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-6">
              <Tabs defaultValue="schema" className="w-full">
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
                    <Graph className="h-4 w-4 mr-2" />
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
            
            <CardFooter className="bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-800 py-3 px-6">
              <div className="flex justify-between items-center w-full">
                <div className="text-sm text-gray-500">
                  Showing visualization for <span className="font-medium">Production Data 2023</span>
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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Advanced Configuration</h2>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="rounded-xl">
              <PlusCircle className="h-4 w-4" />
              <span className="ml-2">Show Options</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent className="mt-4">
          <Card className="rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Neo4j Configuration</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Configure connection to your Neo4j database for graph modeling
                </p>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="w-24 text-sm">Host:</span>
                    <span className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      localhost:7687
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-24 text-sm">Username:</span>
                    <span className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      neo4j
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-24 text-sm">Status:</span>
                    <span className="text-sm text-green-500 flex items-center">
                      <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                      Connected
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Great Expectations Suite</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Data validation rules for schema enforcement
                </p>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="w-32 text-sm">Validation Mode:</span>
                    <span className="text-sm">Warning</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-32 text-sm">Profile Path:</span>
                    <span className="text-sm font-mono truncate bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      ./expectations/ptt_data.json
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-32 text-sm">Last Run:</span>
                    <span className="text-sm">2023-04-18 11:32 AM</span>
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

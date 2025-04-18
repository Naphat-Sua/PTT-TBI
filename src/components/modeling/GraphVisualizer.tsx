
import React, { useEffect, useState, useRef } from 'react';
import { Database, Share2, ZoomIn, ZoomOut, Maximize2, Box, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ForceGraph2D from 'react-force-graph-2d';
import { useToast } from '@/hooks/use-toast';

// Type definitions for our graph data
type GraphNode = {
  id: string;
  name: string;
  val: number;
  color?: string;
  group?: string;
};

type GraphLink = {
  source: string;
  target: string;
  type?: string;
  value?: number;
};

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

export const GraphVisualizer = () => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const graphRef = useRef<any>(null);
  const { toast } = useToast();

  // Neo4j connection parameters
  const [neo4jConfig, setNeo4jConfig] = useState({
    uri: "neo4j://localhost:7687",
    user: "neo4j",
    password: "password"
  });

  // Sample data for demonstration
  const sampleGraphData: GraphData = {
    nodes: [
      { id: 'production', name: 'Production', val: 25, color: '#FFD700', group: 'entity' },
      { id: 'location', name: 'Location', val: 20, color: '#1A202C', group: 'entity' },
      { id: 'equipment', name: 'Equipment', val: 15, color: '#4299E1', group: 'entity' },
      { id: 'maintenance', name: 'Maintenance', val: 15, color: '#48BB78', group: 'entity' },
      { id: 'sensor1', name: 'Temperature Sensor', val: 10, color: '#F56565', group: 'sensor' },
      { id: 'sensor2', name: 'Pressure Sensor', val: 10, color: '#F56565', group: 'sensor' },
      { id: 'sensor3', name: 'Flow Rate Sensor', val: 10, color: '#F56565', group: 'sensor' },
      { id: 'platform1', name: 'Platform Alpha', val: 20, color: '#805AD5', group: 'location' },
      { id: 'platform2', name: 'Platform Beta', val: 20, color: '#805AD5', group: 'location' },
    ],
    links: [
      { source: 'production', target: 'location', type: 'LOCATED_AT' },
      { source: 'production', target: 'equipment', type: 'USES' },
      { source: 'equipment', target: 'maintenance', type: 'REQUIRES' },
      { source: 'sensor1', target: 'equipment', type: 'MONITORS' },
      { source: 'sensor2', target: 'equipment', type: 'MONITORS' },
      { source: 'sensor3', target: 'equipment', type: 'MONITORS' },
      { source: 'platform1', target: 'location', type: 'IS_TYPE_OF' },
      { source: 'platform2', target: 'location', type: 'IS_TYPE_OF' },
    ]
  };

  // Connect to Neo4j (simulated)
  const connectToNeo4j = () => {
    setIsLoading(true);
    
    // Simulate connection delay
    setTimeout(() => {
      setIsConnected(true);
      setGraphData(sampleGraphData);
      setIsLoading(false);
      
      toast({
        title: "Connected to Neo4j database",
        description: "Successfully connected to graph database and loaded entity relationships.",
      });
    }, 1500);
  };

  // Handle zoom functionality
  const handleZoomIn = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom * 1.5, 400); // 400ms transition
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom / 1.5, 400); // 400ms transition
    }
  };

  const handleCenterGraph = () => {
    if (graphRef.current) {
      graphRef.current.centerAt(0, 0, 1000);
      graphRef.current.zoom(1, 800);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg p-6">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Graph Database Visualization</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Neo4j entity relationships for Production Data 2023
          </p>
        </div>
        
        {isConnected && (
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl"
              onClick={handleZoomIn}
            >
              <ZoomIn className="h-4 w-4 mr-1" />
              Zoom In
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl"
              onClick={handleZoomOut}
            >
              <ZoomOut className="h-4 w-4 mr-1" />
              Zoom Out
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl"
              onClick={handleCenterGraph}
            >
              <Maximize2 className="h-4 w-4 mr-1" />
              Center
            </Button>
          </div>
        )}
      </div>
      
      {!isConnected ? (
        <div 
          className="border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 h-[350px] flex items-center justify-center"
        >
          <div className="text-center p-6">
            <div className="inline-block p-4 rounded-full bg-blue-50 dark:bg-blue-900/30 mb-4">
              <Share2 className="h-10 w-10 text-blue-500" />
            </div>
            <h4 className="text-lg font-medium mb-2">Neo4j Graph Visualization</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
              Connect to your Neo4j instance to visualize entity relationships as an interactive graph network.
            </p>
            
            <div className="space-y-4 max-w-md mx-auto text-left bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm mb-4">
              <div className="grid grid-cols-4 gap-2 items-center">
                <label className="text-sm font-medium col-span-1">URI:</label>
                <input 
                  type="text" 
                  value={neo4jConfig.uri} 
                  onChange={e => setNeo4jConfig({...neo4jConfig, uri: e.target.value})}
                  className="col-span-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2"
                />
              </div>
              <div className="grid grid-cols-4 gap-2 items-center">
                <label className="text-sm font-medium col-span-1">User:</label>
                <input 
                  type="text" 
                  value={neo4jConfig.user} 
                  onChange={e => setNeo4jConfig({...neo4jConfig, user: e.target.value})}
                  className="col-span-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2"
                />
              </div>
              <div className="grid grid-cols-4 gap-2 items-center">
                <label className="text-sm font-medium col-span-1">Password:</label>
                <input 
                  type="password" 
                  value={neo4jConfig.password} 
                  onChange={e => setNeo4jConfig({...neo4jConfig, password: e.target.value})}
                  className="col-span-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2"
                />
              </div>
            </div>
            
            <Button
              onClick={connectToNeo4j}
              disabled={isLoading}
              className="rounded-xl bg-gradient-to-r from-[#FFD700] to-[#FF8C00] hover:opacity-90 transition-all shadow-md"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-r-transparent rounded-full"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Connect to Neo4j
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="h-[350px] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeLabel="name"
            nodeColor={node => node.color as string}
            nodeRelSize={6}
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={0.8}
            linkCurvature={0.25}
            linkWidth={2}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleSpeed={0.01}
            cooldownTicks={100}
            onNodeClick={node => {
              toast({
                title: `${node.name}`,
                description: `ID: ${node.id}, Type: ${node.group}`,
              });
            }}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = node.name;
              const fontSize = 12/globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;
              const textWidth = ctx.measureText(label).width;
              const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);
              
              // Node circle
              ctx.beginPath();
              ctx.fillStyle = node.color as string;
              ctx.arc(node.x as number, node.y as number, node.val as number / 2, 0, 2 * Math.PI);
              ctx.fill();
              
              // Text background
              ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
              ctx.fillRect(
                (node.x as number) - bckgDimensions[0] / 2,
                (node.y as number) + node.val as number / 2 + fontSize,
                bckgDimensions[0],
                bckgDimensions[1]
              );
              
              // Text
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#333333';
              ctx.fillText(
                label,
                node.x as number,
                (node.y as number) + node.val as number / 2 + fontSize * 1.1
              );
            }}
          />
        </div>
      )}
      
      {isConnected && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          <Card className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl">
            <div className="flex items-center space-x-2">
              <Circle className="h-5 w-5 text-[#FFD700]" />
              <h4 className="text-sm font-medium">Nodes</h4>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
              {graphData.nodes.length}
            </p>
          </Card>
          <Card className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl">
            <div className="flex items-center space-x-2">
              <Box className="h-5 w-5 text-[#1A202C]" />
              <h4 className="text-sm font-medium">Relationships</h4>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
              {graphData.links.length}
            </p>
          </Card>
          <Card className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-500" />
              <h4 className="text-sm font-medium">Database</h4>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-2 truncate">
              {neo4jConfig.uri}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};

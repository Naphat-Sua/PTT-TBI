
import React, { useState, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Panel, useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, Play, Stop, Code, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Node types
import TriggerNode from '@/components/agent-builder/nodes/TriggerNode';
import PromptNode from '@/components/agent-builder/nodes/PromptNode';
import VectorSearchNode from '@/components/agent-builder/nodes/VectorSearchNode';
import ApiCallNode from '@/components/agent-builder/nodes/ApiCallNode';
import ActionNode from '@/components/agent-builder/nodes/ActionNode';
import LogicNode from '@/components/agent-builder/nodes/LogicNode';
import LoopNode from '@/components/agent-builder/nodes/LoopNode';
import DatabaseNode from '@/components/agent-builder/nodes/DatabaseNode';

// Initial flow elements
const initialNodes = [
  {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 250, y: 50 },
    data: { label: 'Start', description: 'Beginning of your agent flow' }
  }
];

const initialEdges = [];

// Define all node types
const nodeTypes = {
  trigger: TriggerNode,
  prompt: PromptNode,
  vectorSearch: VectorSearchNode,
  apiCall: ApiCallNode,
  action: ActionNode,
  logic: LogicNode,
  loop: LoopNode,
  database: DatabaseNode
};

const AgentBuilder = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  // Handle connection between nodes
  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  // Add a new node to the canvas
  const addNode = (nodeType) => {
    const newNode = {
      id: `${nodeType}-${nodes.length + 1}`,
      type: nodeType,
      position: { x: 250, y: 150 + nodes.length * 80 },
      data: { label: `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} Node` }
    };
    setNodes((nds) => nds.concat(newNode));
    
    toast({
      title: "Node Added",
      description: `Added a new ${nodeType} node to your flow`,
    });
  };

  // Export agent as code
  const exportAgent = () => {
    // This would generate Python code, requirements.txt, etc.
    toast({
      title: "Agent Exported",
      description: "Your agent code has been generated and is ready for download",
    });
  };

  // Toggle agent runtime
  const toggleRuntime = () => {
    setIsRunning(!isRunning);
    toast({
      title: isRunning ? "Agent Stopped" : "Agent Started",
      description: isRunning ? "Your agent has been stopped" : "Your agent is now running",
    });
  };

  // Save the current flow
  const saveFlow = () => {
    // This would save the flow to the backend
    toast({
      title: "Flow Saved",
      description: "Your agent flow has been saved successfully",
    });
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen p-4">
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold shimmer">
              007Agents Builder
            </CardTitle>
            <CardDescription>
              Build, deploy, and export AI-powered agents with a visual interface
            </CardDescription>
          </CardHeader>
        </Card>
        
        <div className="flex-1 overflow-hidden rounded-2xl border border-gray-200 shadow-lg dark:border-gray-800">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
            
            <Panel position="top-right" className="bg-card rounded-xl p-2 shadow-md">
              <div className="flex flex-col gap-2">
                <Button onClick={saveFlow} size="sm" className="flex items-center gap-2">
                  <Save size={16} />
                  Save
                </Button>
                <Button onClick={toggleRuntime} size="sm" variant={isRunning ? "destructive" : "default"} className="flex items-center gap-2">
                  {isRunning ? <Stop size={16} /> : <Play size={16} />}
                  {isRunning ? "Stop" : "Run"}
                </Button>
                <Button onClick={exportAgent} size="sm" variant="outline" className="flex items-center gap-2">
                  <Code size={16} />
                  Export
                </Button>
                <Button onClick={() => exportAgent()} size="sm" variant="outline" className="flex items-center gap-2">
                  <Download size={16} />
                  Download
                </Button>
              </div>
            </Panel>
            
            <Panel position="top-left" className="bg-card rounded-xl p-2 shadow-md">
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium mb-1">Add Nodes:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => addNode('prompt')} size="sm" variant="outline" className="flex items-center gap-1">
                    <PlusCircle size={14} /> Prompt
                  </Button>
                  <Button onClick={() => addNode('vectorSearch')} size="sm" variant="outline" className="flex items-center gap-1">
                    <PlusCircle size={14} /> Vector
                  </Button>
                  <Button onClick={() => addNode('apiCall')} size="sm" variant="outline" className="flex items-center gap-1">
                    <PlusCircle size={14} /> API
                  </Button>
                  <Button onClick={() => addNode('action')} size="sm" variant="outline" className="flex items-center gap-1">
                    <PlusCircle size={14} /> Action
                  </Button>
                  <Button onClick={() => addNode('logic')} size="sm" variant="outline" className="flex items-center gap-1">
                    <PlusCircle size={14} /> Logic
                  </Button>
                  <Button onClick={() => addNode('loop')} size="sm" variant="outline" className="flex items-center gap-1">
                    <PlusCircle size={14} /> Loop
                  </Button>
                  <Button onClick={() => addNode('database')} size="sm" variant="outline" className="flex items-center gap-1">
                    <PlusCircle size={14} /> Database
                  </Button>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default AgentBuilder;

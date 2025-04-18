
import React, { memo } from 'react';
import { Position, Handle } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Trash, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LogicNodeProps {
  data: {
    label: string;
    description?: string;
    condition?: string;
    onConfigure?: () => void;
    onDelete?: () => void;
  };
  id: string;
  selected: boolean;
}

const LogicNode = ({ data, id, selected }: LogicNodeProps) => {
  return (
    <div className="relative">
      <div className="absolute -top-2 -left-2 bg-orange-500 text-white rounded-full p-1">
        <GitBranch size={12} />
      </div>
      
      <Card 
        className={`min-w-[180px] max-w-[250px] transition-all duration-200 ${
          selected ? 'ring-2 ring-primary shadow-lg' : ''
        } hover:scale-[1.02]`}
      >
        <CardHeader className="p-3 pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium">{data.label}</CardTitle>
            <div className="flex gap-1">
              {data.onConfigure && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={data.onConfigure}
                >
                  <Settings size={14} />
                  <span className="sr-only">Configure</span>
                </Button>
              )}
              {data.onDelete && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 hover:text-destructive" 
                  onClick={data.onDelete}
                >
                  <Trash size={14} />
                  <span className="sr-only">Delete</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 text-xs">
          <p className="text-muted-foreground">
            {data.description || `Condition: ${data.condition || 'result.success === true'}`}
          </p>
          <div className="mt-2 flex justify-between text-[10px] font-medium">
            <div className="bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded">TRUE</div>
            <div className="bg-red-100 dark:bg-red-900 px-2 py-0.5 rounded">FALSE</div>
          </div>
        </CardContent>

        <Handle
          type="target"
          position={Position.Top}
          className="w-2 h-2 rounded-full bg-primary border-2 border-background"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="true"
          className="left-1/3 -translate-x-1/2 w-2 h-2 rounded-full bg-green-500 border-2 border-background"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="false"
          className="left-2/3 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500 border-2 border-background"
        />
      </Card>
    </div>
  );
};

export default memo(LogicNode);

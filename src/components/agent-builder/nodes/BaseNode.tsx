
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BaseNodeProps {
  data: {
    label: string;
    description?: string;
    onConfigure?: () => void;
    onDelete?: () => void;
  };
  id: string;
  selected: boolean;
  type: string;
  sourcePosition?: Position;
  targetPosition?: Position;
  isSource?: boolean;
  isTarget?: boolean;
}

const BaseNode = ({ 
  data, 
  id, 
  selected,
  sourcePosition = Position.Bottom,
  targetPosition = Position.Top,
  isSource = true,
  isTarget = true
}: BaseNodeProps) => {
  return (
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
        {data.description && <p className="text-muted-foreground">{data.description}</p>}
      </CardContent>

      {isTarget && (
        <Handle
          type="target"
          position={targetPosition}
          className="w-2 h-2 rounded-full bg-primary border-2 border-background"
        />
      )}
      {isSource && (
        <Handle
          type="source"
          position={sourcePosition}
          className="w-2 h-2 rounded-full bg-primary border-2 border-background"
        />
      )}
    </Card>
  );
};

export default memo(BaseNode);

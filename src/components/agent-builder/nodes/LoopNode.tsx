
import React, { memo } from 'react';
import { Position } from '@xyflow/react';
import BaseNode from './BaseNode';
import { RefreshCw } from 'lucide-react';

interface LoopNodeProps {
  data: {
    label: string;
    description?: string;
    iterations?: number;
    condition?: string;
    onConfigure?: () => void;
    onDelete?: () => void;
  };
  id: string;
  selected: boolean;
}

const LoopNode = ({ data, id, selected }: LoopNodeProps) => {
  return (
    <div className="relative">
      <div className="absolute -top-2 -left-2 bg-cyan-500 text-white rounded-full p-1">
        <RefreshCw size={12} />
      </div>
      <BaseNode
        data={{
          ...data,
          description: data.description || data.iterations 
            ? `Iterations: ${data.iterations}`
            : `While: ${data.condition || 'hasMore === true'}`
        }}
        id={id}
        selected={selected}
        type="loop"
      />
    </div>
  );
};

export default memo(LoopNode);

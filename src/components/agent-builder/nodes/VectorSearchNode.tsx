
import React, { memo } from 'react';
import { Position } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Search } from 'lucide-react';

interface VectorSearchNodeProps {
  data: {
    label: string;
    description?: string;
    collection?: string;
    topK?: number;
    onConfigure?: () => void;
    onDelete?: () => void;
  };
  id: string;
  selected: boolean;
}

const VectorSearchNode = ({ data, id, selected }: VectorSearchNodeProps) => {
  return (
    <div className="relative">
      <div className="absolute -top-2 -left-2 bg-purple-500 text-white rounded-full p-1">
        <Search size={12} />
      </div>
      <BaseNode
        data={{
          ...data,
          description: data.description || `Collection: ${data.collection || 'default'}, Top-K: ${data.topK || 3}`
        }}
        id={id}
        selected={selected}
        type="vectorSearch"
      />
    </div>
  );
};

export default memo(VectorSearchNode);

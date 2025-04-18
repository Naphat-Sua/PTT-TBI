
import React, { memo } from 'react';
import { Position } from '@xyflow/react';
import BaseNode from './BaseNode';
import { MessageSquare } from 'lucide-react';

interface PromptNodeProps {
  data: {
    label: string;
    description?: string;
    promptTemplate?: string;
    model?: string;
    temperature?: number;
    onConfigure?: () => void;
    onDelete?: () => void;
  };
  id: string;
  selected: boolean;
}

const PromptNode = ({ data, id, selected }: PromptNodeProps) => {
  return (
    <div className="relative">
      <div className="absolute -top-2 -left-2 bg-blue-500 text-white rounded-full p-1">
        <MessageSquare size={12} />
      </div>
      <BaseNode
        data={{
          ...data,
          description: data.description || `Model: ${data.model || 'gpt-4o'}, Temp: ${data.temperature || 0.7}`
        }}
        id={id}
        selected={selected}
        type="prompt"
      />
    </div>
  );
};

export default memo(PromptNode);

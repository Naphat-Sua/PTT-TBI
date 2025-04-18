
import React, { memo } from 'react';
import { Position } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Globe } from 'lucide-react';

interface ApiCallNodeProps {
  data: {
    label: string;
    description?: string;
    url?: string;
    method?: string;
    onConfigure?: () => void;
    onDelete?: () => void;
  };
  id: string;
  selected: boolean;
}

const ApiCallNode = ({ data, id, selected }: ApiCallNodeProps) => {
  return (
    <div className="relative">
      <div className="absolute -top-2 -left-2 bg-green-500 text-white rounded-full p-1">
        <Globe size={12} />
      </div>
      <BaseNode
        data={{
          ...data,
          description: data.description || `${data.method || 'GET'} ${data.url || 'https://api.example.com'}`
        }}
        id={id}
        selected={selected}
        type="apiCall"
      />
    </div>
  );
};

export default memo(ApiCallNode);


import React, { memo } from 'react';
import { Position } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Database } from 'lucide-react';

interface DatabaseNodeProps {
  data: {
    label: string;
    description?: string;
    operation?: 'read' | 'write' | 'query';
    table?: string;
    onConfigure?: () => void;
    onDelete?: () => void;
  };
  id: string;
  selected: boolean;
}

const DatabaseNode = ({ data, id, selected }: DatabaseNodeProps) => {
  return (
    <div className="relative">
      <div className="absolute -top-2 -left-2 bg-indigo-500 text-white rounded-full p-1">
        <Database size={12} />
      </div>
      <BaseNode
        data={{
          ...data,
          description: data.description || `${data.operation || 'query'} ${data.table || 'users'}`
        }}
        id={id}
        selected={selected}
        type="database"
      />
    </div>
  );
};

export default memo(DatabaseNode);

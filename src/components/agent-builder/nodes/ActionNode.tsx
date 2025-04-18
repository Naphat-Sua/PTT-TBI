
import React, { memo } from 'react';
import { Position } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Zap } from 'lucide-react';

interface ActionNodeProps {
  data: {
    label: string;
    description?: string;
    actionType?: string;
    target?: string;
    onConfigure?: () => void;
    onDelete?: () => void;
  };
  id: string;
  selected: boolean;
}

const ActionNode = ({ data, id, selected }: ActionNodeProps) => {
  return (
    <div className="relative">
      <div className="absolute -top-2 -left-2 bg-yellow-500 text-white rounded-full p-1">
        <Zap size={12} />
      </div>
      <BaseNode
        data={{
          ...data,
          description: data.description || `${data.actionType || 'Send'} to ${data.target || 'user@example.com'}`
        }}
        id={id}
        selected={selected}
        type="action"
      />
    </div>
  );
};

export default memo(ActionNode);

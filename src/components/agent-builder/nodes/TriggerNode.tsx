
import React, { memo } from 'react';
import { Position } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Play } from 'lucide-react';

interface TriggerNodeProps {
  data: {
    label: string;
    description?: string;
    onConfigure?: () => void;
    onDelete?: () => void;
  };
  id: string;
  selected: boolean;
}

const TriggerNode = ({ data, id, selected }: TriggerNodeProps) => {
  return (
    <div className="relative">
      <div className="absolute -top-2 -left-2 bg-primary text-white rounded-full p-1">
        <Play size={12} />
      </div>
      <BaseNode
        data={data}
        id={id}
        selected={selected}
        type="trigger"
        isTarget={false} // Trigger nodes don't have inputs
        sourcePosition={Position.Bottom}
      />
    </div>
  );
};

export default memo(TriggerNode);

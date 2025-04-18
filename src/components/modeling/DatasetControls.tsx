
import React from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3, Download, Share2, Workflow } from 'lucide-react';

interface DatasetControlsProps {
  onAnalyze?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onProcess?: () => void;
  isProcessing?: boolean;
}

export const DatasetControls: React.FC<DatasetControlsProps> = ({
  onAnalyze,
  onExport,
  onShare,
  onProcess,
  isProcessing
}) => {
  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        className="rounded-lg"
        onClick={onAnalyze}
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        Analyze
      </Button>
      
      <Button 
        variant="outline" 
        size="sm" 
        className="rounded-lg"
        onClick={onExport}
      >
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>
      
      <Button 
        variant="outline" 
        size="sm" 
        className="rounded-lg"
        onClick={onShare}
      >
        <Share2 className="h-4 w-4 mr-2" />
        Share
      </Button>
      
      {onProcess && (
        <Button 
          variant="default" 
          size="sm" 
          className="rounded-lg"
          onClick={onProcess}
          disabled={isProcessing}
        >
          <Workflow className="h-4 w-4 mr-2" />
          {isProcessing ? 'Processing...' : 'Process Dataset'}
        </Button>
      )}
    </div>
  );
};

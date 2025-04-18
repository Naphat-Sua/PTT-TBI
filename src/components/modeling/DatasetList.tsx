
import React from 'react';
import { FileType, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDatasetActions } from '@/hooks/useDatasetActions';
import { DatasetControls } from './DatasetControls';

interface Dataset {
  id: number;
  name: string;
  size: string;
  date: string;
  type: string;
}

interface DatasetListProps {
  datasets: Dataset[];
  onDatasetDelete?: (id: number) => void;
  onDatasetUpdate?: (dataset: Dataset) => void;
}

export const DatasetList: React.FC<DatasetListProps> = ({
  datasets,
  onDatasetDelete,
  onDatasetUpdate
}) => {
  const { isProcessing, processDataset, deleteDataset } = useDatasetActions();

  const handleDelete = async (id: number) => {
    if (await deleteDataset(id)) {
      onDatasetDelete?.(id);
    }
  };

  const handleProcess = async (dataset: Dataset) => {
    if (await processDataset(dataset)) {
      onDatasetUpdate?.(dataset);
    }
  };

  return (
    <div className="space-y-2">
      {datasets.map((dataset) => (
        <div 
          key={dataset.id} 
          className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#FFD700] dark:hover:border-[#FFD700] transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded-lg mr-3">
                <FileType className="h-5 w-5 text-[#FFD700]" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{dataset.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {dataset.type} • {dataset.size} • {dataset.date}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(dataset.id)}
              className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          <DatasetControls
            onAnalyze={() => console.log('Analyzing dataset:', dataset.name)}
            onExport={() => console.log('Exporting dataset:', dataset.name)}
            onShare={() => console.log('Sharing dataset:', dataset.name)}
            onProcess={() => handleProcess(dataset)}
            isProcessing={isProcessing}
          />
        </div>
      ))}
      
      {datasets.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No datasets available. Upload a file to get started.
        </div>
      )}
    </div>
  );
};

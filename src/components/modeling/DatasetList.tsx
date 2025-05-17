import React, { useState } from 'react';
import { FileType, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatasetControls } from './DatasetControls';
import { Dataset, formatFileSize, formatDate, deleteDataset } from '@/utils/dataModelingService';
import { useToast } from '@/hooks/use-toast';

interface DatasetListProps {
  datasets: Dataset[];
  onDatasetSelect?: (dataset: Dataset) => void;
  onDatasetDelete?: (id: string) => void;
  refreshDatasets?: () => void;
}

export const DatasetList: React.FC<DatasetListProps> = ({
  datasets,
  onDatasetSelect,
  onDatasetDelete,
  refreshDatasets
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDelete = async (dataset: Dataset) => {
    if (confirm(`Are you sure you want to delete "${dataset.name}"?`)) {
      try {
        setProcessingId(dataset.id);
        await deleteDataset(dataset.id);
        toast({
          title: "Dataset deleted",
          description: `${dataset.name} has been removed.`,
        });
        
        if (onDatasetDelete) {
          onDatasetDelete(dataset.id);
        } else if (refreshDatasets) {
          refreshDatasets();
        }
      } catch (error) {
        console.error("Failed to delete dataset:", error);
        toast({
          title: "Error deleting dataset",
          description: "There was a problem deleting the dataset. Please try again.",
          variant: "destructive"
        });
      } finally {
        setProcessingId(null);
      }
    }
  };

  const handleAnalyze = (dataset: Dataset) => {
    if (onDatasetSelect) {
      onDatasetSelect(dataset);
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
                  {dataset.file_type} • {formatFileSize(dataset.size)} • {formatDate(dataset.uploaded_at)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              disabled={processingId === dataset.id}
              onClick={() => handleDelete(dataset)}
              className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
            >
              {processingId === dataset.id ? (
                <span className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full"></span>
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <DatasetControls
            onAnalyze={() => handleAnalyze(dataset)}
            onExport={() => console.log('Exporting dataset:', dataset.name)}
            onShare={() => console.log('Sharing dataset:', dataset.name)}
            isProcessing={processingId === dataset.id}
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

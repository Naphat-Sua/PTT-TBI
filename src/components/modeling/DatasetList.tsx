
import React from 'react';
import { FileSpreadsheet, FileJson, FileText } from 'lucide-react';

interface Dataset {
  id: number;
  name: string;
  size: string;
  date: string;
  type: string;
}

interface DatasetListProps {
  datasets: Dataset[];
}

export const DatasetList = ({ datasets }: DatasetListProps) => {
  // Function to get the appropriate icon based on file type
  const getFileIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'CSV':
        return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
      case 'JSON':
        return <FileJson className="h-4 w-4 text-blue-500" />;
      case 'XLSX':
        return <FileSpreadsheet className="h-4 w-4 text-emerald-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
      {datasets.length === 0 ? (
        <div className="text-center p-6 text-gray-500 dark:text-gray-400">
          No datasets available
        </div>
      ) : (
        datasets.map((dataset) => (
          <div 
            key={dataset.id}
            className="flex items-center p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex-shrink-0 mr-3">
              {getFileIcon(dataset.type)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{dataset.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {dataset.size} • {dataset.date}
              </p>
            </div>
            <div className="ml-3 flex-shrink-0">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                {dataset.type}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

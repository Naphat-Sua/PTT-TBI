
import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, ChevronRight, Table, BarChart3, PieChart, 
  AlignLeft, FileSpreadsheet, ArrowRight, Check 
} from 'lucide-react';
import { DatasetInfo, DataSummary, ModelResult } from '@/types';

// Dataset Uploader Component
const DatasetUploader = ({ onDatasetProcessed }: { onDatasetProcessed: (dataset: DatasetInfo) => void }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    setIsProcessing(true);
    setProcessingError(null);
    
    try {
      // In a real implementation, we would parse the CSV/dataset here
      // For demo purposes, we'll create a mock dataset
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock dataset info
      const newDataset: DatasetInfo = {
        id: uuidv4(),
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date(),
        features: ['age', 'income', 'education', 'occupation', 'marital_status', 'has_children', 'owns_home', 'num_cars'],
        shape: [500, 8],
        summary: {
          numericColumns: {
            age: { mean: 42.5, median: 41.0, min: 18, max: 82, std: 14.2 },
            income: { mean: 68500, median: 65000, min: 18000, max: 250000, std: 35000 },
            num_cars: { mean: 1.8, median: 2, min: 0, max: 5, std: 0.9 }
          },
          categoricalColumns: {
            education: { 
              uniqueValues: 5, 
              topCategories: { 'Bachelors': 210, 'Masters': 150, 'High School': 100, 'PhD': 30, 'Other': 10 } 
            },
            occupation: { 
              uniqueValues: 8, 
              topCategories: { 'Professional': 180, 'Management': 120, 'Technical': 70, 'Sales': 50, 'Other': 80 } 
            },
            marital_status: {
              uniqueValues: 4,
              topCategories: { 'Married': 280, 'Single': 150, 'Divorced': 60, 'Widowed': 10 }
            }
          },
          missingValues: { 
            age: 0, 
            income: 12, 
            education: 5, 
            occupation: 8,
            marital_status: 0,
            has_children: 0,
            owns_home: 3,
            num_cars: 5
          }
        }
      };
      
      // Pass the processed dataset up to the parent component
      onDatasetProcessed(newDataset);
      
    } catch (error) {
      console.error('Error processing dataset:', error);
      setProcessingError('Failed to process the dataset. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [onDatasetProcessed]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/tab-separated-values': ['.tsv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  });
  
  return (
    <div className="mb-8">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-apple-blue bg-blue-50 dark:bg-blue-900/10' : 
          'border-gray-300 dark:border-gray-700 hover:border-apple-blue dark:hover:border-apple-highlight'}`}
      >
        <input {...getInputProps()} />
        <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
        
        {isProcessing ? (
          <p className="text-gray-600 dark:text-gray-300">Processing dataset...</p>
        ) : (
          <>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
              Drag & drop a dataset here, or click to select
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Supported formats: CSV, TSV, XLS, XLSX
            </p>
          </>
        )}
        
        {processingError && (
          <p className="mt-3 text-red-500 dark:text-red-400">{processingError}</p>
        )}
      </div>
    </div>
  );
};

// Dataset Info Display Component
const DatasetInfoDisplay = ({ dataset }: { dataset: DatasetInfo }) => {
  return (
    <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-xl font-medium mb-4 text-gray-800 dark:text-gray-200">Dataset Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Name</p>
          <p className="font-medium text-gray-800 dark:text-gray-200">{dataset.name}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Size</p>
          <p className="font-medium text-gray-800 dark:text-gray-200">
            {(dataset.size / 1024).toFixed(1)} KB
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Uploaded</p>
          <p className="font-medium text-gray-800 dark:text-gray-200">
            {new Date(dataset.uploadedAt).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Dimensions</p>
          <p className="font-medium text-gray-800 dark:text-gray-200">
            {dataset.shape ? `${dataset.shape[0]} rows × ${dataset.shape[1]} columns` : 'Unknown'}
          </p>
        </div>
      </div>
      
      <div className="mb-6">
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Features</p>
        <div className="flex flex-wrap gap-2">
          {dataset.features && dataset.features.map(feature => (
            <span 
              key={feature} 
              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 
                dark:text-gray-300 rounded-md text-sm"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
      
      {dataset.summary && dataset.summary.missingValues && (
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Missing Values</p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Feature</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Missing</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {Object.entries(dataset.summary.missingValues).map(([feature, count]) => (
                  <tr key={feature}>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{feature}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{count}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                      {dataset.shape ? (count / dataset.shape[0] * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Exploratory Data Analysis Component
const EDADisplay = ({ dataset }: { dataset: DatasetInfo }) => {
  if (!dataset || !dataset.summary) return null;
  
  return (
    <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-xl font-medium mb-4 text-gray-800 dark:text-gray-200">Exploratory Data Analysis</h3>
      
      {/* Numerical Features Summary */}
      {dataset.summary.numericColumns && Object.keys(dataset.summary.numericColumns).length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-300">
            Numerical Features
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Feature</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Mean</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Median</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Min</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Max</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Std Dev</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {Object.entries(dataset.summary.numericColumns).map(([feature, stats]) => (
                  <tr key={feature}>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{feature}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{stats.mean.toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{stats.median.toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{stats.min.toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{stats.max.toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{stats.std.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Categorical Features Summary */}
      {dataset.summary.categoricalColumns && Object.keys(dataset.summary.categoricalColumns).length > 0 && (
        <div>
          <h4 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-300">
            Categorical Features
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(dataset.summary.categoricalColumns).map(([feature, stats]) => (
              <div 
                key={feature}
                className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4"
              >
                <h5 className="font-medium mb-2 text-gray-700 dark:text-gray-300">{feature}</h5>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {stats.uniqueValues} unique values
                </p>
                <div>
                  {Object.entries(stats.topCategories).map(([category, count]) => (
                    <div key={category} className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">{category}</span>
                        <span className="text-gray-500 dark:text-gray-400">{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-apple-blue dark:bg-apple-highlight h-2 rounded-full" 
                          style={{ width: `${count / Object.values(stats.topCategories).reduce((a, b) => a + b, 0) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Model Training Component
const ModelTraining = ({ 
  dataset, 
  onModelResult 
}: { 
  dataset: DatasetInfo, 
  onModelResult: (result: ModelResult) => void 
}) => {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [modelType, setModelType] = useState<'classification' | 'regression'>('classification');
  const [isTraining, setIsTraining] = useState(false);
  
  const handleFeatureToggle = (feature: string) => {
    if (selectedFeatures.includes(feature)) {
      setSelectedFeatures(prev => prev.filter(f => f !== feature));
    } else {
      setSelectedFeatures(prev => [...prev, feature]);
    }
  };
  
  const handleTrainModel = async () => {
    if (!selectedTarget || selectedFeatures.length === 0) return;
    
    setIsTraining(true);
    
    try {
      // In a real implementation, this would call a machine learning service
      // For demo purposes, we'll simulate training with a delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create mock result based on model type
      const mockResult: ModelResult = modelType === 'classification' 
        ? {
            type: 'classification',
            metrics: {
              accuracy: 0.85,
              precision: 0.83,
              recall: 0.87,
              f1: 0.85,
              auc: 0.92
            },
            confusionMatrix: [
              [120, 20],
              [30, 330]
            ],
            featureImportance: {
              age: 0.15,
              income: 0.35,
              education: 0.2,
              occupation: 0.1,
              marital_status: 0.12,
              has_children: 0.05,
              owns_home: 0.03
            }
          }
        : {
            type: 'regression',
            metrics: {
              mae: 4250.32,
              mse: 35000000.5,
              rmse: 5916.2,
              r2: 0.78
            },
            featureImportance: {
              age: 0.08,
              education: 0.22,
              occupation: 0.15,
              marital_status: 0.05,
              has_children: 0.1,
              owns_home: 0.4
            }
          };
      
      onModelResult(mockResult);
      
    } catch (error) {
      console.error('Error training model:', error);
    } finally {
      setIsTraining(false);
    }
  };
  
  if (!dataset || !dataset.features) return null;
  
  const targetCandidates = dataset.features || [];
  const featureCandidates = selectedTarget 
    ? dataset.features.filter(f => f !== selectedTarget)
    : [];
  
  return (
    <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-xl font-medium mb-4 text-gray-800 dark:text-gray-200">Model Training</h3>
      
      <div className="space-y-6">
        {/* Target Variable Selection */}
        <div>
          <h4 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-300">
            1. Select Target Variable
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {targetCandidates.map(feature => (
              <button
                key={feature}
                onClick={() => setSelectedTarget(feature)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors
                  ${selectedTarget === feature ? 
                  'bg-apple-blue text-white' : 
                  'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                {feature}
              </button>
            ))}
          </div>
        </div>
        
        {/* Feature Selection */}
        {selectedTarget && (
          <div>
            <h4 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-300">
              2. Select Features
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {featureCandidates.map(feature => (
                <button
                  key={feature}
                  onClick={() => handleFeatureToggle(feature)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between
                    ${selectedFeatures.includes(feature) ? 
                    'bg-apple-blue text-white' : 
                    'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                >
                  <span>{feature}</span>
                  {selectedFeatures.includes(feature) && <Check className="h-4 w-4 ml-1" />}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Model Type Selection */}
        {selectedTarget && selectedFeatures.length > 0 && (
          <div>
            <h4 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-300">
              3. Select Model Type
            </h4>
            <div className="flex space-x-4">
              <button
                onClick={() => setModelType('classification')}
                className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors
                  ${modelType === 'classification' ? 
                  'bg-apple-blue text-white' : 
                  'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                Classification
              </button>
              <button
                onClick={() => setModelType('regression')}
                className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors
                  ${modelType === 'regression' ? 
                  'bg-apple-blue text-white' : 
                  'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                Regression
              </button>
            </div>
          </div>
        )}
        
        {/* Train Button */}
        {selectedTarget && selectedFeatures.length > 0 && (
          <div className="pt-4">
            <button
              onClick={handleTrainModel}
              disabled={isTraining}
              className="bg-apple-blue hover:bg-blue-600 text-white py-2 px-6 rounded-lg font-medium 
                disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-700 transition-colors"
            >
              {isTraining ? (
                <span className="flex items-center">
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></span>
                  Training Model...
                </span>
              ) : (
                'Train Model'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Model Results Component
const ModelResults = ({ result }: { result: ModelResult }) => {
  if (!result) return null;
  
  return (
    <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-xl font-medium mb-4 text-gray-800 dark:text-gray-200">Model Results</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model Metrics */}
        <div>
          <h4 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-300">
            Model Performance
          </h4>
          <div className="space-y-3">
            {Object.entries(result.metrics).map(([metric, value]) => (
              <div key={metric} className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400 capitalize">
                  {metric === 'r2' ? 'R²' : metric === 'rmse' ? 'RMSE' : 
                   metric === 'mae' ? 'MAE' : metric === 'mse' ? 'MSE' : metric}
                </span>
                <span className="font-mono text-gray-800 dark:text-gray-200">
                  {typeof value === 'number' && value < 1 && value > 0 
                    ? value.toFixed(4) 
                    : value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Feature Importance */}
        {result.featureImportance && (
          <div>
            <h4 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-300">
              Feature Importance
            </h4>
            <div className="space-y-3">
              {Object.entries(result.featureImportance)
                .sort((a, b) => b[1] - a[1])
                .map(([feature, importance]) => (
                  <div key={feature}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {(importance * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-apple-blue dark:bg-apple-highlight h-2 rounded-full" 
                        style={{ width: `${importance * 100}%` }}
                      ></div>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Confusion Matrix for Classification */}
      {result.type === 'classification' && result.confusionMatrix && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-300">
            Confusion Matrix
          </h4>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-w-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">True Negative</p>
                <p className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                  {result.confusionMatrix[0][0]}
                </p>
              </div>
              <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">False Positive</p>
                <p className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                  {result.confusionMatrix[0][1]}
                </p>
              </div>
              <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">False Negative</p>
                <p className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                  {result.confusionMatrix[1][0]}
                </p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">True Positive</p>
                <p className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                  {result.confusionMatrix[1][1]}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main M-Modeling Component
const MModeling = () => {
  const [dataset, setDataset] = useState<DatasetInfo | null>(null);
  const [modelResult, setModelResult] = useState<ModelResult | null>(null);
  
  // Handle adding a new dataset
  const handleDatasetProcessed = (newDataset: DatasetInfo) => {
    setDataset(newDataset);
    setModelResult(null); // Reset model results when new dataset is uploaded
  };
  
  // Handle model results
  const handleModelResult = (result: ModelResult) => {
    setModelResult(result);
  };
  
  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">M-Modeling</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Data science modeling assistant. Upload your dataset, explore it, and build predictive models.
        </p>
      </div>
      
      <div className="max-w-4xl mx-auto">
        {!dataset ? (
          <DatasetUploader onDatasetProcessed={handleDatasetProcessed} />
        ) : (
          <>
            <DatasetInfoDisplay dataset={dataset} />
            <EDADisplay dataset={dataset} />
            <ModelTraining dataset={dataset} onModelResult={handleModelResult} />
            {modelResult && <ModelResults result={modelResult} />}
          </>
        )}
      </div>
    </div>
  );
};

export default MModeling;

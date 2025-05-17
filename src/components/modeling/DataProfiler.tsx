import React, { useState, useEffect } from 'react';
import { BarChart3, FileBarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getDatasetProfile, DataProfile } from '@/utils/dataModelingService';
import { useToast } from '@/hooks/use-toast';

interface DataProfilerProps {
  datasetId?: string;
}

export const DataProfiler: React.FC<DataProfilerProps> = ({ datasetId }) => {
  const [profileData, setProfileData] = useState<DataProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  // For demo purposes, if no datasetId is provided
  const sampleData = [
    { column: 'timestamp', type: 'TIMESTAMP', completeness: 100, uniqueness: 100, min: '2023-01-01', max: '2023-12-31' },
    { column: 'location_id', type: 'UUID', completeness: 100, uniqueness: 10, min: null, max: null },
    { column: 'value', type: 'FLOAT', completeness: 98.7, uniqueness: 92.5, min: '0.15', max: '1458.92' },
    { column: 'status', type: 'VARCHAR', completeness: 87.2, uniqueness: 4.5, min: null, max: null },
    { column: 'quality_score', type: 'INTEGER', completeness: 76.3, uniqueness: 8.1, min: '1', max: '10' },
  ];

  useEffect(() => {
    if (datasetId) {
      loadProfileData(datasetId);
    }
  }, [datasetId]);

  const loadProfileData = async (id: string) => {
    setIsLoading(true);
    try {
      const profile = await getDatasetProfile(id);
      setProfileData(profile);
    } catch (error) {
      console.error("Failed to load profile data:", error);
      toast({
        title: "Error loading profile data",
        description: "There was a problem fetching the dataset profiling information.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Transform profile data to table format
  const getTableData = () => {
    if (!profileData) return sampleData;
    
    return Object.entries(profileData.columns).map(([colName, colData]) => ({
      column: colName,
      type: colData.type,
      completeness: colData.completeness,
      uniqueness: colData.uniqueness,
      min: colData.min || null,
      max: colData.max || null
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
      <div className="p-6 mb-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium">Data Profiling Report</h3>
          {isLoading && (
            <div className="flex items-center text-sm text-gray-500">
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-gray-500 border-r-transparent rounded-full"></div>
              Loading profile data...
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Quality metrics for {profileData ? `${profileData.row_count.toLocaleString()} records` : '156,245 records'}
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Column</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Completeness</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Uniqueness</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Min</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Max</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {getTableData().map((row, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/20'}>
                <td className="px-6 py-4 font-medium">{row.column}</td>
                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{row.type}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mr-2">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${row.completeness}%` }}
                      ></div>
                    </div>
                    <span>{row.completeness}%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mr-2">
                      <div 
                        className="bg-green-600 h-2.5 rounded-full" 
                        style={{ width: `${row.uniqueness}%` }}
                      ></div>
                    </div>
                    <span>{row.uniqueness}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{row.min || 'N/A'}</td>
                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{row.max || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
        <div>
          {profileData && profileData.row_count > 0 && (
            <>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 mr-2">
                {Object.values(profileData.columns).filter(c => c.completeness < 100).length} warnings
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">Some columns have incomplete data</span>
            </>
          )}
          {!profileData && (
            <>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 mr-2">
                2 warnings
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">Some columns have incomplete data</span>
            </>
          )}
        </div>
        <Button variant="ghost" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          <BarChart3 className="h-4 w-4 mr-2" />
          View full report
        </Button>
      </div>

      {/* Dashboard summary cards */}
      {profileData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border-t border-gray-100 dark:border-gray-700">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3 mr-3">
                <FileBarChart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Records</p>
                <p className="text-2xl font-bold">{profileData.row_count.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3 mr-3">
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Columns</p>
                <p className="text-2xl font-bold">{profileData.column_count}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3 mr-3">
                <BarChart3 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Data Completeness</p>
                <p className="text-2xl font-bold">
                  {Object.values(profileData.columns).reduce((acc, col) => acc + col.completeness, 0) / profileData.column_count}%
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

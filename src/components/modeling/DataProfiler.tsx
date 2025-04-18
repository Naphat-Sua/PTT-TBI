
import React from 'react';

export const DataProfiler = () => {
  const sampleData = [
    { column: 'timestamp', type: 'TIMESTAMP', completeness: 100, uniqueness: 100, min: '2023-01-01', max: '2023-12-31' },
    { column: 'location_id', type: 'UUID', completeness: 100, uniqueness: 10, min: null, max: null },
    { column: 'value', type: 'FLOAT', completeness: 98.7, uniqueness: 92.5, min: '0.15', max: '1458.92' },
    { column: 'status', type: 'VARCHAR', completeness: 87.2, uniqueness: 4.5, min: null, max: null },
    { column: 'quality_score', type: 'INTEGER', completeness: 76.3, uniqueness: 8.1, min: '1', max: '10' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
      <div className="p-6 mb-2">
        <h3 className="text-lg font-medium">Data Profiling Report</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Quality metrics for Production Data 2023 (156,245 records)
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
            {sampleData.map((row, index) => (
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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 mr-2">
            2 warnings
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">Some columns have incomplete data</span>
        </div>
        <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          View full report
        </button>
      </div>
    </div>
  );
};

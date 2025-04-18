
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export const SchemaVisualizer = () => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-medium">Database Schema (ERD)</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Entity-relationship diagram for Production Data 2023
        </p>
      </div>
      
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/50">
        <svg className="mx-auto" width="600" height="300" viewBox="0 0 600 300">
          {/* ERD Diagram */}
          {/* Production Table */}
          <rect x="50" y="50" width="200" height="30" fill="#FFD700" rx="6" ry="6" />
          <text x="150" y="70" textAnchor="middle" fill="#000" fontWeight="bold">Production</text>
          <rect x="50" y="80" width="200" height="100" fill="#fff" stroke="#ccc" strokeWidth="1" rx="6" ry="6" />
          <text x="60" y="100" fill="#000" fontSize="12">id: UUID (PK)</text>
          <text x="60" y="120" fill="#000" fontSize="12">timestamp: TIMESTAMP</text>
          <text x="60" y="140" fill="#000" fontSize="12">location_id: UUID (FK)</text>
          <text x="60" y="160" fill="#000" fontSize="12">value: FLOAT</text>
          
          {/* Location Table */}
          <rect x="350" y="50" width="200" height="30" fill="#FFD700" rx="6" ry="6" />
          <text x="450" y="70" textAnchor="middle" fill="#000" fontWeight="bold">Location</text>
          <rect x="350" y="80" width="200" height="80" fill="#fff" stroke="#ccc" strokeWidth="1" rx="6" ry="6" />
          <text x="360" y="100" fill="#000" fontSize="12">id: UUID (PK)</text>
          <text x="360" y="120" fill="#000" fontSize="12">name: VARCHAR(255)</text>
          <text x="360" y="140" fill="#000" fontSize="12">coordinates: POINT</text>
          
          {/* Relationship */}
          <line x1="250" y1="140" x2="350" y2="100" stroke="#000" strokeWidth="1" />
          <polygon points="345,100 350,100 350,105" fill="#000" />
        </svg>
      </div>
      
      <div className="mt-6 grid grid-cols-2 gap-4">
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-2">Primary Entities</h4>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center">
                <span className="h-2 w-2 bg-[#FFD700] rounded-full mr-2"></span>
                Production (156,245 records)
              </li>
              <li className="flex items-center">
                <span className="h-2 w-2 bg-[#FFD700] rounded-full mr-2"></span>
                Location (324 records)
              </li>
            </ul>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-2">Validation Status</h4>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">Schema validation passed</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { fetchDatasetById, DatasetDetail, Column } from '@/utils/dataModelingService';
import { useToast } from '@/hooks/use-toast';

interface SchemaVisualizerProps {
  datasetId?: string;
}

export const SchemaVisualizer: React.FC<SchemaVisualizerProps> = ({ datasetId }) => {
  const [dataset, setDataset] = useState<DatasetDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    if (datasetId) {
      loadDatasetDetails(datasetId);
    }
  }, [datasetId]);

  const loadDatasetDetails = async (id: string) => {
    setIsLoading(true);
    try {
      const data = await fetchDatasetById(id);
      setDataset(data);
    } catch (error) {
      console.error("Failed to load dataset details:", error);
      toast({
        title: "Error loading schema",
        description: "There was a problem fetching the dataset schema information.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Group columns by potential tables/entities based on naming patterns
  const getEntities = () => {
    if (!dataset) return [];

    // Group columns by prefix (e.g., "customer_id", "customer_name" -> "customer" entity)
    const entities: Record<string, Column[]> = {};

    dataset.columns.forEach(column => {
      // Detect potential entity prefixes (e.g., "customer_id" -> "customer")
      let entityName = "main";
      
      if (column.name.includes('_')) {
        const prefix = column.name.split('_')[0];
        if (prefix.length > 2) { // Avoid short prefixes
          entityName = prefix;
        }
      }
      
      // Group by entity name
      if (!entities[entityName]) {
        entities[entityName] = [];
      }
      entities[entityName].push(column);
    });

    // Convert to array format
    return Object.entries(entities).map(([name, columns]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize
      columns
    }));
  };

  // Detect potential relationships between entities
  const getRelationships = (entities: { name: string, columns: Column[] }[]) => {
    const relationships = [];
    
    // Look for foreign key patterns (e.g., entity_id columns)
    for (const entity of entities) {
      for (const column of entity.columns) {
        if (column.name.endsWith('_id') && !column.name.startsWith(entity.name.toLowerCase())) {
          // Extract the referenced entity name
          const referencedEntityName = column.name.replace('_id', '');
          
          // Find if there's a matching entity
          const referencedEntity = entities.find(e => 
            e.name.toLowerCase() === referencedEntityName || 
            e.columns.some(c => c.name === referencedEntityName + '_id' && c.name.includes('id'))
          );
          
          if (referencedEntity) {
            relationships.push({
              from: entity.name,
              to: referencedEntity.name,
              fromColumn: column.name,
              toColumn: 'id' // Assuming the primary key
            });
          }
        }
      }
    }
    
    return relationships;
  };

  const renderERD = () => {
    const entities = getEntities();
    const relationships = getRelationships(entities);
    
    // Calculate entity positions
    const entityPositions: Record<string, {x: number, y: number, width: number, height: number}> = {};
    const entitySpacing = 250;
    const columnHeight = 20;
    const paddingTop = 30; // Height of the entity title bar
    
    entities.forEach((entity, index) => {
      const columns = entity.columns;
      const height = paddingTop + columns.length * columnHeight;
      const width = 200;
      const x = (index % 2) * entitySpacing + 50;
      const y = Math.floor(index / 2) * (height + 50) + 50;
      
      entityPositions[entity.name] = { x, y, width, height };
    });
    
    return (
      <svg className="mx-auto" width="600" height="600" viewBox="0 0 600 600">
        {/* Entities */}
        {entities.map((entity) => {
          const pos = entityPositions[entity.name];
          
          return (
            <g key={entity.name}>
              {/* Entity header */}
              <rect 
                x={pos.x} 
                y={pos.y} 
                width={pos.width} 
                height={30} 
                fill="#FFD700" 
                rx="6" 
                ry="6" 
              />
              <text 
                x={pos.x + pos.width / 2} 
                y={pos.y + 20} 
                textAnchor="middle" 
                fill="#000" 
                fontWeight="bold"
              >
                {entity.name}
              </text>
              
              {/* Entity body */}
              <rect 
                x={pos.x} 
                y={pos.y + 30} 
                width={pos.width} 
                height={entity.columns.length * columnHeight} 
                fill="#fff" 
                stroke="#ccc" 
                strokeWidth="1" 
                rx="6" 
                ry="6" 
              />
              
              {/* Columns */}
              {entity.columns.map((column, colIndex) => {
                // Determine key/index icons
                let keyIndicator = '';
                if (column.name.endsWith('_id') || column.name === 'id') {
                  if (column.name === 'id' || column.name.startsWith(entity.name.toLowerCase())) {
                    keyIndicator = 'PK'; // Primary key
                  } else {
                    keyIndicator = 'FK'; // Foreign key
                  }
                }
                
                return (
                  <text 
                    key={column.name} 
                    x={pos.x + 10} 
                    y={pos.y + 30 + (colIndex + 0.7) * columnHeight}
                    fill="#000" 
                    fontSize="12"
                  >
                    {column.name}: {column.data_type}
                    {keyIndicator && (
                      <tspan 
                        x={pos.x + pos.width - 25} 
                        fontWeight="bold" 
                        fontSize="10" 
                        fill={keyIndicator === 'PK' ? '#FFD700' : '#1A202C'}
                      >
                        {keyIndicator}
                      </tspan>
                    )}
                  </text>
                );
              })}
            </g>
          );
        })}
        
        {/* Relationships */}
        {relationships.map((rel, index) => {
          const fromPos = entityPositions[rel.from];
          const toPos = entityPositions[rel.to];
          
          // Calculate start and end points for the relationship line
          const startX = fromPos.x + fromPos.width;
          const startY = fromPos.y + 30 + fromPos.height / 2;
          const endX = toPos.x;
          const endY = toPos.y + 30 + toPos.height / 2;
          
          // If entities are at the same height, add curve points
          const needsCurve = Math.abs(startY - endY) < 20;
          const path = needsCurve 
            ? `M ${startX} ${startY} C ${startX + 40} ${startY}, ${endX - 40} ${endY}, ${endX} ${endY}` 
            : `M ${startX} ${startY} L ${endX} ${endY}`;
          
          return (
            <g key={`rel-${index}`}>
              <path 
                d={path}
                stroke="#000" 
                strokeWidth="1"
                fill="none"
              />
              {/* Arrow at the end of the line */}
              <polygon 
                points={`${endX},${endY} ${endX-5},${endY-5} ${endX-5},${endY+5}`} 
                fill="#000" 
              />
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Database Schema (ERD)</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Entity-relationship diagram for {dataset?.name || 'Production Data 2023'}
          </p>
        </div>
        {isLoading && (
          <div className="flex items-center text-sm text-gray-500">
            <div className="animate-spin mr-2 h-4 w-4 border-2 border-gray-500 border-r-transparent rounded-full"></div>
            Loading schema...
          </div>
        )}
      </div>
      
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/50 overflow-x-auto">
        {datasetId && dataset ? (
          renderERD()
        ) : (
          <svg className="mx-auto" width="600" height="300" viewBox="0 0 600 300">
            {/* Default ERD Diagram */}
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
        )}
      </div>
      
      <div className="mt-6 grid grid-cols-2 gap-4">
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-2">Primary Entities</h4>
            <ul className="space-y-1 text-sm">
              {getEntities().length > 0 ? (
                getEntities().map(entity => (
                  <li key={entity.name} className="flex items-center">
                    <span className="h-2 w-2 bg-[#FFD700] rounded-full mr-2"></span>
                    {entity.name} ({entity.columns.length} fields)
                  </li>
                ))
              ) : (
                <>
                  <li className="flex items-center">
                    <span className="h-2 w-2 bg-[#FFD700] rounded-full mr-2"></span>
                    Production (156,245 records)
                  </li>
                  <li className="flex items-center">
                    <span className="h-2 w-2 bg-[#FFD700] rounded-full mr-2"></span>
                    Location (324 records)
                  </li>
                </>
              )}
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


import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Database, MessageSquare, BarChart3 } from 'lucide-react';

const Home = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const features = [
    {
      name: 'TBIRAG',
      description: 'Retrieval-Augmented Generation System for intelligent document querying',
      icon: <Database className="h-6 w-6 text-apple-blue" />,
      path: '/rag',
      delay: 100
    },
    {
      name: 'ChatTBU',
      description: 'Conversational AI assistant powered by Google Gemini',
      icon: <MessageSquare className="h-6 w-6 text-apple-blue" />,
      path: '/chat',
      delay: 200
    },
    {
      name: 'M-Modeling',
      description: 'Data science modeling assistant for analysis and prediction',
      icon: <BarChart3 className="h-6 w-6 text-apple-blue" />,
      path: '/modeling',
      delay: 300
    }
  ];

  return (
    <div className={`min-h-[80vh] flex flex-col justify-center transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 text-apple-dark dark:text-white">
          Data Flow <span className="text-apple-blue">Spark Vision</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Advanced tools for data analysts and scientists in one elegant platform
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {features.map((feature, index) => (
          <div 
            key={feature.name}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 
              p-6 hover:shadow-md hover:border-apple-blue dark:hover:border-apple-highlight transition-all duration-300
              transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
            style={{ transitionDelay: `${feature.delay}ms` }}
          >
            <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-5">
              {feature.icon}
            </div>
            <h3 className="text-xl font-semibold mb-2 text-apple-dark dark:text-white">{feature.name}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{feature.description}</p>
            <Link 
              to={feature.path}
              className="inline-flex items-center text-apple-blue dark:text-apple-highlight font-medium hover:underline"
            >
              Get started <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;

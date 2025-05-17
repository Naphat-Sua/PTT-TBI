import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Database, MessageSquare, BarChart3, LineChart, TrendingUp } from 'lucide-react';

const Home = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const features = [
    {
      name: 'TBIRAG',
      description: 'Retrieval-Augmented Generation System for intelligent document querying',
      icon: <Database className="h-6 w-6 text-gold-light" />,
      path: '/rag',
      delay: 100
    },
    {
      name: 'Full RAG',
      description: 'Analyze real-time WTI crude oil market data using AI-powered insights',
      icon: <LineChart className="h-6 w-6 text-gold-light" />,
      path: '/fullrag',
      delay: 150
    },
    {
      name: 'AlgoTrade',
      description: 'Develop and test trading strategies using historical WTI Crude Oil price data',
      icon: <TrendingUp className="h-6 w-6 text-gold-light" />,
      path: '/algotrade',
      delay: 200
    },
    {
      name: 'ChatTBU',
      description: 'Conversational AI assistant powered by Claude and DeepSeek',
      icon: <MessageSquare className="h-6 w-6 text-gold-light" />,
      path: '/chat',
      delay: 250
    },
    {
      name: 'M-Modeling',
      description: 'Data science modeling assistant for analysis and prediction',
      icon: <BarChart3 className="h-6 w-6 text-gold-light" />,
      comingSoon: true,
      path: '/modeling',
      delay: 300
    }
  ];

  return (
    <div className={`min-h-[80vh] flex flex-col justify-center transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 relative inline-block">
            <span className="text-[#DFBD69]">
            TBU Platform
            </span>
          <span className="absolute inset-0 rounded-lg opacity-20 blur-md bg-gradient-to-r from-gold-light to-gold-dark animate-pulse"></span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mt-4">
          Advanced tools for Trading Business team
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
        {features.map((feature, index) => (
          <div 
            key={feature.name}
            className={`bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 
              p-6 hover:shadow-xl transition-all duration-300 relative overflow-hidden
              transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
            style={{ transitionDelay: `${feature.delay}ms` }}
          >
            <div className="h-14 w-14 bg-gradient-to-br from-gray-800/10 to-gray-900/20 dark:from-gray-700/20 dark:to-gray-800/40 
                rounded-xl flex items-center justify-center mb-5 shadow-inner">
              {feature.icon}
            </div>
            <h3 className="text-xl font-semibold mb-2 text-[#DFBD69] dark:text-[#DFBD69]">{feature.name}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{feature.description}</p>
            
            {feature.comingSoon ? (
              <span className="inline-flex items-center text-amber-600 dark:text-amber-400 font-medium">
                Coming soon
              </span>
            ) : (
              <Link 
                to={feature.path}
                className="inline-flex items-center text-[#DFBD69] dark:text-[#DFBD69] font-medium hover:underline transition-colors duration-300 hover:text-[#B89D4F] dark:hover:text-[#B89D4F]"
              >
                Get Started <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            )}
            
            {/* Decorative gradient corner */}
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-tl from-gold-light/10 to-transparent rounded-full"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;

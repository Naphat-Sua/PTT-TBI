
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="mb-8">
        <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-red-500 dark:text-red-400 text-5xl font-bold">404</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Page Not Found</h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      
      <Link 
        to="/" 
        className="flex items-center text-apple-blue dark:text-apple-highlight hover:underline"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Home
      </Link>
    </div>
  );
};

export default NotFound;

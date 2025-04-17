
import React from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-apple-light dark:bg-apple-dark">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
      <footer className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 py-6">
        <div className="container mx-auto px-4 sm:px-6">
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Data Flow Spark Vision. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

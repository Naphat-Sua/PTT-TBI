
import React from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 transition-colors duration-300">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 py-8 animate-fade-in">
        {children}
      </main>
      <footer className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 py-6 transition-all duration-300 shadow-md rounded-t-xl mx-4">
        <div className="container mx-auto px-4 sm:px-6">
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} PTT Data Center. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

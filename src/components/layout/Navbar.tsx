
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'TBIRAG', path: '/rag' },
    { name: 'ChatTBU', path: '/chat' },
    { name: 'M-Modeling', path: '/modeling' }
  ];

  const isActiveRoute = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo and App Name */}
          <Link to="/" className="flex items-center space-x-2 group">
            <span className="font-semibold text-xl relative overflow-hidden">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FFD700] to-[#FF8C00] animate-shimmer inline-block">
                PTT Data Center
              </span>
              <span className="absolute inset-0 rounded-md opacity-20 blur-sm bg-gradient-to-r from-[#FFD700] to-[#FF8C00] animate-pulse"></span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link 
                key={item.path}
                to={item.path}
                className={`font-medium text-sm rounded-full px-4 py-2 transition-all duration-200 ${
                  isActiveRoute(item.path) 
                    ? 'text-white bg-gradient-to-r from-[#FFD700]/90 to-[#FF8C00]/90 shadow-md' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Mobile menu button */}
          <button 
            className="md:hidden text-gray-600 dark:text-gray-300 hover:text-apple-blue dark:hover:text-apple-highlight"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 animate-fade-in rounded-b-2xl shadow-lg">
          <div className="px-4 pt-2 pb-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block py-2 px-4 rounded-xl text-base font-medium ${
                  isActiveRoute(item.path)
                    ? 'bg-gradient-to-r from-[#FFD700]/90 to-[#FF8C00]/90 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                } transition-colors duration-200`}
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;

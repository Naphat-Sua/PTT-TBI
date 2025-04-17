
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
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-apple-dark/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo and App Name */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-apple-blue dark:text-apple-highlight font-semibold text-xl">Data Flow</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link 
                key={item.path}
                to={item.path}
                className={`font-medium text-sm ${
                  isActiveRoute(item.path) 
                    ? 'text-apple-blue dark:text-apple-highlight' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-apple-blue dark:hover:text-apple-highlight'
                } transition-colors duration-200`}
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
        <div className="md:hidden bg-white dark:bg-apple-dark border-b border-gray-200 dark:border-gray-800 animate-fade-in">
          <div className="px-4 pt-2 pb-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block py-2 px-3 rounded-md text-base font-medium ${
                  isActiveRoute(item.path)
                    ? 'bg-gray-100 dark:bg-gray-800 text-apple-blue dark:text-apple-highlight'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-apple-blue dark:hover:text-apple-highlight'
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

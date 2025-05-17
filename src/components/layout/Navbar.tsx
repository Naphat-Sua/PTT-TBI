import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'TBIRAG', path: '/rag' },
    { name: 'Full RAG', path: '/fullrag' },
    { name: 'AlgoTrade', path: '/algotrade' },
    { name: 'ChatTBU', path: '/chat' },
    { name: 'M-Modeling', path: '/modeling' }
  ];

  const isActiveRoute = (path: string) => location.pathname === path;

  return (
    <div className="sticky top-4 z-50 w-full px-4">
      <header className="rounded-3xl bg-white/80 dark:bg-gray-900/90 backdrop-blur-md border border-gray-100 dark:border-gray-800 shadow-lg">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo and App Name */}
            <Link to="/" className="flex items-center space-x-2 group ml-4">
            <img 
              src="/pttgold-removebg-preview.png" 
              alt="PTT Logo" 
              className="h-24 w-auto"
            />
            <span className="text-xl font-bold text-[#DFBD69] dark:text-[#DFBD69] ml-2 relative bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] bg-clip-text text-transparent">
              <span className="absolute inset-0 text-black opacity-5 translate-x-[1px] translate-y-[1px] z-[-1]">
              Trading Business Intelligence
              </span>
              Trading Business Intelligence
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
                    ? 'text-white bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] shadow-md'
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
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 animate-fade-in rounded-b-3xl shadow-inner">
          <div className="px-4 pt-2 pb-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block py-2 px-4 rounded-xl text-base font-medium ${
                  isActiveRoute(item.path)
                    ? 'bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] text-white shadow-md'
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
    </div>
  );
};

export default Navbar;

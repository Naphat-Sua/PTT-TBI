import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { cn } from '@/lib/utils';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-[6rem] right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center
        hover:shadow-xl transition-all duration-300 transform hover:scale-105
        bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] text-white"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {theme === 'light' ? (
        <Moon className="h-6 w-6" />
      ) : (
        <Sun className="h-6 w-6" />
      )}
    </button>
  );
};
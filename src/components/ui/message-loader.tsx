
import React from 'react';
import { cn } from "@/lib/utils";

interface MessageLoaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'muted';
}

const MessageLoader: React.FC<MessageLoaderProps> = ({ 
  className, 
  size = 'md',
  color = 'primary'
}) => {
  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5'
  };

  const dotColors = {
    primary: 'bg-apple-blue dark:bg-apple-highlight',
    secondary: 'bg-gray-500 dark:bg-gray-400',
    muted: 'bg-gray-400 dark:bg-gray-600'
  };
  
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div 
        className={cn(
          "rounded-full animate-bounce shadow-sm", 
          dotSizes[size], 
          dotColors[color]
        )} 
        style={{ animationDelay: "0ms", animationDuration: "0.6s" }} 
      />
      <div 
        className={cn(
          "rounded-full animate-bounce shadow-sm", 
          dotSizes[size], 
          dotColors[color]
        )} 
        style={{ animationDelay: "150ms", animationDuration: "0.6s" }} 
      />
      <div 
        className={cn(
          "rounded-full animate-bounce shadow-sm", 
          dotSizes[size], 
          dotColors[color]
        )} 
        style={{ animationDelay: "300ms", animationDuration: "0.6s" }} 
      />
    </div>
  );
};

export default MessageLoader;


import React from 'react';
import { cn } from "@/lib/utils";

interface MessageLoaderProps {
  className?: string;
}

const MessageLoader: React.FC<MessageLoaderProps> = ({ className }) => {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="w-2 h-2 rounded-full bg-apple-blue dark:bg-apple-highlight animate-bounce" style={{ animationDelay: "0ms" }} />
      <div className="w-2 h-2 rounded-full bg-apple-blue dark:bg-apple-highlight animate-bounce" style={{ animationDelay: "100ms" }} />
      <div className="w-2 h-2 rounded-full bg-apple-blue dark:bg-apple-highlight animate-bounce" style={{ animationDelay: "200ms" }} />
    </div>
  );
};

export default MessageLoader;

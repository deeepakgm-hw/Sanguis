import React from "react";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Loader({ size = "md", className = "" }: LoaderProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-[3px]",
    lg: "h-12 w-12 border-4",
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div 
        className={`animate-spin rounded-full border-t-primary border-r-transparent border-b-transparent border-l-transparent ${sizeClasses[size]}`} 
      />
      <div 
        className={`absolute animate-ping rounded-full bg-primary/10 ${
          size === "sm" ? "h-6 w-6" : size === "md" ? "h-12 w-12" : "h-20 w-20"
        }`} 
      />
    </div>
  );
}

export function PageLoader({ message = "Loading secure context..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md">
      <Loader size="lg" />
      <p className="mt-4 text-sm font-semibold tracking-wider text-muted-foreground animate-pulse">
        {message}
      </p>
    </div>
  );
}

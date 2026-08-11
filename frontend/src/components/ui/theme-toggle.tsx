"use client";

import React from "react";
import { useTheme } from "@/components/providers/theme-provider";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "./button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/60 border border-border/80 rounded-full shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setTheme("light")}
        className={`p-1.5 h-8 w-8 rounded-full transition-all duration-200 ${
          theme === "light"
            ? "bg-background text-foreground shadow-sm scale-105 hover:bg-background"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Light mode"
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setTheme("dark")}
        className={`p-1.5 h-8 w-8 rounded-full transition-all duration-200 ${
          theme === "dark"
            ? "bg-background text-foreground shadow-sm scale-105 hover:bg-background"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Dark mode"
      >
        <Moon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setTheme("system")}
        className={`p-1.5 h-8 w-8 rounded-full transition-all duration-200 ${
          theme === "system"
            ? "bg-background text-foreground shadow-sm scale-105 hover:bg-background"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="System theme"
      >
        <Monitor className="h-4 w-4" />
      </Button>
    </div>
  );
}

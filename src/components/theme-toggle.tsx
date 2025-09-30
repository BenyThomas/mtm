"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export const ThemeToggle = ({
  isCollapsed = false,
}: {
  isCollapsed?: boolean;
}) => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const getIcon = () => {
    if (theme === "system")
      return (
        <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
          <Monitor className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </div>
      );
    return resolvedTheme === "dark" ? (
      <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
        <Moon className="h-4 w-4 text-gray-700 dark:text-gray-300" />
      </div>
    ) : (
      <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
        <Sun className="h-4 w-4 text-gray-700 dark:text-gray-300" />
      </div>
    );
  };

  const getLabel = () => {
    switch (theme) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      case "system":
        return "System";
      default:
        return "Theme";
    }
  };

  if (isCollapsed) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-fit justify-center px-2 py-2 hover:bg-transparent"
        onClick={() => {
          const nextTheme =
            theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
          setTheme(nextTheme);
        }}
      >
        {getIcon()}
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-fit justify-start px-3 py-2 text-sm font-medium transition-colors",
            "text-gray-700 dark:text-gray-300 hover:bg-transparent hover:text-gray-900 dark:hover:text-white hover:ease-in-out duration-150"
          )}
        >
          {getIcon()}
          <span className="ml-3">{getLabel()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={cn(
            "flex items-center gap-2",
            theme === "light" && "bg-accent"
          )}
        >
          <Sun className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={cn(
            "flex items-center gap-2",
            theme === "dark" && "bg-accent"
          )}
        >
          <Moon className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={cn(
            "flex items-center gap-2",
            theme === "system" && "bg-accent"
          )}
        >
          <Monitor className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

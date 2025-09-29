"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { setCookie, getCookie, deleteCookie } from "cookies-next";

/**
 * Modern Theme Context for Next.js with TypeScript support
 * Handles dark/light/system theme switching with cookie persistence
 */

// Types
type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
}

interface ThemeActions {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  cycleTheme: () => void;
}

type ThemeContextType = ThemeState & ThemeActions;

// Context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Utility functions
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === "undefined") return "light";

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const getStoredTheme = (): Theme => {
  if (typeof window === "undefined") return "system";

  const stored = getCookie("theme") as Theme;
  return stored || "system";
};

const resolveTheme = (
  theme: Theme,
  systemTheme: ResolvedTheme
): ResolvedTheme => {
  return theme === "system" ? systemTheme : theme;
};

const applyTheme = (resolvedTheme: ResolvedTheme): void => {
  if (typeof window === "undefined") return;

  const root = document.documentElement;

  // Remove existing theme classes
  root.classList.remove("light", "dark");

  // Add new theme class
  root.classList.add(resolvedTheme);

  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      "content",
      resolvedTheme === "dark" ? "#0f172a" : "#ffffff"
    );
  }
};

// ThemeProvider Component
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = "system",
  storageKey = "theme",
  enableSystem = true,
  disableTransitionOnChange = false,
}) => {
  // State management
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    return getStoredTheme();
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const [mounted, setMounted] = useState(false);

  // Computed values
  const resolvedTheme = useMemo(
    () => resolveTheme(theme, systemTheme),
    [theme, systemTheme]
  );

  // Handle system theme changes
  useEffect(() => {
    if (!enableSystem) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [enableSystem]);

  // Apply theme to DOM
  useEffect(() => {
    if (!mounted) return;

    if (disableTransitionOnChange) {
      const style = document.createElement("style");
      style.textContent = `
        *, *::before, *::after {
          transition: none !important;
          animation-duration: 0.01ms !important;
          animation-delay: 0.01ms !important;
        }
      `;
      document.head.appendChild(style);

      applyTheme(resolvedTheme);

      // Remove the style after a short delay
      setTimeout(() => {
        document.head.removeChild(style);
      }, 1);
    } else {
      applyTheme(resolvedTheme);
    }
  }, [resolvedTheme, mounted, disableTransitionOnChange]);

  // Handle mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Theme actions
  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);

      if (typeof window !== "undefined") {
        if (newTheme === "system") {
          deleteCookie(storageKey);
        } else {
          setCookie(storageKey, newTheme, {
            maxAge: 60 * 60 * 24 * 365, // 1 year
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
          });
        }
      }
    },
    [storageKey]
  );

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
  }, [theme, setTheme]);

  const cycleTheme = useCallback(() => {
    const themeCycle: Theme[] = ["light", "dark", "system"];
    const currentIndex = themeCycle.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeCycle.length;
    setTheme(themeCycle[nextIndex]);
  }, [theme, setTheme]);

  // Memoized context value
  const contextValue = useMemo<ThemeContextType>(
    () => ({
      theme,
      resolvedTheme,
      systemTheme,
      setTheme,
      toggleTheme,
      cycleTheme,
    }),
    [theme, resolvedTheme, systemTheme, setTheme, toggleTheme, cycleTheme]
  );

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <ThemeContext.Provider value={contextValue}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for using theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};

// Export types for external use
export type {
  Theme,
  ResolvedTheme,
  ThemeContextType,
  ThemeState,
  ThemeActions,
};

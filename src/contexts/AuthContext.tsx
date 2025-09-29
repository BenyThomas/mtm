"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { ToastAlert } from "@/components/shared/toast";
import api from "@/lib/api";
import { AxiosError } from "axios";
import { setCookie, deleteCookie, getCookie } from "cookies-next";

/**
 * Modern AuthContext for Next.js with TypeScript support
 * Handles authentication state, user management, and session persistence
 */

// Types
interface User {
  username: string;
  officeName: string;
  staffDisplayName: string;
  roles: string[];
  permissions: string;
}

interface AuthState {
  isAuthenticated: boolean;
  checking: boolean;
  tenant: string;
  user: User;
}

interface AuthActions {
  login: (
    username: string,
    password: string,
    remember: boolean,
    tenantInput?: string
  ) => Promise<void>;
  logout: () => void;
  switchTenant: (tenant: string) => void;
}

type AuthContextType = AuthState & AuthActions;

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Utility functions
const clearCredentials = (): void => {
  if (typeof window === "undefined") return;

  const keys = [
    "fineract_auth_key",
    "fineract_username",
    "fineract_user",
    "fineract_tenant",
  ];

  keys.forEach((key) => {
    deleteCookie(key);
  });
};

const hasValidAuth = (): boolean => {
  if (typeof window === "undefined") return false;

  return !!(getCookie("fineract_auth_key") && getCookie("fineract_username"));
};

const getStoredUser = (): User => {
  if (typeof window === "undefined") return {} as User;

  try {
    const stored = getCookie("fineract_user");
    return stored ? JSON.parse(stored as string) : ({} as User);
  } catch {
    return {} as User;
  }
};

const getStoredTenant = (): string => {
  if (typeof window === "undefined") return "default";

  return (
    (getCookie("fineract_tenant") as string) ||
    process.env.NEXT_PUBLIC_TENANT ||
    "default"
  );
};

// AuthProvider Component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const router = useRouter();

  // State management
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(hasValidAuth);
  const [checking, setChecking] = useState<boolean>(false);
  const [tenant, setTenant] = useState<string>(getStoredTenant);
  const [user, setUser] = useState<User>(getStoredUser);

  // Handle unauthorized events
  useEffect(() => {
    const handleUnauthorized = (): void => {
      clearCredentials();
      setIsAuthenticated(false);
      setUser({} as User);
      ToastAlert.show({
        message: "Session expired. Please sign in again.",
        duration: 5000,
      });
      router.replace("/");
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [router]);

  // Tenant switching
  const switchTenant = useCallback((newTenant: string): void => {
    const trimmedTenant = (newTenant || "").trim() || "default";
    setTenant(trimmedTenant);

    if (typeof window !== "undefined") {
      setCookie("fineract_tenant", trimmedTenant, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    }
  }, []);

  // Login function with improved error handling
  const login = useCallback(
    async (
      username: string,
      password: string,
      remember: boolean,
      tenantInput?: string
    ): Promise<void> => {
      setChecking(true);
      setIsAuthenticated(false);
      setUser({} as User);
      clearCredentials();

      const targetTenant = (tenantInput || tenant || "default").trim();

      if (typeof window !== "undefined") {
        setCookie("fineract_tenant", targetTenant, {
          maxAge: 60 * 60 * 24 * 30, // 30 days
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });
      }
      setTenant(targetTenant);

      try {
        const response = await api.post(
          "/authentication?returnClientList=false",
          {
            username: username.trim(),
            password,
          }
        );

        if (
          !response?.data?.authenticated ||
          !response?.data?.base64EncodedAuthenticationKey
        ) {
          throw new Error("Authentication failed - invalid credentials");
        }

        const authKey = response.data.base64EncodedAuthenticationKey;

        if (typeof window !== "undefined") {
          // Set authentication cookies
          const cookieOptions = {
            maxAge: remember ? 60 * 60 * 24 * 30 : undefined, // 30 days or session
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax" as const,
          };

          setCookie("fineract_auth_key", authKey, cookieOptions);
          setCookie("fineract_username", username.trim(), cookieOptions);

          // Store user info
          const userData = {
            username: response.data.username,
            officeName: response.data.officeName,
            staffDisplayName: response.data.staffDisplayName,
            roles: response.data.roles || [],
            permissions: response.data.permissions || "",
          };

          setCookie("fineract_user", JSON.stringify(userData), cookieOptions);
          setUser(userData);
        }

        setIsAuthenticated(true);
        ToastAlert.success("Welcome back!");
        router.replace("/dashboard");
      } catch (error: unknown) {
        clearCredentials();

        const axiosError = error as AxiosError<{
          developerMessage?: string;
          httpStatusCode?: string;
          defaultUserMessage?: string;
          userMessageGlobalisationCode?: string;
        }>;

        const errorMessage =
          axiosError?.response?.data?.developerMessage ||
          axiosError?.response?.data?.defaultUserMessage ||
          axiosError?.message ||
          "Invalid username or password";

        throw new Error(errorMessage);
      } finally {
        setChecking(false);
      }
    },
    [tenant, router]
  );

  // Logout function
  const logout = useCallback((): void => {
    clearCredentials();
    setIsAuthenticated(false);
    setUser({} as User);
    ToastAlert.success("Signed out successfully");
    router.replace("/");
  }, [router]);

  // Memoized context value
  const contextValue = useMemo<AuthContextType>(
    () => ({
      isAuthenticated,
      checking,
      tenant,
      user,
      login,
      logout,
      switchTenant,
    }),
    [isAuthenticated, checking, tenant, user, login, logout, switchTenant]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

// Export types for external use
export type { AuthContextType, User, AuthState, AuthActions };

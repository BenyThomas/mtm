"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { apiClient, endpoints } from "@/lib/api";
import { toast } from "react-hot-toast";
import { AuthContextType, User, AuthResponse } from "@/types";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthContext using Fineract /authentication endpoint.
 * Stores base64 auth key returned by the server and uses it for subsequent requests.
 */

const clearCredentials = () => {
  if (typeof window === "undefined") return;

  localStorage.removeItem("fineract_auth_key");
  localStorage.removeItem("fineract_username");
  localStorage.removeItem("fineract_user");
  sessionStorage.removeItem("fineract_auth_key");
  sessionStorage.removeItem("fineract_username");
};

const hasAuth = (): boolean => {
  if (typeof window === "undefined") return false;

  return !!(
    localStorage.getItem("fineract_auth_key") ||
    sessionStorage.getItem("fineract_auth_key")
  );
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const router = useRouter();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(false);
  const [tenant, setTenant] = useState<string>("default");
  const [user, setUser] = useState<User>({} as User);

  // Initialize auth state from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedTenant =
      localStorage.getItem("fineract_tenant") ||
      process.env.NEXT_PUBLIC_TENANT ||
      "default";
    setTenant(storedTenant);

    const storedUser = localStorage.getItem("fineract_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // Invalid JSON, clear it
        localStorage.removeItem("fineract_user");
      }
    }

    setIsAuthenticated(hasAuth());
  }, []);

  // When axios emits 401, force logout
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleUnauthorized = () => {
      clearCredentials();
      setIsAuthenticated(false);
      setUser({} as User);
      toast.error("Session expired. Please sign in again.");
      router.push("/login");
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [router]);

  const switchTenant = useCallback((newTenant: string) => {
    const t = (newTenant || "").trim() || "default";
    setTenant(t);
    if (typeof window !== "undefined") {
      localStorage.setItem("fineract_tenant", t);
    }
  }, []);

  /**
   * Login via Fineract /authentication
   * Stores auth key (base64 user:pass). No password is stored in plain text.
   */
  const login = useCallback(
    async (
      username: string,
      password: string,
      remember: boolean,
      tenantInput?: string
    ) => {
      setChecking(true);
      setIsAuthenticated(false);
      setUser({} as User);
      clearCredentials();

      const t = (tenantInput || tenant || "default").trim();
      if (typeof window !== "undefined") {
        localStorage.setItem("fineract_tenant", t);
      }
      setTenant(t);

      try {
        // Use a direct axios call that still carries tenant header (set by interceptor)
        const response = await apiClient.post<AuthResponse>(
          endpoints.authentication,
          {
            username: username.trim(),
            password,
            returnClientList: false,
          }
        );

        if (
          !response?.authenticated ||
          !response?.base64EncodedAuthenticationKey
        ) {
          throw new Error("Authentication failed");
        }

        const authKey = response.base64EncodedAuthenticationKey; // base64(username:password)
        if (typeof window !== "undefined") {
          const targetStore = remember ? localStorage : sessionStorage;
          targetStore.setItem("fineract_auth_key", authKey);
          targetStore.setItem("fineract_username", username.trim());

          // Save some display info (office, roles, etc.) in localStorage for header badge
          const userData = {
            username: response.username,
            officeName: response.officeName,
            staffDisplayName: response.staffDisplayName,
            roles: response.roles || [],
            permissions: response.permissions || "",
          };

          localStorage.setItem("fineract_user", JSON.stringify(userData));
          setUser(userData);
        }

        setIsAuthenticated(true);
        toast.success("Welcome back");
        router.push("/");
      } catch (error: any) {
        clearCredentials();
        const message =
          error?.response?.data?.errors?.[0]?.defaultUserMessage ||
          error?.response?.data?.defaultUserMessage ||
          error?.message ||
          "Invalid username or password";
        throw new Error(message);
      } finally {
        setChecking(false);
      }
    },
    [tenant, router]
  );

  const logout = useCallback(() => {
    clearCredentials();
    setIsAuthenticated(false);
    setUser({} as User);
    toast.success("Signed out");
    router.push("/login");
  }, [router]);

  const value: AuthContextType = useMemo(
    () => ({
      isAuthenticated,
      checking,
      tenant,
      user,
      switchTenant,
      login,
      logout,
    }),
    [isAuthenticated, checking, tenant, user, switchTenant, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

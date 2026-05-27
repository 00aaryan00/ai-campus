import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { authApi, tenantSession } from "../services/api";

type Role = "student" | "faculty" | "hod" | "institution_admin";

type AppUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  enrollmentNumber?: string | null;
};

type LoginInput = {
  tenantSlug: string;
  email: string;
  password: string;
};

type SignupRequestInput = {
  tenantSlug: string;
  role: "student" | "faculty" | "hod";
  name: string;
  email: string;
  department?: string;
  enrollmentNumber?: string;
};

interface AuthContextType {
  user: AppUser | null;
  role: Role | null;
  token: string | null;
  tenantSlug: string | null;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<{ role: Role }>;
  signupRequest: (input: SignupRequestInput) => Promise<{ message: string; devGeneratedPassword?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

const AUTH_TOKEN_KEY = "authToken";
const AUTH_USER_KEY = "authUser";
const AUTH_ROLE_KEY = "role";
const AUTH_TENANT_KEY = "activeTenantSlug";

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    const stored = localStorage.getItem(AUTH_USER_KEY);
    return stored ? (JSON.parse(stored) as AppUser) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [tenantSlug, setTenantSlug] = useState<string | null>(() => localStorage.getItem(AUTH_TENANT_KEY));

  useEffect(() => {
    const hydrate = async () => {
      if (!token || !tenantSlug) {
        return;
      }

      try {
        const profile = await authApi.me(token, tenantSlug);
        const hydratedUser: AppUser = {
          id: profile.user.id,
          name: profile.user.name,
          email: profile.user.email,
          role: profile.user.role,
          department: profile.user.department,
          enrollmentNumber: profile.user.enrollmentNumber,
        };

        setUser(hydratedUser);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(hydratedUser));
        localStorage.setItem(AUTH_ROLE_KEY, hydratedUser.role);
      } catch {
        setUser(null);
        setToken(null);
        setTenantSlug(null);
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        localStorage.removeItem(AUTH_ROLE_KEY);
        localStorage.removeItem(AUTH_TENANT_KEY);
      }
    };

    hydrate();
  }, [tenantSlug, token]);

  const login = async ({ tenantSlug: tenant, email, password }: LoginInput) => {
    const response = await authApi.login(tenant, { email, password });

    const backendUser: AppUser = {
      id: response.user.id,
      name: response.user.name,
      email: response.user.email,
      role: response.user.role,
      department: response.user.department,
      enrollmentNumber: response.user.enrollmentNumber,
    };

    setUser(backendUser);
    setToken(response.token);
    setTenantSlug(tenant);
    localStorage.setItem(AUTH_TOKEN_KEY, response.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(backendUser));
    localStorage.setItem(AUTH_ROLE_KEY, backendUser.role);
    localStorage.setItem(AUTH_TENANT_KEY, tenant);
    tenantSession.setActiveTenantSlug(tenant);
    return { role: backendUser.role };
  };

  const signupRequest = async (input: SignupRequestInput) => {
    const response = await authApi.signupRequest(input.tenantSlug, {
      role: input.role,
      name: input.name,
      email: input.email,
      department: input.department,
      enrollmentNumber: input.enrollmentNumber,
    });

    tenantSession.setActiveTenantSlug(input.tenantSlug);
    localStorage.setItem(AUTH_TENANT_KEY, input.tenantSlug);
    setTenantSlug(input.tenantSlug);

    return {
      message: response.message,
      devGeneratedPassword: response.devGeneratedPassword,
    };
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_ROLE_KEY);
    localStorage.removeItem("hodBranch");
  };

  const value = useMemo(
    () => ({
      user,
      role: user?.role || null,
      token,
      tenantSlug,
      isAuthenticated: Boolean(user),
      login,
      signupRequest,
      logout,
    }),
    [token, tenantSlug, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

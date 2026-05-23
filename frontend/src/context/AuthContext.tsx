import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { authApi } from "../services/api";

type Role = "student" | "faculty" | "hod" | "principal";

type AppUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  isDemo?: boolean;
};

type LoginInput = {
  email: string;
  password: string;
  selectedRole: Role;
};

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role: Role;
  department?: string;
};

interface AuthContextType {
  user: AppUser | null;
  role: Role | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

const AUTH_TOKEN_KEY = "authToken";
const AUTH_USER_KEY = "authUser";
const AUTH_ROLE_KEY = "role";

const principalDemoCreds = {
  email: "principal@demo.com",
  password: "principal123",
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    const stored = localStorage.getItem(AUTH_USER_KEY);
    return stored ? (JSON.parse(stored) as AppUser) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));

  useEffect(() => {
    const hydrate = async () => {
      if (!token) {
        return;
      }

      try {
        const profile = await authApi.me(token);
        const hydratedUser: AppUser = {
          id: profile.user.id,
          name: profile.user.name,
          email: profile.user.email,
          role: profile.user.role,
          department: profile.user.department,
        };

        setUser(hydratedUser);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(hydratedUser));
        localStorage.setItem(AUTH_ROLE_KEY, hydratedUser.role);
      } catch {
        setUser(null);
        setToken(null);
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        localStorage.removeItem(AUTH_ROLE_KEY);
      }
    };

    hydrate();
  }, [token]);

  const login = async ({ email, password, selectedRole }: LoginInput) => {
    if (selectedRole === "principal") {
      if (
        email.toLowerCase() !== principalDemoCreds.email ||
        password !== principalDemoCreds.password
      ) {
        throw new Error("Use principal demo credentials to continue");
      }

      const demoPrincipal: AppUser = {
        id: "principal-demo",
        name: "Principal Demo",
        email: principalDemoCreds.email,
        role: "principal",
        isDemo: true,
      };

      setUser(demoPrincipal);
      setToken(null);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(demoPrincipal));
      localStorage.setItem(AUTH_ROLE_KEY, "principal");
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return;
    }

    const response = await authApi.login({ email, password });

    if (response.user.role !== selectedRole) {
      throw new Error(`This account is registered as ${response.user.role}, not ${selectedRole}`);
    }

    const backendUser: AppUser = {
      id: response.user.id,
      name: response.user.name,
      email: response.user.email,
      role: response.user.role,
      department: response.user.department,
    };

    setUser(backendUser);
    setToken(response.token);
    localStorage.setItem(AUTH_TOKEN_KEY, response.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(backendUser));
    localStorage.setItem(AUTH_ROLE_KEY, backendUser.role);
  };

  const register = async ({ name, email, password, role, department }: RegisterInput) => {
    if (role === "principal") {
      throw new Error("Principal registration is demo-only in this frontend for now");
    }

    const response = await authApi.register({
      name,
      email,
      password,
      role,
      department,
    });

    const backendUser: AppUser = {
      id: response.user.id,
      name: response.user.name,
      email: response.user.email,
      role: response.user.role,
      department: response.user.department,
    };

    setUser(backendUser);
    setToken(response.token);
    localStorage.setItem(AUTH_TOKEN_KEY, response.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(backendUser));
    localStorage.setItem(AUTH_ROLE_KEY, backendUser.role);
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
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [token, user]
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

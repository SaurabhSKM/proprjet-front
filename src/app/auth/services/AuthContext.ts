import { createContext } from "react";
import type Keycloak from "keycloak-js";

export interface AuthContextType {
  keycloak: Keycloak;
  initializing: boolean;
  authenticated: boolean;
  token?: string;
  username?: string | null;
  roles: string[];
  isAdmin: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

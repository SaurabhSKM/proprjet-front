import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import Keycloak from "keycloak-js";
import { AuthContext } from "./AuthContext";

// 🔹 Variable globale pour empêcher plusieurs initialisations
let keycloakInstance: Keycloak | null = null;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const keycloak = useMemo(() => {
    if (!keycloakInstance) {
      keycloakInstance = new Keycloak("/keycloak.json");
    }
    return keycloakInstance;
  }, []);

  const [initializing, setInitializing] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [token, setToken] = useState<string | undefined>();
  const [username, setUsername] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    // Si déjà initialisé, ne refait pas init()
    if ((keycloak as { initialized?: boolean }).initialized) return;
    (keycloak as { initialized?: boolean }).initialized = true;

    let refreshInterval: ReturnType<typeof setInterval> | undefined;

    keycloak
      .init({
        responseMode: "fragment",
        checkLoginIframe: false,
      })
      .then((auth) => {
        setAuthenticated(auth);
        setInitializing(false);

        if (auth) {
          setToken(keycloak.token);
          setUsername(keycloak.tokenParsed?.preferred_username || null);
          const tokenRoles = (keycloak.tokenParsed as Record<string, unknown> | undefined)
            ?.realm_access as { roles?: string[] } | undefined
          setRoles(tokenRoles?.roles ?? []);

          const runRefresh = () => {
            keycloak
              .updateToken(60)
              .then((refreshed) => {
                if (refreshed) {
                  setToken(keycloak.token);
                  const r = (keycloak.tokenParsed as Record<string, unknown> | undefined)
                    ?.realm_access as { roles?: string[] } | undefined
                  setRoles(r?.roles ?? []);
                }
              })
              .catch(() => {
                // Only redirect when the session has genuinely expired server-side
                setAuthenticated(false);
                setToken(undefined);
              });
          };

          refreshInterval = setInterval(runRefresh, 60000);
        }
      })
      .catch((err) => { console.error("Erreur Keycloak init:", err); setInitializing(false); });

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [keycloak]);

  const login = useCallback(
    async () => {
      sessionStorage.setItem('kc-return-path', window.location.pathname + window.location.search);
      keycloak.login({ redirectUri: window.location.origin });
    },
    [keycloak]
  );

  const logout = useCallback(
    async () => keycloak.logout(),
    [keycloak]
  );

  const value = useMemo(
    () => ({
      keycloak,
      initializing,
      authenticated,
      token,
      username,
      roles,
      isAdmin: true, // TODO: restore → roles.length === 0 || roles.includes('app-admin') after Keycloak roles configured
      login,
      logout,
    }),
    [keycloak, initializing, authenticated, token, username, roles, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

import { useContext } from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const CONSUMER_TEXT = {
  auth: "auth-status",
  token: "auth-token",
  username: "auth-username",
  roles: "auth-roles",
  isAdmin: "auth-is-admin",
};

// helper to build a consumer with the actual AuthContext (imported dynamically)
async function buildConsumer() {
  const { AuthContext } = await import("./AuthContext");

  return function Consumer() {
    const ctx = useContext(AuthContext) as {
      authenticated: boolean;
      token: string;
      username: string;
      roles: string[];
      isAdmin: boolean;
      login: () => Promise<void>;
      logout: () => Promise<void>;
    };

    return (
      <div>
        <div data-testid={CONSUMER_TEXT.auth}>{String(ctx?.authenticated)}</div>
        <div data-testid={CONSUMER_TEXT.token}>{ctx?.token}</div>
        <div data-testid={CONSUMER_TEXT.username}>{String(ctx?.username)}</div>
        <div data-testid={CONSUMER_TEXT.roles}>{JSON.stringify(ctx?.roles)}</div>
        <div data-testid={CONSUMER_TEXT.isAdmin}>{String(ctx?.isAdmin)}</div>
        <button data-testid="login-btn" onClick={() => ctx?.login()}>
          login
        </button>
        <button data-testid="logout-btn" onClick={() => ctx?.logout()}>
          logout
        </button>
      </div>
    );
  };
}

vi.mock("keycloak-js", () => ({
  default: function Keycloak() {
    return (globalThis as any).__TEST_KEYCLOAK_INSTANCE || {};
  },
}));

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("sets authenticated, token and username when init resolves true and updates token on interval; login/logout are wired", async () => {
    const realSetInterval = global.setInterval;
    // @ts-ignore - mock type complexe
    global.setInterval = (cb: any) => {
      setTimeout(cb, 0);
      return 1 as any;
    };
    const mockInit = vi.fn().mockResolvedValue(true);
    const mockUpdateToken = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => setTimeout(() => {
        kc.token = "refreshed-token";
        resolve(true);
      }, 0));
    });
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    const mockLogout = vi.fn().mockResolvedValue(undefined);

    const kc = {
      init: mockInit,
      updateToken: mockUpdateToken,
      login: mockLogin,
      logout: mockLogout,
      token: "initial-token",
      tokenParsed: { preferred_username: "alice" },
    };

    (globalThis as any).__TEST_KEYCLOAK_INSTANCE = kc;

    const { AuthProvider } = await import("./AuthProvider");
    const Consumer = await buildConsumer();

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId(CONSUMER_TEXT.auth)).toHaveTextContent("true"));
    expect(screen.getByTestId(CONSUMER_TEXT.token)).toHaveTextContent("initial-token");
    expect(screen.getByTestId(CONSUMER_TEXT.username)).toHaveTextContent("alice");

    // login/logout wiring
    fireEvent.click(screen.getByTestId("login-btn"));
    await waitFor(() => expect(mockLogin).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId("logout-btn"));
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());

    await waitFor(() => expect(mockUpdateToken).toHaveBeenCalled());
    // after refreshed, provider should update token value
    await waitFor(() => expect(screen.getByTestId(CONSUMER_TEXT.token)).toHaveTextContent("refreshed-token"));

    // @ts-ignore - ignore
    global.setInterval = realSetInterval;
  });

  it("handles init resolving false (not authenticated) and does not schedule updateToken", async () => {
    const mockInit = vi.fn().mockResolvedValue(false);
    const mockUpdateToken = vi.fn().mockResolvedValue(false);
    const kc = { init: mockInit, updateToken: mockUpdateToken, login: vi.fn(), logout: vi.fn() };
    (globalThis as any).__TEST_KEYCLOAK_INSTANCE = kc;

    const { AuthProvider } = await import("./AuthProvider");
    const Consumer = await buildConsumer();

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId(CONSUMER_TEXT.auth)).toHaveTextContent("false"));
    expect(mockUpdateToken).not.toHaveBeenCalled();
  });

  it("logs an error when init rejects", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => void 0);
    const mockInit = vi.fn().mockRejectedValue(new Error("boom"));
    const kc = { init: mockInit, updateToken: vi.fn(), login: vi.fn(), logout: vi.fn() };
    (globalThis as any).__TEST_KEYCLOAK_INSTANCE = kc;

    const { AuthProvider } = await import("./AuthProvider");
    const Consumer = await buildConsumer();

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    consoleError.mockRestore();
  });

  it("does not call init when keycloak is already initialized", async () => {
    const mockInit = vi.fn().mockResolvedValue(true);
    const kc = { init: mockInit, initialized: true, updateToken: vi.fn(), login: vi.fn(), logout: vi.fn() };
    (globalThis as any).__TEST_KEYCLOAK_INSTANCE = kc;

    const { AuthProvider } = await import("./AuthProvider");
    const Consumer = await buildConsumer();

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    // give a short tick for effect to run
    await waitFor(() => expect(mockInit).not.toHaveBeenCalled());
  });

  it("uses null username when tokenParsed is absent", async () => {
    const mockInit = vi.fn().mockResolvedValue(true);
    const mockUpdateToken = vi.fn().mockResolvedValue(false);
    const mockLogin = vi.fn();
    const mockLogout = vi.fn();

    const kc = {
      init: mockInit,
      updateToken: mockUpdateToken,
      login: mockLogin,
      logout: mockLogout,
      token: "tok",
      // no tokenParsed
    } as any;

    (globalThis as any).__TEST_KEYCLOAK_INSTANCE = kc;

    const { AuthProvider } = await import("./AuthProvider");
    const Consumer = await buildConsumer();

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId(CONSUMER_TEXT.auth)).toHaveTextContent("true"));
    expect(screen.getByTestId(CONSUMER_TEXT.username)).toHaveTextContent("null");
  });

  it("sets authenticated=false when updateToken rejects (session expired)", async () => {
    // Capture the setInterval callback so we can trigger it manually
    let capturedRefresh: (() => void) | undefined;
    const realSetInterval = global.setInterval;
    // @ts-ignore -- override global.setInterval signature for test control
    global.setInterval = (cb: any) => { capturedRefresh = cb; return 1 as any; };

    const mockUpdateToken = vi.fn().mockRejectedValue(new Error("session expired"));
    const kc = {
      init: vi.fn().mockResolvedValue(true),
      updateToken: mockUpdateToken,
      login: vi.fn(),
      logout: vi.fn(),
      token: "tok",
      tokenParsed: { preferred_username: "bob" },
    } as any;

    (globalThis as any).__TEST_KEYCLOAK_INSTANCE = kc;
    const { AuthProvider } = await import("./AuthProvider");
    const Consumer = await buildConsumer();

    render(<AuthProvider><Consumer /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId(CONSUMER_TEXT.auth)).toHaveTextContent("true"));

    // Trigger the refresh interval callback
    await act(async () => { if (capturedRefresh) await capturedRefresh(); });

    await waitFor(() => expect(screen.getByTestId(CONSUMER_TEXT.auth)).toHaveTextContent("false"));

    // @ts-ignore -- restore original setInterval after test
    global.setInterval = realSetInterval;
  });

  it("reuses the same keycloakInstance between renders (else path)", async () => {
    const mockInit1 = vi.fn().mockResolvedValue(true);
    const kc1 = { init: mockInit1, updateToken: vi.fn().mockResolvedValue(false), login: vi.fn(), logout: vi.fn(), token: "t1", tokenParsed: { preferred_username: 'u1' } } as any;
    (globalThis as any).__TEST_KEYCLOAK_INSTANCE = kc1;
    const { AuthProvider } = await import("./AuthProvider");
    const Consumer = await buildConsumer();

    // mount first provider which will set the module-scoped keycloakInstance
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId(CONSUMER_TEXT.auth)).toHaveTextContent("true"));

    const mockInit2 = vi.fn().mockResolvedValue(true);
    const kc2 = { init: mockInit2, updateToken: vi.fn().mockResolvedValue(false), login: vi.fn(), logout: vi.fn(), token: "t2", tokenParsed: { preferred_username: 'u2' } } as any;
    // set a different instance globally, but mounting a new provider should reuse the first
    (globalThis as any).__TEST_KEYCLOAK_INSTANCE = kc2;

    // mount a second provider instance in the same process; useMemo should run and take the else path
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    expect(mockInit1).toHaveBeenCalled();
    expect(mockInit2).not.toHaveBeenCalled();
  });

  it("tolerates __runRefresh assignment throwing (covers catch)", async () => {
    const mockInit = vi.fn().mockResolvedValue(true);
    const mockUpdateToken = vi.fn().mockResolvedValue(false);
    const mockLogin = vi.fn();
    const mockLogout = vi.fn();

    // create an object whose assignment to __runRefresh will throw
    const kc: any = {
      init: mockInit,
      updateToken: mockUpdateToken,
      login: mockLogin,
      logout: mockLogout,
      token: "tok",
      tokenParsed: { preferred_username: "dave" },
    };

    Object.defineProperty(kc, "__runRefresh", {
      set() {
        throw new Error("cannot set");
      },
      configurable: true,
    });

    (globalThis as any).__TEST_KEYCLOAK_INSTANCE = kc;
    const { AuthProvider } = await import("./AuthProvider");
    const Consumer = await buildConsumer();

    // rendering should not throw despite the setter throwing
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId(CONSUMER_TEXT.auth)).toHaveTextContent("true"));
  });

  it("keeps session alive when updateToken resolves false (token still valid)", async () => {
    // Capture the setInterval callback so we can trigger it manually
    let capturedRefresh: (() => void) | undefined;
    const realSetInterval = global.setInterval;
    // @ts-ignore -- override global.setInterval signature for test control
    global.setInterval = (cb: any) => { capturedRefresh = cb; return 1 as any; };

    // updateToken returns false = token is still valid, no new token issued
    const mockUpdateToken = vi.fn().mockResolvedValue(false);
    const kc = {
      init: vi.fn().mockResolvedValue(true),
      updateToken: mockUpdateToken,
      login: vi.fn(),
      logout: vi.fn(),
      token: "original-tok",
      tokenParsed: { preferred_username: "carol" },
    } as any;

    (globalThis as any).__TEST_KEYCLOAK_INSTANCE = kc;
    const { AuthProvider } = await import("./AuthProvider");
    const Consumer = await buildConsumer();

    render(<AuthProvider><Consumer /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId(CONSUMER_TEXT.token)).toHaveTextContent("original-tok"));

    // Trigger the refresh interval callback
    await act(async () => { if (capturedRefresh) await capturedRefresh(); });

    await waitFor(() => expect(mockUpdateToken).toHaveBeenCalled());

    // Token unchanged and still authenticated — updateToken=false means still valid
    expect(screen.getByTestId(CONSUMER_TEXT.token)).toHaveTextContent("original-tok");
    expect(screen.getByTestId(CONSUMER_TEXT.auth)).toHaveTextContent("true");

    // @ts-ignore -- restore original setInterval after test
    global.setInterval = realSetInterval;
  });

  it("extracts roles from tokenParsed.realm_access.roles", async () => {
    const kc = {
      init: vi.fn().mockResolvedValue(true),
      updateToken: vi.fn().mockResolvedValue(false),
      login: vi.fn(),
      logout: vi.fn(),
      token: "tok",
      tokenParsed: {
        preferred_username: "bob",
        realm_access: { roles: ["app-admin", "offline_access"] },
      },
    } as any;
    (globalThis as any).__TEST_KEYCLOAK_INSTANCE = kc;

    const { AuthProvider } = await import("./AuthProvider");
    const Consumer = await buildConsumer();

    render(<AuthProvider><Consumer /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId(CONSUMER_TEXT.auth)).toHaveTextContent("true"));
    const rolesEl = screen.getByTestId(CONSUMER_TEXT.roles);
    expect(rolesEl).toHaveTextContent("app-admin");
    expect(rolesEl).toHaveTextContent("offline_access");
  });

  it("roles is empty array when tokenParsed has no realm_access", async () => {
    const kc = {
      init: vi.fn().mockResolvedValue(true),
      updateToken: vi.fn().mockResolvedValue(false),
      login: vi.fn(),
      logout: vi.fn(),
      token: "tok",
      tokenParsed: { preferred_username: "anon" },
      // no realm_access
    } as any;
    (globalThis as any).__TEST_KEYCLOAK_INSTANCE = kc;

    const { AuthProvider } = await import("./AuthProvider");
    const Consumer = await buildConsumer();

    render(<AuthProvider><Consumer /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId(CONSUMER_TEXT.auth)).toHaveTextContent("true"));
    expect(screen.getByTestId(CONSUMER_TEXT.roles)).toHaveTextContent("[]");
  });

  it("isAdmin is true when roles is empty (dev fallback — no Keycloak roles assigned)", async () => {
    // When the token carries no realm_access roles, isAdmin should be true
    // so developers without Keycloak role setup are not locked out
    const kc = {
      init: vi.fn().mockResolvedValue(true),
      updateToken: vi.fn().mockResolvedValue(false),
      login: vi.fn(), logout: vi.fn(),
      token: "tok",
      tokenParsed: { preferred_username: "dev" },
    } as any;
    (globalThis as any).__TEST_KEYCLOAK_INSTANCE = kc;

    const { AuthProvider } = await import("./AuthProvider");
    const Consumer = await buildConsumer();

    render(<AuthProvider><Consumer /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId(CONSUMER_TEXT.auth)).toHaveTextContent("true"));
    // roles empty → isAdmin must be true (hardcoded while Keycloak roles are being configured)
    expect(screen.getByTestId(CONSUMER_TEXT.isAdmin)).toHaveTextContent("true");
  });
});

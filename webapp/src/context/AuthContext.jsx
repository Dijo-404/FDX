/* oxlint-disable react/only-export-components -- Provider and hook form one public context API. */
import { createContext, useContext, useMemo, useState } from "react";
import { getStoredSession, login as mockLogin, logout as mockLogout } from "../lib/mockAuth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getStoredSession());

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.user),
      async login(email, password) {
        const nextSession = await mockLogin(email, password);
        setSession(nextSession);
        return nextSession;
      },
      logout() {
        mockLogout();
        setSession(null);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/* oxlint-disable react/only-export-components -- Provider and hook form one public context API. */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearSession, getStoredSession, loginRequest, storeSession } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getStoredSession());
  useEffect(() => {
    const clear = () => setSession(null);
    window.addEventListener("fdx:session-cleared", clear);
    return () => window.removeEventListener("fdx:session-cleared", clear);
  }, []);
  const value = useMemo(() => ({
    user: session?.user ?? null,
    isAuthenticated: Boolean(session?.user && session?.token),
    async login(email, password) {
      const nextSession = await loginRequest(email, password);
      storeSession(nextSession);
      setSession(nextSession);
      return nextSession;
    },
    setAuthenticatedSession(nextSession) {
      storeSession(nextSession);
      setSession(nextSession);
    },
    logout() {
      clearSession();
      setSession(null);
    },
  }), [session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

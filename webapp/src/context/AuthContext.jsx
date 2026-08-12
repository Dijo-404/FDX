/* oxlint-disable react/only-export-components -- Provider and hook form one public context API. */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { initializeSession, loginRequest, logoutRequest, storeSession } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const clear = () => setSession(null);
    const refreshed = (event) => setSession(event.detail);
    window.addEventListener("fdx:session-cleared", clear);
    window.addEventListener("fdx:session-refreshed", refreshed);
    initializeSession().then(setSession).finally(() => setLoading(false));
    return () => {
      window.removeEventListener("fdx:session-cleared", clear);
      window.removeEventListener("fdx:session-refreshed", refreshed);
    };
  }, []);
  const value = useMemo(() => ({
    user: session?.user ?? null,
    isAuthenticated: Boolean(session?.user && session?.token),
    loading,
    async login(email, password) {
      const nextSession = await loginRequest(email, password);
      storeSession(nextSession);
      setSession(nextSession);
      return nextSession;
    },
    setAuthenticatedSession(nextSession) {
      const normalized = storeSession(nextSession);
      setSession(normalized);
    },
    async logout() {
      await logoutRequest();
      setSession(null);
    },
  }), [loading, session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

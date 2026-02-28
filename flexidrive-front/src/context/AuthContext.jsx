import { createContext, useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [rol, setRol] = useState(() => localStorage.getItem("rol") || "");
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  useEffect(() => {
    if (rol) localStorage.setItem("rol", rol);
    else localStorage.removeItem("rol");
  }, [rol]);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  const loginSuccess = useCallback(
    ({ token, rol, usuario }) => {
      setToken(token);
      setRol(rol || "");
      setUser(usuario || null);

      if (rol === "cliente") navigate("/cliente/dashboard", { replace: true });
      else if (rol === "comisionista") navigate("/comisionista/dashboard", { replace: true });
      else navigate("/app", { replace: true });
    },
    [navigate]
  );

  const logout = useCallback(() => {
    setToken("");
    setRol("");
    setUser(null);
    navigate("/auth/login", { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({ token, rol, user, isAuthed: !!token, loginSuccess, logout }),
    [token, rol, user, loginSuccess, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

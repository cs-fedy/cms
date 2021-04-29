import { useContext, createContext } from "react";
import { useRouter } from "next/router";

const AuthContext = createContext({
  login: (token) => {},
  logout: () => {},
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export default function AuthProvider({ children }) {
  const router = useRouter();
  const login = (token) => {
    localStorage.setItem("JWT_TOKEN", token);
    router.push("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("JWT_TOKEN");
    router.reload()
  };

  return (
    <AuthContext.Provider value={{ login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

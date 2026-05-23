import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

type Theme = "dark" | "light";

const ThemeContext = createContext<any>(null);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const root = document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark"); root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark"); root.setAttribute("data-theme", "light");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
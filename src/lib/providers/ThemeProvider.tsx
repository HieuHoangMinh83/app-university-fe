"use client";
import {
  createContext,
  ReactNode,
  useEffect,
  useState,
  useContext,
} from "react";
import Loading from "@/components/Loadingpage/loading";
export interface ThemeContextInterface {
  theme: string;
  toggleTheme: () => any;
}
export const ThemeContext = createContext({} as ThemeContextInterface);

type Props = {
  children: ReactNode;
};

export default function ThemeProvider({ children }: Props) {
  const [theme, setTheme] = useState("light");
  const [isloading, setIsloading] = useState(true);
  useEffect(() => {
    // Lấy theme từ Local Storage khi component được mount
    const storedTheme = localStorage.getItem("theme");

    if (storedTheme) {
      setTheme(storedTheme);
      setIsloading(false);
    } else {
      setIsloading(false);
    }
  }, []);

  const toggleTheme = () => {
    console.log("old", theme);
    const newTheme = theme === "light" ? "dark" : "light";
    console.log("new", newTheme);

    localStorage.setItem("theme", newTheme);
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
      }}
    >
      {isloading ? <Loading /> : children}
    </ThemeContext.Provider>
  );
}

export const useThemeContext = () => useContext(ThemeContext);

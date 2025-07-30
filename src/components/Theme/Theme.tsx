"use client";

import { useThemeContext } from "@/lib/providers/ThemeProvider";

function Themefull({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useThemeContext();
  return <div className={theme}>{children}</div>;
}

export default Themefull;

"use client";

import React, { useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (next: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem("theme");
    if (value === "light" || value === "dark") return value;
  } catch {}
  return null;
}

function writeStoredTheme(theme: Theme) {
  try {
    window.localStorage.setItem("theme", theme);
  } catch {}
}

function applyThemeAttribute(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  // Also toggle Tailwind v3 dark mode class
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const initialTheme = useMemo<Theme>(() => readStoredTheme() ?? getSystemTheme(), []);
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  useEffect(() => {
    applyThemeAttribute(theme);
    writeStoredTheme(theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const stored = readStoredTheme();
      if (!stored) {
        setThemeState(getSystemTheme());
      }
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      toggleTheme: () => setThemeState((t) => (t === "light" ? "dark" : "light")),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}




import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "sr_theme";

function getSystemTheme() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage bloqueado — segue pela preferência do sistema
  }
}

function writeStoredTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage bloqueado — a escolha manual só vale para esta sessão */
  }
}

/**
 * Tema claro/escuro do app. A primeira aplicação (antes do React montar)
 * já acontece via script inline em index.html, para não piscar o tema
 * errado; este hook só assume o estado depois disso e cuida da alternância.
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => readStoredTheme() || getSystemTheme());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      writeStoredTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}

"use client";

import React, { useContext, useEffect, useRef } from "react";
import { ThemeContext } from "@/components/ThemeProvider";
import { gsap } from "gsap";

export default function ThemeToggle() {
  const context = useContext(ThemeContext);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const themeValue = context?.theme ?? "light";

  useEffect(() => {
    if (!buttonRef.current) return;
    gsap.fromTo(
      buttonRef.current,
      { scale: 0.95, rotate: -5, opacity: 0.8 },
      { scale: 1, rotate: 0, opacity: 1, duration: 0.4, ease: "power3.out" }
    );
  }, [themeValue]);

  if (!context) return null;
  const { toggleTheme } = context;
  const theme = themeValue;

  return (
    <button
      ref={buttonRef}
      onClick={toggleTheme}
      className="rounded-full border border-black/10 dark:border-white/20 px-4 py-2 text-sm font-medium bg-white/70 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "light" ? "🌕" : "🌑"}
    </button>
  );
}


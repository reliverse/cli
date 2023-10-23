"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * @see https://gsap.com
 * @see https://lucide.dev/icons
 * @see https://framer.com/motion
 * @see https://gsap.com/docs/v3/Installation
 * @see https://ui.shadcn.com/docs/dark-mode/next
 * @see https://lucide.dev/guide/packages/lucide-react
 */

const className = "h-[32px] w-[32px] text-gray-400";
const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const isLightTheme = theme === "light";
  const [mounted, setMounted] = useState(false);
  const onToggle = useCallback(() => {
    setTheme(isLightTheme ? "dark" : "light");
  }, [isLightTheme, setTheme]);
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (theme === "system") {
      setTheme("light");
    }
  }, [theme, setTheme]);
  // We won't be able to detect the users localStorage for theme, by default assume light theme
  if (!mounted || isLightTheme) {
    return <Moon className={className} onClick={onToggle} />;
  }
  return (
    <AnimatePresence>
      <motion.span
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
      >
        <Sun className={className} onClick={onToggle} />
      </motion.span>
    </AnimatePresence>
  );
};

export default ThemeSwitcher;

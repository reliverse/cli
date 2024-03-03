"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes/dist/types";

import { TooltipProvider } from "~/islands/providers/tooltip";

export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      {/* @ts-expect-error ⚠️ 1.2.5 */}
      <TooltipProvider>{children}</TooltipProvider>
    </NextThemesProvider>
  );
}

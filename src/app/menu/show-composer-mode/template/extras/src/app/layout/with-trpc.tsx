// @ts-expect-error TODO: fix ts
import { GeistSans } from "geist/font/sans";

import "~/styles/globals.css";

import { type Metadata } from "next";
import React from "react";

// @ts-expect-error TODO: fix ts
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "@reliverse/cli",
  description: "Generated by @reliverse/cli",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={GeistSans.className}>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}

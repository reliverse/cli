import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "~/styles/globals.css";

import { headers } from "next/headers";

import { Header } from "~/islands/header";
import { TRPCReactProvider } from "~/islands/providers";
import { fullURL } from "~/utils/meta/builder";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

/**
 * Since we're passing `headers()` to the `TRPCReactProvider` we need to
 * make the entire app dynamic. You can move the `TRPCReactProvider` further
 * down the tree (e.g. /dashboard and onwards) to make part of the app statically rendered.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: fullURL(),
  title: "Reliverse: Next.js",
  description: "Simple monorepo with shared backend for web & mobile apps",
  openGraph: {
    title: "Reliverse: Next.js",
    description: "Simple monorepo with shared backend for web & mobile apps",
    url: "https://github.com/blefnk/reliverse",
    siteName: "Reliverse: Next.js",
  },
  twitter: {
    card: "summary_large_image",
    site: "@blefnk",
    creator: "@blefnk",
  },
};

export default function Layout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={["font-sans", fontSans.variable].join(" ")}>
        <TRPCReactProvider headers={headers()}>
          <Header />
          {props.children}
        </TRPCReactProvider>
      </body>
    </html>
  );
}

import "~/styles/globals.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Header } from "~/islands/header";
import TrpcQueryProvider from "~/islands/wrappers/trpc/trpc-query-provider";
import { fullURL } from "~/utils/meta/builder";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

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

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={["font-sans", fontSans.variable].join(" ")}>
        <TrpcQueryProvider>
          <Header />
          {props.children}
        </TrpcQueryProvider>
      </body>
    </html>
  );
}

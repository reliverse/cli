import type { Metadata } from "next";

import { fullURL } from "~/utils/meta/builder";

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

export default function DashboardLayout(props: { children: React.ReactNode }) {
  return <div>{props.children}</div>;
}

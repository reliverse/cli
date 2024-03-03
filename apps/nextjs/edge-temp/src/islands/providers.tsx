"use client";

import { env } from "~/env.mjs";

export const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // browser should use relative url
  if (env.VERCEL_URL) return env.VERCEL_URL; // SSR should use vercel url

  return `http://localhost:${env.PORT}`; // dev SSR should use localhost
};

export function TRPCReactProvider(props: {
  children: React.ReactNode;
  headers?: Headers;
}) {
  return <>{props.children}</>;
}

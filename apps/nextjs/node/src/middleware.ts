// middleware.ts

import type { NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
export default function middleware(req: NextRequest) {}

export const config = {
  /**
   * Matcher entries are linked with logical "or", therefore
   * if one of them matches, the middleware will be invoked.
   *
   * Skips all paths where the middleware configuration will be ignored.
   * To improve i18n, every dot files was specified (e.g. favicon.ico).
   *
   * @see https://next-intl-docs.vercel.app/docs/routing/middleware#unable-to-find-locale
   */
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/api/webhooks/stripe(.*)"],
};

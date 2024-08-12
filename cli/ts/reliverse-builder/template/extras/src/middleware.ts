import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";

import { defaultLocale, locales } from "./navigation";

const i18nMiddleware = createMiddleware({
	localePrefix: "as-needed",
	defaultLocale,
	locales,
});

export const middleware = async (req: NextRequest): Promise<NextResponse> => {
	const i18nRes = i18nMiddleware(req);
	return i18nRes;
};

export const config = {
	matcher: [
		/**
		 * It matches all paths except:
		 * 1. /api/ (includes trpc there)
		 * 2. /_next/ (Next.js internals)
		 * 3. /_proxy/ (OG tags proxying)
		 * 4. /_vercel (Vercel internals)
		 * 5. /_static (inside of /public)
		 * 6. /favicon.ico, /sitemap.xml, /robots.txt (static files)
		 * 7. The paths containing a file extension (e.g., .jpg, .png, etc.)
		 */
		"/((?!api/|_next/|_proxy/|_vercel|_static|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
	],
};

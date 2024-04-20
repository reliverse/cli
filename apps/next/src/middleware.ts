// /* eslint-disable @typescript-eslint/no-empty-function */
// import type { NextFetchEvent, NextRequest } from "next/server";

export default function middleware(
	// _request: NextRequest,
	// _event_: NextFetchEvent,
	// eslint-disable-next-line @typescript-eslint/no-empty-function
) {}

// https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

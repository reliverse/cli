import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import type { AppType } from "next/app";
import { Inter } from "next/font/google";
import React from "react";

import "~/core/styles/globals.css";

const inter = Inter({
	subsets: ["latin"],
});

const MyApp: AppType<{ session: Session | null }> = ({
	Component,
	pageProps: { session, ...pageProps },
}) => {
	return (
		<SessionProvider session={session}>
			<main className={inter.className}>
				<Component {...pageProps} />
			</main>
		</SessionProvider>
	);
};

export default MyApp;

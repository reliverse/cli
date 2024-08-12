import type { AppType } from "next/dist/shared/lib/utils";
import { Inter } from "next/font/google";
import React from "react";

import "~/core/styles/globals.css";

const inter = Inter({
	subsets: ["latin"],
});

const MyApp: AppType = ({ Component, pageProps }) => {
	return (
		<main className={inter.className}>
			<Component {...pageProps} />
		</main>
	);
};

export default MyApp;

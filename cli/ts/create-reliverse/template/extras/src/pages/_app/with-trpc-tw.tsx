import type { AppType } from "next/app";
import { Inter } from "next/font/google";

// @ts-expect-error ...
import { api } from "~/utils/api";

import React from "react";
import "~/core/styles/globals.css";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-sans",
});
const MyApp: AppType = ({ Component, pageProps }) => {
	return (
		<main className={`font-sans ${inter.variable}`}>
			<Component {...pageProps} />
		</main>
	);
};

export default api.withTRPC(MyApp);

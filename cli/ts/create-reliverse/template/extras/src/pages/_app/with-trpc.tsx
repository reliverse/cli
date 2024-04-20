import type { AppType } from "next/app";
import { Inter } from "next/font/google";

// @ts-expect-error ...
import { api } from "~/utils/api";

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

export default api.withTRPC(MyApp);

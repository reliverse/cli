// This is the root page component that rewrites users to default locale
// Please navigate to src/app/page.tsx to see real home page of the app

import { redirect } from "next/navigation";

// @ts-expect-error ...
import { defaultLocale } from "~/navigation";

const RootPage = () => redirect(defaultLocale);

export default RootPage;

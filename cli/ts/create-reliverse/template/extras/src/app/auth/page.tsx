import { redirect } from "next/navigation";

// @ts-expect-error ...
import { defaultLocale } from "~/navigation";

const AuthPage = () => redirect(defaultLocale);

export default AuthPage;

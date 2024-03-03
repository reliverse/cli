import Link from "next/link";

export function EdgeWindowsNotification() {
  const isWindows = () => process.platform === "win32";
  const isDevelopment = process.env.NODE_ENV === "development";

  // If we're not in development environment
  // on Windows, don't render the component
  if (!(isWindows() && isDevelopment)) return null;

  return (
    <p className="mx-2 mt-28 rounded-sm bg-zinc-900 px-10 py-3 text-base text-zinc-200 md:mt-2">
      It appears <b>you are on the localhost and running apps/nextjs/edge</b> on
      a Windows system (<i>apps/nextjs/node is recommended for you</i>). We wish
      to alert you to a known issue where the Edge Runtime may encounter errors
      in a Next.js Turborepo environment. Please, visit <b>/dashboard</b> page
      to check how Edge Runtime works for you. If you have not faced any issues,
      this is atypical. The{" "}
      <Link
        href="https://github.com/blefnk/reliverse"
        target="_blank"
        rel="noreferrer noopener"
        className="text-blue-500 hover:text-blue-700 hover:underline"
      >
        Bleverse Reliverse
      </Link>
      ,{" "}
      <Link
        href="https://github.com/vercel/next.js/issues/53562"
        target="_blank"
        rel="noreferrer noopener"
        className="text-blue-500 hover:text-blue-700 hover:underline"
      >
        Vercel Turborepo
      </Link>{" "}
      and{" "}
      <Link
        href="https://github.com/t3-oss/create-t3-turbo/issues/660"
        target="_blank"
        rel="noreferrer noopener"
        className="text-blue-500 hover:text-blue-700 hover:underline"
      >
        create-t3-turbo
      </Link>{" "}
      teams are deeply interested in your unique case and would greatly
      appreciate your reaching out to us for further investigation. Your
      insights are invaluable and will significantly assist us in enhancing the
      user experience for our entire community.
    </p>
  );
}

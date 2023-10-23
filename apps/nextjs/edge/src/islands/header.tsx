import { Suspense } from "react";

import ThemeSwitcher from "./theme";

// import Link from "next/link";
// import { faSignIn, faSignOut } from "@fortawesome/free-solid-svg-icons";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { auth } from "@acme/auth";
// import { Avatar } from "./avatar";

export function Header() {
  // const session = await auth();

  return (
    <header className="bg-white-900 w-full select-none bg-zinc-950 shadow-md backdrop-blur-md">
      <div className="mx-auto flex flex-wrap items-center justify-between p-2">
        <Suspense
          fallback={
            <button
              aria-controls="navbar-user"
              aria-expanded="false"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg p-2 text-sm text-zinc-500 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:focus:ring-zinc-600"
              type="button"
            >
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 17 14"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M1 1h15M1 7h15M1 13h15"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </button>
          }
        >
          <button
            aria-controls="navbar-user"
            aria-expanded="false"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg p-2 text-sm text-zinc-500 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:focus:ring-zinc-600"
            type="button"
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 17 14"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 1h15M1 7h15M1 13h15"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </button>
        </Suspense>
        <div className="flex items-center space-x-2 md:order-2">
          <ThemeSwitcher />
          <span className="font-bold text-purple-500">@blefnk/reliverse</span>
          {/* <Avatar
            className="flexBasis mr-3"
            placeholder={session?.user?.name ?? "?"}
            src={session?.user?.image}
          /> */}
          {/* <Link
            className="h-[28] w-[28]"
            href={session ? "/api/auth/signout" : "/api/auth/signin"}
            prefetch={false}
          >
            <FontAwesomeIcon
              className="h-[28px] w-[28px] text-zinc-400"
              icon={session ? faSignOut : faSignIn}
            />
          </Link> */}
        </div>
      </div>
    </header>
  );
}

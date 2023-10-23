import { Suspense } from "react";
import Link from "next/link";

import { CreatePostForm, PostCardSkeleton } from "~/islands/posts";
import { AuthShowcase } from "~/islands/showcase";

// import { PostList } from "~/islands/posts";

export default function RootPage(): JSX.Element {
  return (
    <main className="flex h-screen flex-col items-center bg-neutral-900">
      <div className="container my-12 flex flex-col items-center justify-center gap-6 px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tighter text-pink-400 dark:text-white">
          Reliverse: The Open-Source Superapp
        </h1>
        <p className="text-center text-2xl text-gray-600 dark:text-gray-300">
          Build the Sites, Build the Apps, Build the Games, Build Everything
        </p>
        <p className="mt-4 text-center text-lg text-gray-500 dark:text-gray-400">
          The landing page for the{" "}
          <Link
            href="https://github.com/blefnk/reliverse"
            target="_blank"
            rel="noreferrer noopener"
            className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-600"
          >
            Reliverse Turborepo Starter
          </Link>{" "}
          is in the works. Stay tuned for updates! In the meantime, explore the{" "}
          <Link
            href="https://github.com/blefnk/relivator"
            target="_blank"
            rel="noreferrer noopener"
            className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-600"
          >
            non-monorepo Next.js edition of the Bleverse Relivator starter.
          </Link>
        </p>
      </div>

      <AuthShowcase />
      <CreatePostForm />

      <div className="h-[40vh] w-full max-w-2xl overflow-y-scroll">
        <Suspense
          fallback={
            <div className="flex w-full flex-col gap-4">
              <PostCardSkeleton />
              <PostCardSkeleton />
              <PostCardSkeleton />
            </div>
          }
        >
          {/* todo: not finished */}
          {/* <PostList /> */}
        </Suspense>
      </div>
    </main>
  );
}

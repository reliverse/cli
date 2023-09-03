import Link from "next/link";
// import { Button, Header } from "primitives";

export default function HomePage(): JSX.Element {
  return (
    <main>
      {/* <Header text="Next.js 13: App Router (Relivator Starter)" /> */}
      <h1>Next.js 13: App Router (Relivator Starter)</h1>
      <p>
        <Link
          href="https://nextjs.org"
          rel="noopener noreferrer"
          target="_blank"
        >
          @relivator/nextjs
        </Link>{" "}
        will be here soon. Please stay tuned for updates. At the moment, please
        switch to{" "}
        <Link href="https://github.com/blefnk/relivator">
          non-monorepo Next.js 13 only version of the Bleverse Relivator
          starter.
        </Link>
      </p>
      {/* <Button /> */}
    </main>
  );
}

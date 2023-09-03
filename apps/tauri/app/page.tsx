import Link from "next/link";
// import { Button, Header } from "primitives";

export default function HomePage(): JSX.Element {
  return (
    <main>
      {/* <Header text="Tauri App: Shadcn UI (Relivator Starter)" /> */}
      <h1>Tauri App: Shadcn UI (Relivator Starter)</h1>
      <p>
        <Link
          href="https://tauri.app"
          rel="noopener noreferrer"
          target="_blank"
        >
          @relivator/tauri
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

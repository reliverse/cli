// @ts-expect-error TODO: fix ts
import Link from "next/link";
import React from "react";

// @ts-expect-error TODO: fix ts
import { LatestPost } from "~/app/_components/post";
// @ts-expect-error TODO: fix ts
import { api, HydrateClient } from "~/trpc/server";

import styles from "./index.module.css";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });

  void api.post.getLatest.prefetch();

  return (
    <HydrateClient>
      <main className={styles["main"]}>
        <div className={styles["container"]}>
          <h1 className={styles["title"]}>
            Basic <span className={styles["pinkSpan"]}>Reliverse</span> App
          </h1>
          <div className={styles["cardRow"]}>
            <Link
              className={styles["card"]}
              href="https://docs.reliverse.org/en/usage/first-steps"
              target="_blank"
            >
              <h3 className={styles["cardTitle"]}>First Steps →</h3>
              <div className={styles["cardText"]}>
                Just the basics - Everything you need to know to set up your
                database and authentication.
              </div>
            </Link>
            <Link
              className={styles["card"]}
              href="https://docs.reliverse.org/en/introduction"
              target="_blank"
            >
              <h3 className={styles["cardTitle"]}>Documentation →</h3>
              <div className={styles["cardText"]}>
                Learn more about @reliverse/cli, the libraries it uses, and how
                to deploy it.
              </div>
            </Link>
          </div>
          <div className={styles["showcaseContainer"]}>
            <p className={styles["showcaseText"]}>
              {hello ? hello.greeting : "Loading tRPC query..."}
            </p>
          </div>

          <LatestPost />
        </div>
      </main>
    </HydrateClient>
  );
}

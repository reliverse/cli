import { signIn, signOut, useSession } from "next-auth/react";
import React from "react";
import { Link } from "react-router-dom";

// @ts-expect-error TODO: fix ts
import { api } from "~/utils/api";

import styles from "./index.module.css";

export default function WithAuthTrpcPage() {
  const hello = api.post.hello.useQuery({ text: "from tRPC" });

  return (
    <main className={styles["main"]}>
      <div className={styles["container"]}>
        <h1 className={styles["title"]}>
          Basic <span className={styles["pinkSpan"]}>Reliverse</span> App
        </h1>
        <div className={styles["cardRow"]}>
          <Link
            className={styles["card"]}
            to="https://docs.reliverse.org/en/usage/first-steps"
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
            to="https://docs.reliverse.org/en/introduction"
            target="_blank"
          >
            <h3 className={styles["cardTitle"]}>Documentation →</h3>
            <div className={styles["cardText"]}>
              Learn more about @reliverse/cli, the libraries it uses, and how to
              deploy it.
            </div>
          </Link>
        </div>
        <div className={styles["showcaseContainer"]}>
          <p className={styles["showcaseText"]}>
            {hello.data ? hello.data.greeting : "Loading tRPC query..."}
          </p>
          <AuthShowcase />
        </div>
      </div>
    </main>
  );
}

function AuthShowcase() {
  const { data: sessionData } = useSession();

  const { data: secretMessage } = api.post.getSecretMessage.useQuery(
    undefined,
    { enabled: sessionData?.user !== undefined },
  );

  return (
    <div className={styles["authContainer"]}>
      <p className={styles["showcaseText"]}>
        {sessionData && <span>Logged in as {sessionData.user?.name}</span>}
        {secretMessage && <span> - {secretMessage}</span>}
      </p>
      <button
        type="button"
        className={styles["loginButton"]}
        onClick={sessionData ? () => void signOut() : () => void signIn()}
      >
        {sessionData ? "Sign out" : "Sign in"}
      </button>
    </div>
  );
}

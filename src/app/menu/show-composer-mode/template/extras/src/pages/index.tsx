import React from "react";
import { Link } from "react-router-dom";

import styles from "./index.module.css";

export default function IndexPage() {
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
      </div>
    </main>
  );
}

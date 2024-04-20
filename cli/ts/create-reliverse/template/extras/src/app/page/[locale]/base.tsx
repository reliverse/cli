import Link from "next/link";

import React from "react";

import styles from "../index.module.css";

export default function Home() {
	return (
		<main className={styles.main}>
			<div className={styles.container}>
				<h1 className={styles.title}>
					<span className={styles.pinkSpan}>Reliverse App</span> with i18n
				</h1>
				<div className={styles.cardRow}>
					<Link
						className={styles.card}
						href="https://docs.bleverse.com/en/usage/first-steps"
						target="_blank"
					>
						<h3 className={styles.cardTitle}>First Steps →</h3>
						<div className={styles.cardText}>
							Just the basics - Everything you need to know to set up your
							database and authentication.
						</div>
					</Link>
					<Link
						className={styles.card}
						href="https://docs.bleverse.com/en/introduction"
						target="_blank"
					>
						<h3 className={styles.cardTitle}>Documentation →</h3>
						<div className={styles.cardText}>
							Learn more about Create Reliverse App, the libraries it uses, and
							how to deploy it.
						</div>
					</Link>
				</div>
			</div>
		</main>
	);
}

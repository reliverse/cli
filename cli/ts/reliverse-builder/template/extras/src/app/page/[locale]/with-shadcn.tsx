import Link from "next/link";
import React from "react";

// @ts-expect-error ...
import { Button } from "~/components/primitives/button";

export default function HomePage() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
			<div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
				<h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
					<span className="text-[hsl(280,100%,70%)]">Reliverse App</span> with
					i18n
				</h1>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
					<Link
						className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 text-white hover:bg-white/20"
						href="https://docs.bleverse.com/en/usage/first-steps"
						target="_blank"
					>
						<h3 className="text-2xl font-bold">First Steps →</h3>
						<div className="text-lg">
							Just the basics - Everything you need to know to set up your
							database and authentication.
						</div>
					</Link>
					<Link
						className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 text-white hover:bg-white/20"
						href="https://docs.bleverse.com/en/introduction"
						target="_blank"
					>
						<h3 className="text-2xl font-bold">Documentation →</h3>
						<div className="text-lg">
							Learn more about Create Reliverse App, the libraries it uses, and
							how to deploy it.
						</div>
					</Link>
				</div>
				<div className="flex flex-col items-center gap-2">
					<Button className="font-bold text-primary" variant="secondary">
						Hello from @shadcn!
					</Button>
				</div>
			</div>
		</main>
	);
}

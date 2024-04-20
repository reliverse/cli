"use client";

import { Button } from "@packages/ui/button";
import { Copy, CopyCheck } from "lucide-react";
import { useState } from "react";

export default function HomePageClient() {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText("npx reliverse");
			setCopied(true);
			setTimeout(() => {
				setCopied(false);
			}, 2000);
		} catch (error) {
			console.error("Failed to copy text: ", error);
		}
	};

	return (
		<Button
			className="font-bold text-primary"
			onClick={handleCopy}
			variant="secondary"
		>
			{copied ? (
				<>
					<CopyCheck className="w-4 h-4 mr-2" /> <span>Copied!</span>
				</>
			) : (
				<>
					<Copy className="w-4 h-4 mr-2" /> <span>npx reliverse</span>
				</>
			)}
		</Button>
	);
}

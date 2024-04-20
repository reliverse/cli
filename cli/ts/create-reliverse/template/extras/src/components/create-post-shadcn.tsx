"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import React from "react";
// @ts-expect-error ...
import { Button } from "~/components/primitives/button";
// @ts-expect-error ...
import { api } from "~/core/utils/trpc/react";

export function CreatePost() {
	const router = useRouter();
	const [name, setName] = useState("");

	const createPost = api.post.create.useMutation({
		onSuccess: () => {
			router.refresh();
			setName("");
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				createPost.mutate({ name });
			}}
			className="flex flex-col gap-2"
		>
			<input
				type="text"
				placeholder="Title"
				value={name}
				onChange={(e) => setName(e.target.value)}
				className="w-full rounded-full px-4 py-2 text-black"
			/>
			<Button type="submit" variant="secondary" disabled={createPost.isPending}>
				{createPost.isPending ? "Submitting..." : "Submit"}
			</Button>
		</form>
	);
}

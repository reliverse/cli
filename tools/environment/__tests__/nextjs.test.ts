import { picklist, string, transform } from "valibot";
import { expectTypeOf } from "expect-type";
import { describe, expect, test, vi } from "vitest";
import { createEnv } from "../src/nextjs";

function ignoreErrors(cb: () => void) {
	try {
		cb();
	} catch (err) {
		// ignore
	}
}

test("server vars should not be prefixed", () => {
	ignoreErrors(() => {
		createEnv({
			server: {
				// @ts-expect-error
				NEXT_PUBLIC_BAR: string(),
				BAR: string(),
			},
			client: {},
			runtimeEnv: {
				BAR: "foo",
			},
		});
	});
});

test("client vars should be correctly prefixed", () => {
	ignoreErrors(() => {
		createEnv({
			server: {},
			client: {
				NEXT_PUBLIC_BAR: string(),
				// @ts-expect-error
				BAR: string(),
			},
			runtimeEnv: {
				NEXT_PUBLIC_BAR: "foo",
			},
		});
	});
});

test("runtimeEnv enforces all keys", () => {
	createEnv({
		server: {},
		client: { NEXT_PUBLIC_BAR: string() },
		runtimeEnv: { NEXT_PUBLIC_BAR: "foo" },
	});

	createEnv({
		server: { BAR: string() },
		client: { NEXT_PUBLIC_BAR: string() },
		runtimeEnv: { BAR: "foo", NEXT_PUBLIC_BAR: "foo" },
	});

	createEnv({
		server: {},
		client: { NEXT_PUBLIC_BAR: string() },
		runtimeEnv: {
			NEXT_PUBLIC_BAR: "foo",
			// @ts-expect-error - FOO_BAZ is extraneous
			FOO_BAZ: "baz",
		},
	});

	ignoreErrors(() => {
		createEnv({
			server: { BAR: string() },
			client: { NEXT_PUBLIC_BAR: string() },
			// @ts-expect-error - BAR is missing
			runtimeEnvStrict: {
				NEXT_PUBLIC_BAR: "foo",
			},
		});
	});
});

test("new experimental runtime option only requires client vars", () => {
	ignoreErrors(() => {
		createEnv({
			server: { BAR: string() },
			client: { NEXT_PUBLIC_BAR: string() },
			// @ts-expect-error - NEXT_PUBLIC_BAR is missing
			experimental__runtimeEnv: {},
		});
		createEnv({
			server: { BAR: string() },
			client: { NEXT_PUBLIC_BAR: string() },
			experimental__runtimeEnv: {
				// @ts-expect-error - BAR should not be specified
				BAR: "bar",
			},
		});
	});

	process.env = {
		BAR: "bar",
		NEXT_PUBLIC_BAR: "foo",
		NODE_ENV: "development",
	};

	const env = createEnv({
		shared: {
			NODE_ENV: picklist(["development", "production"]),
		},
		server: { BAR: string() },
		client: { NEXT_PUBLIC_BAR: string() },
		experimental__runtimeEnv: {
			NODE_ENV: process.env.NODE_ENV,
			NEXT_PUBLIC_BAR: process.env.NEXT_PUBLIC_BAR,
		},
	});

	expectTypeOf(env).toEqualTypeOf<
		Readonly<{
			BAR: string;
			NEXT_PUBLIC_BAR: string;
			NODE_ENV: "development" | "production";
		}>
	>();

	expect(env).toMatchObject({
		BAR: "bar",
		NEXT_PUBLIC_BAR: "foo",
		NODE_ENV: "development",
	});
});

describe("return type is correctly inferred", () => {
	test("simple", () => {
		const env = createEnv({
			server: { BAR: string() },
			client: { NEXT_PUBLIC_BAR: string() },
			runtimeEnv: {
				BAR: "bar",
				NEXT_PUBLIC_BAR: "foo",
			},
		});

		expectTypeOf(env).toEqualTypeOf<
			Readonly<{
				BAR: string;
				NEXT_PUBLIC_BAR: string;
			}>
		>();

		expect(env).toMatchObject({
			BAR: "bar",
			NEXT_PUBLIC_BAR: "foo",
		});
	});

	test("with transforms", () => {
		const env = createEnv({
			server: { BAR: transform(string(), Number) },
			client: { NEXT_PUBLIC_BAR: string() },
			runtimeEnv: {
				BAR: "123",
				NEXT_PUBLIC_BAR: "foo",
			},
		});

		expectTypeOf(env).toEqualTypeOf<
			Readonly<{
				BAR: number;
				NEXT_PUBLIC_BAR: string;
			}>
		>();

		expect(env).toMatchObject({
			BAR: 123,
			NEXT_PUBLIC_BAR: "foo",
		});
	});
});

test("can specify only server", () => {
	const onlyServer = createEnv({
		server: { BAR: string() },
		runtimeEnv: { BAR: "FOO" },
	});

	expectTypeOf(onlyServer).toMatchTypeOf<{
		BAR: string;
	}>();

	expect(onlyServer).toMatchObject({
		BAR: "FOO",
	});
});

test("can specify only client", () => {
	const onlyClient = createEnv({
		client: { NEXT_PUBLIC_BAR: string() },
		runtimeEnv: { NEXT_PUBLIC_BAR: "FOO" },
	});

	expectTypeOf(onlyClient).toMatchTypeOf<{
		NEXT_PUBLIC_BAR: string;
	}>();

	expect(onlyClient).toMatchObject({
		NEXT_PUBLIC_BAR: "FOO",
	});
});

describe("extending preset", () => {
	test("with invalid runtime envs", () => {
		const processEnv = {
			SERVER_ENV: "server",
			NEXT_PUBLIC_ENV: "client",
		};

		function lazyCreateEnv() {
			const preset = createEnv({
				server: {
					PRESET_ENV: string(),
				},
				experimental__runtimeEnv: processEnv,
			});

			return createEnv({
				server: {
					SERVER_ENV: string(),
				},
				client: {
					NEXT_PUBLIC_ENV: string(),
				},
				extends: [preset],
				runtimeEnv: processEnv,
			});
		}

		expectTypeOf(lazyCreateEnv).returns.toEqualTypeOf<
			Readonly<{
				SERVER_ENV: string;
				NEXT_PUBLIC_ENV: string;
				PRESET_ENV: string;
			}>
		>();

		const consoleError = vi.spyOn(console, "error");
		expect(() => lazyCreateEnv()).toThrow("Invalid environment variables");
		expect(consoleError.mock.calls[0]).toEqual([
			"❌ Invalid environment variables:",
			{ PRESET_ENV: ["Invalid type: Expected string but received undefined"] },
		]);
	});
	describe("single preset", () => {
		const processEnv = {
			PRESET_ENV: "preset",
			SHARED_ENV: "shared",
			SERVER_ENV: "server",
			NEXT_PUBLIC_ENV: "client",
		};

		function lazyCreateEnv() {
			const preset = createEnv({
				server: {
					PRESET_ENV: picklist(["preset"]),
				},
				runtimeEnv: processEnv,
			});

			return createEnv({
				server: {
					SERVER_ENV: string(),
				},
				shared: {
					SHARED_ENV: string(),
				},
				client: {
					NEXT_PUBLIC_ENV: string(),
				},
				extends: [preset],
				runtimeEnv: processEnv,
			});
		}

		expectTypeOf(lazyCreateEnv).returns.toEqualTypeOf<
			Readonly<{
				SERVER_ENV: string;
				SHARED_ENV: string;
				NEXT_PUBLIC_ENV: string;
				PRESET_ENV: "preset";
			}>
		>();

		test("server", () => {
			const { window } = globalThis;
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			globalThis.window = undefined as any;

			const env = lazyCreateEnv();

			expect(env).toMatchObject({
				SERVER_ENV: "server",
				SHARED_ENV: "shared",
				NEXT_PUBLIC_ENV: "client",
				PRESET_ENV: "preset",
			});

			globalThis.window = window;
		});

		test("client", () => {
			const { window } = globalThis;
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			globalThis.window = {} as any;

			const env = lazyCreateEnv();

			expect(() => env.SERVER_ENV).toThrow(
				"❌ Attempted to access a server-side environment variable on the client",
			);
			expect(() => env.PRESET_ENV).toThrow(
				"❌ Attempted to access a server-side environment variable on the client",
			);
			expect(env.SHARED_ENV).toBe("shared");
			expect(env.NEXT_PUBLIC_ENV).toBe("client");

			globalThis.window = window;
		});
	});
});

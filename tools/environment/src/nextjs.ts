import {
	type ServerClientOptions,
	type StrictOptions,
	createEnv as createEnvCore,
} from "./core";
import type { AnySchema } from "./utils";

const CLIENT_PREFIX = "NEXT_PUBLIC_" as const;
type ClientPrefix = typeof CLIENT_PREFIX;

type Options<
	TServer extends Record<string, AnySchema>,
	TClient extends Record<`${ClientPrefix}${string}`, AnySchema>,
	TShared extends Record<string, AnySchema>,
	TExtends extends Array<Record<string, unknown>>,
> = Omit<
	StrictOptions<ClientPrefix, TServer, TClient, TShared, TExtends> &
		ServerClientOptions<ClientPrefix, TServer, TClient>,
	"runtimeEnvStrict" | "runtimeEnv" | "clientPrefix"
> &
	(
		| {
				/**
				 * Manual destruction of `process.env`. Required for Next.js < 13.4.4.
				 */
				runtimeEnv: StrictOptions<
					ClientPrefix,
					TServer,
					TClient,
					TShared,
					TExtends
				>["runtimeEnvStrict"];
				experimental__runtimeEnv?: never;
		  }
		| {
				runtimeEnv?: never;
				/**
				 * Can be used for Next.js ^13.4.4 since they stopped static analysis of server side `process.env`.
				 * Only client side `process.env` is statically analyzed and needs to be manually destructured.
				 */
				experimental__runtimeEnv: Record<
					| {
							[TKey in keyof TClient]: TKey extends `${ClientPrefix}${string}`
								? TKey
								: never;
					  }[keyof TClient]
					| {
							[TKey in keyof TShared]: TKey extends string ? TKey : never;
					  }[keyof TShared],
					string | boolean | number | undefined
				>;
		  }
	);

export function createEnv<
	TServer extends Record<string, AnySchema> = NonNullable<unknown>,
	TClient extends Record<
		`${ClientPrefix}${string}`,
		AnySchema
	> = NonNullable<unknown>,
	TShared extends Record<string, AnySchema> = NonNullable<unknown>,
	const TExtends extends Array<Record<string, unknown>> = [],
>(opts: Options<TServer, TClient, TShared, TExtends>) {
	const client = typeof opts.client === "object" ? opts.client : {};
	const server = typeof opts.server === "object" ? opts.server : {};
	const shared = opts.shared;

	const runtimeEnv = opts.runtimeEnv
		? opts.runtimeEnv
		: {
				...process.env,
				...opts.experimental__runtimeEnv,
			};

	return createEnvCore<ClientPrefix, TServer, TClient, TShared, TExtends>({
		...opts,
		shared,
		client,
		server,
		clientPrefix: CLIENT_PREFIX,
		runtimeEnv,
	});
}

import type { ObjectSchema, Output, SchemaIssues } from "valibot";
import { flatten, merge, object, safeParse } from "valibot";
import type { AnySchema } from "./utils";

export type ErrorMessage<T extends string> = T;
export type Simplify<T> = {
	[P in keyof T]: T[P];
} & {};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type Impossible<T extends Record<string, any>> = Partial<
	Record<keyof T, never>
>;

type UnReadonlyObject<T> = T extends Readonly<infer U> ? U : T;

type Reduce<
	TArr extends Array<Record<string, unknown>>,
	// biome-ignore lint/complexity/noBannedTypes: <explanation>
	TAcc = {},
> = TArr extends []
	? TAcc
	: TArr extends [infer Head, ...infer Tail]
		? Tail extends Array<Record<string, unknown>>
			? Head & Reduce<Tail, TAcc>
			: never
		: never;

export interface BaseOptions<
	TShared extends Record<string, AnySchema>,
	TExtends extends Array<Record<string, unknown>>,
> {
	/**
	 * How to determine whether the app is running on the server or the client.
	 * @default typeof window === "undefined"
	 */
	isServer?: boolean;

	/**
	 * Shared variables, often those that are provided by build tools and is available to both client and server,
	 * but isn't prefixed and doesn't require to be manually supplied. For example `NODE_ENV`, `VERCEL_URL` etc.
	 */
	shared?: TShared;

	/**
	 * Extend preset
	 */
	extends?: TExtends;

	/**
	 * Called when validation fails. By default the error is logged,
	 * and an error is thrown telling what environment variables are invalid.
	 */
	onValidationError?: (error: SchemaIssues) => never;

	/**
	 * Called when a server-side environment variable is accessed on the client.
	 * By default an error is thrown.
	 */
	onInvalidAccess?: (variable: string) => never;

	/**
	 * Whether to skip validation of environment variables.
	 * @default false
	 */
	skipValidation?: boolean;

	/**
	 * By default, this library will feed the environment variables directly to
	 * the Valibot validator.
	 *
	 * This means that if you have an empty string for a value that is supposed
	 * to be a number (e.g. `PORT=` in a ".env" file), Valibot will incorrectly flag
	 * it as a type mismatch violation. Additionally, if you have an empty string
	 * for a value that is supposed to be a string with a default value (e.g.
	 * `DOMAIN=` in an ".env" file), the default value will never be applied.
	 *
	 * In order to solve these issues, we recommend that all new projects
	 * explicitly specify this option as true.
	 */
	emptyStringAsUndefined?: boolean;
}

export interface LooseOptions<
	TShared extends Record<string, AnySchema>,
	TExtends extends Array<Record<string, unknown>>,
> extends BaseOptions<TShared, TExtends> {
	runtimeEnvStrict?: never;

	/**
	 * What object holds the environment variables at runtime. This is usually
	 * `process.env` or `import.meta.env`.
	 */
	// Unlike `runtimeEnvStrict`, this doesn't enforce that all environment variables are set.
	runtimeEnv: Record<string, string | boolean | number | undefined>;
}

export interface StrictOptions<
	TPrefix extends string | undefined,
	TServer extends Record<string, AnySchema>,
	TClient extends Record<string, AnySchema>,
	TShared extends Record<string, AnySchema>,
	TExtends extends Array<Record<string, unknown>>,
> extends BaseOptions<TShared, TExtends> {
	/**
	 * Runtime Environment variables to use for validation - `process.env`, `import.meta.env` or similar.
	 * Enforces all environment variables to be set. Required in for example Next.js Edge and Client runtimes.
	 */
	runtimeEnvStrict: Record<
		| {
				[TKey in keyof TClient]: TPrefix extends undefined
					? never
					: TKey extends `${TPrefix}${string}`
						? TKey
						: never;
		  }[keyof TClient]
		| {
				[TKey in keyof TServer]: TPrefix extends undefined
					? TKey
					: TKey extends `${TPrefix}${string}`
						? never
						: TKey;
		  }[keyof TServer]
		| {
				[TKey in keyof TShared]: TKey extends string ? TKey : never;
		  }[keyof TShared],
		string | boolean | number | undefined
	>;
	runtimeEnv?: never;
}

export interface ClientOptions<
	TPrefix extends string | undefined,
	TClient extends Record<string, AnySchema>,
> {
	/**
	 * The prefix that client-side variables must have. This is enforced both at
	 * a type-level and at runtime.
	 */
	clientPrefix: TPrefix;

	/**
	 * Specify your client-side environment variables schema here. This way you can ensure the app isn't
	 * built with invalid env vars.
	 */
	client: Partial<{
		[TKey in keyof TClient]: TKey extends `${TPrefix}${string}`
			? TClient[TKey]
			: ErrorMessage<`${TKey extends string
					? TKey
					: never} is not prefixed with ${TPrefix}.`>;
	}>;
}

export interface ServerOptions<
	TPrefix extends string | undefined,
	TServer extends Record<string, AnySchema>,
> {
	/**
	 * Specify your server-side environment variables schema here. This way you can ensure the app isn't
	 * built with invalid env vars.
	 */
	server: Partial<{
		[TKey in keyof TServer]: TPrefix extends undefined
			? TServer[TKey]
			: TPrefix extends ""
				? TServer[TKey]
				: TKey extends `${TPrefix}${string}`
					? ErrorMessage<`${TKey extends `${TPrefix}${string}`
							? TKey
							: never} should not prefixed with ${TPrefix}.`>
					: TServer[TKey];
	}>;
}

export type ServerClientOptions<
	TPrefix extends string | undefined,
	TServer extends Record<string, AnySchema>,
	TClient extends Record<string, AnySchema>,
> =
	| (ClientOptions<TPrefix, TClient> & ServerOptions<TPrefix, TServer>)
	| (ServerOptions<TPrefix, TServer> & Impossible<ClientOptions<never, never>>)
	| (ClientOptions<TPrefix, TClient> & Impossible<ServerOptions<never, never>>);

export type EnvOptions<
	TPrefix extends string | undefined,
	TServer extends Record<string, AnySchema>,
	TClient extends Record<string, AnySchema>,
	TShared extends Record<string, AnySchema>,
	TExtends extends Array<Record<string, unknown>>,
> =
	| (LooseOptions<TShared, TExtends> &
			ServerClientOptions<TPrefix, TServer, TClient>)
	| (StrictOptions<TPrefix, TServer, TClient, TShared, TExtends> &
			ServerClientOptions<TPrefix, TServer, TClient>);

export function createEnv<
	TPrefix extends string | undefined,
	TServer extends Record<string, AnySchema> = NonNullable<unknown>,
	TClient extends Record<string, AnySchema> = NonNullable<unknown>,
	TShared extends Record<string, AnySchema> = NonNullable<unknown>,
	const TExtends extends Array<Record<string, unknown>> = [],
>(
	opts: EnvOptions<TPrefix, TServer, TClient, TShared, TExtends>,
): Readonly<
	Simplify<
		Output<ObjectSchema<TServer>> &
			Output<ObjectSchema<TClient>> &
			Output<ObjectSchema<TShared>> &
			UnReadonlyObject<Reduce<TExtends>>
	>
> {
	const runtimeEnv = opts.runtimeEnvStrict ?? opts.runtimeEnv ?? process.env;

	const emptyStringAsUndefined = opts.emptyStringAsUndefined ?? false;
	if (emptyStringAsUndefined) {
		for (const [key, value] of Object.entries(runtimeEnv)) {
			if (value === "") {
				delete runtimeEnv[key];
			}
		}
	}

	const skip = !!opts.skipValidation;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	if (skip) return runtimeEnv as any;

	const _client = typeof opts.client === "object" ? opts.client : {};
	const _server = typeof opts.server === "object" ? opts.server : {};
	const _shared = typeof opts.shared === "object" ? opts.shared : {};
	const client = object(_client);
	const server = object(_server);
	const shared = object(_shared);
	const isServer = opts.isServer ?? typeof window === "undefined";

	const allClient = merge([client, shared]);
	const allServer = merge([server, shared, client]);
	const parsed = isServer
		? safeParse(allServer, runtimeEnv) // on server we can validate all env vars
		: safeParse(allClient, runtimeEnv); // on client we can only validate the ones that are exposed

	const onValidationError =
		opts.onValidationError ??
		((error: SchemaIssues) => {
			console.error("❌ Invalid environment variables:", flatten(error).nested);
			throw new Error("Invalid environment variables");
		});

	const onInvalidAccess =
		opts.onInvalidAccess ??
		((_variable: string) => {
			throw new Error(
				"❌ Attempted to access a server-side environment variable on the client",
			);
		});

	if (parsed.success === false) {
		return onValidationError(parsed.issues);
	}

	const isServerAccess = (prop: string) => {
		if (!opts.clientPrefix) return true;
		return !prop.startsWith(opts.clientPrefix) && !(prop in shared.entries);
	};
	const isValidServerAccess = (prop: string) => {
		return isServer || !isServerAccess(prop);
	};
	const ignoreProp = (prop: string) => {
		return prop === "__esModule" || prop === "$$typeof";
	};

	const extendedObj = (opts.extends ?? []).reduce((acc, curr) => {
		return Object.assign(acc, curr);
	}, {});
	const fullObj = Object.assign(parsed.output, extendedObj);

	const env = new Proxy(fullObj, {
		get(target, prop) {
			if (typeof prop !== "string") return undefined;
			if (ignoreProp(prop)) return undefined;
			if (!isValidServerAccess(prop)) return onInvalidAccess(prop);
			return Reflect.get(target, prop);
		},
		// Maybe reconsider this in the future...
		// set(_target, prop) {
		// Readonly - this is the error message you get from assigning to a frozen object
		//   throw new Error(
		//     typeof prop === "string"
		//       ? `Cannot assign to read only property ${prop} of object #<Object>`
		//       : `Cannot assign to read only property of object #<Object>`
		//   );
		// },
	});

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	return env as any;
}

import { describe, expect, it } from "vitest";

import config from "../next.config.mjs";

describe("next.config.mjs", () => {
	it("should not specify reactStrictMode as true because it's true by default", () => {
		expect(config.reactStrictMode).toBeUndefined();
	});
});

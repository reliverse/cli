import { describe, expect, it } from "vitest";

describe("Example Test Suite", () => {
	it("should pass the example test", () => {
		const sum = (a: number, b: number) => a + b;
		expect(sum(1, 2)).toBe(3);
	});
});

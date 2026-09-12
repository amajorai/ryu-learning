import { afterEach, describe, expect, it } from "bun:test";
import {
	getHealingStatus,
	getLearningConfig,
	listExperience,
} from "./bridge.ts";

// ── Fake: window.ryu, set/torn-down per test (no mock.module). The three reads
//    are thin forwarders over `window.ryu.learning.*`; the `target` arg is inert
//    (the host owns the node token) and must never reach the bridge. ────────────

type Calls = { method: string; args: unknown[] }[];

function setWindow(ryu: unknown): void {
	(globalThis as { window?: unknown }).window = { ryu };
}

const MISSING_CAP = /grant learning:crud/;

afterEach(() => {
	(globalThis as { window?: unknown }).window = undefined;
});

// A learning surface that records every call and returns a tagged payload, so a
// test can prove which method each client function reached and that it returns
// that method's result unchanged.
function trackedBridge(): { calls: Calls } {
	const calls: Calls = [];
	setWindow({
		context: null,
		learning: {
			config: (...args: unknown[]) => {
				calls.push({ method: "config", args });
				return Promise.resolve({ tag: "config-out" });
			},
			experience: (...args: unknown[]) => {
				calls.push({ method: "experience", args });
				return Promise.resolve({ tag: "experience-out" });
			},
			healing: (...args: unknown[]) => {
				calls.push({ method: "healing", args });
				return Promise.resolve({ tag: "healing-out" });
			},
		},
	});
	return { calls };
}

describe("getLearningConfig", () => {
	it("forwards to window.ryu.learning.config() and returns its result", async () => {
		const { calls } = trackedBridge();
		const out = await getLearningConfig();
		expect(out as unknown).toEqual({ tag: "config-out" });
		expect(calls).toHaveLength(1);
		expect(calls[0]?.method).toBe("config");
	});

	it("ignores the target argument — it never reaches the bridge call", async () => {
		const { calls } = trackedBridge();
		await getLearningConfig({ url: "https://node.example", token: "secret" });
		// The target must not be forwarded into the sandboxed RPC (no token leak).
		expect(calls[0]?.args).toEqual([]);
	});
});

describe("listExperience", () => {
	it("forwards to window.ryu.learning.experience() and returns its result", async () => {
		const { calls } = trackedBridge();
		const out = await listExperience();
		expect(out as unknown).toEqual({ tag: "experience-out" });
		expect(calls[0]?.method).toBe("experience");
	});
});

describe("getHealingStatus", () => {
	it("forwards to window.ryu.learning.healing() and returns its result", async () => {
		const { calls } = trackedBridge();
		const out = await getHealingStatus();
		expect(out as unknown).toEqual({ tag: "healing-out" });
		expect(calls[0]?.method).toBe("healing");
	});
});

describe("missing bridge", () => {
	it("throws the capability hint for each read when window.ryu is absent", () => {
		setWindow(undefined);
		expect(() => getLearningConfig()).toThrow(MISSING_CAP);
		expect(() => listExperience()).toThrow(MISSING_CAP);
		expect(() => getHealingStatus()).toThrow(MISSING_CAP);
	});

	it("routes each read to its OWN learning method (no cross-wiring)", async () => {
		const { calls } = trackedBridge();
		await getLearningConfig();
		await listExperience();
		await getHealingStatus();
		expect(calls.map((c) => c.method)).toEqual([
			"config",
			"experience",
			"healing",
		]);
	});
});

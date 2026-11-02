import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
	getHealingStatus,
	getLearningConfig,
	listExperience,
} from "./bridge.ts";
import type { RyuBridge, RyuLearning } from "./ryu.d.ts";

// ── Fake: window.ryu, set/torn-down per test (no mock.module). The three reads
//    are thin forwarders over `window.ryu.learning.*`; the `target` arg is inert
//    (the host owns the node token) and must never reach the bridge. ────────────

type Calls = {
	method: keyof RyuLearning;
	args: Parameters<RyuLearning[keyof RyuLearning]>;
}[];

function setWindow(ryu: RyuBridge | undefined): void {
	Object.defineProperty(globalThis, "window", {
		configurable: true,
		writable: true,
		value: { ryu },
	});
}

const configFixture: Awaited<ReturnType<RyuLearning["config"]>> = {
	base_model: null,
	enabled: false,
	min_reward: 0.4,
	prm_model: "local-judge",
	prm_via_byo: false,
	skill_generation: 0,
	skills_enabled: false,
	synth_model: "local-synth",
};
const experienceFixture: Awaited<ReturnType<RyuLearning["experience"]>> = {
	experiences: [],
	min_reward: 0.4,
	scored: 0,
	total: 0,
	trainable: 0,
};
const healingFixture: Awaited<ReturnType<RyuLearning["healing"]>> = {
	attempts: {},
};
const MISSING_CAP = /grant learning:crud/;

let originalWindow: PropertyDescriptor | undefined;
beforeEach(() => {
	originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
});
afterEach(() => {
	if (originalWindow) {
		Object.defineProperty(globalThis, "window", originalWindow);
	} else {
		Reflect.deleteProperty(globalThis, "window");
	}
});

interface TrackedBridgeResult {
	calls: Calls;
}

// A learning surface that records every call and returns a concrete domain fixture, so a
// test can prove which method each client function reached and that it returns
// that method's result unchanged.
function trackedBridge(): TrackedBridgeResult {
	const calls: Calls = [];
	setWindow({
		context: null,
		learning: {
			config: (...args: Parameters<RyuLearning[keyof RyuLearning]>) => {
				calls.push({ method: "config", args });
				return Promise.resolve(configFixture);
			},
			experience: (...args: Parameters<RyuLearning[keyof RyuLearning]>) => {
				calls.push({ method: "experience", args });
				return Promise.resolve(experienceFixture);
			},
			healing: (...args: Parameters<RyuLearning[keyof RyuLearning]>) => {
				calls.push({ method: "healing", args });
				return Promise.resolve(healingFixture);
			},
		},
	});
	return { calls };
}

describe("getLearningConfig", () => {
	it("forwards to window.ryu.learning.config() and returns its result", async () => {
		const { calls } = trackedBridge();
		const out = await getLearningConfig();
		expect(out).toEqual(configFixture);
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
		expect(out).toEqual(experienceFixture);
		expect(calls[0]?.method).toBe("experience");
	});
});

describe("getHealingStatus", () => {
	it("forwards to window.ryu.learning.healing() and returns its result", async () => {
		const { calls } = trackedBridge();
		const out = await getHealingStatus();
		expect(out).toEqual(healingFixture);
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

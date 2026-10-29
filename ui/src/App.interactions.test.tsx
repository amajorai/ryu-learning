import { afterEach, describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import type { Root } from "react-dom/client";
import type { ExperienceList, HealingStatus, LearningConfig } from "./types.ts";

if (!GlobalRegistrator.isRegistered) {
	GlobalRegistrator.register();
}
Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { App } = await import("./App.tsx");

interface MountedApp {
	container: HTMLDivElement;
	root: Root;
}

const mountedApps: MountedApp[] = [];

async function tick(delay = 0): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, delay));
}

interface InstallBridgeResult {
	calls: { config: number; experience: number; healing: number };
	failNextExperience: (error: Error) => void;
	setExperience: (next: ExperienceList) => void;
}

function installBridge(): InstallBridgeResult {
	const calls = { config: 0, experience: 0, healing: 0 };
	let experience: ExperienceList = {
		experiences: [],
		min_reward: 0.4,
		scored: 2,
		total: 5,
		trainable: 1,
	};
	const config: LearningConfig = {
		base_model: "qwen3",
		enabled: true,
		min_reward: 0.4,
		prm_model: "local-judge",
		prm_via_byo: false,
		skill_generation: 3,
		skills_enabled: true,
		synth_model: "local-synth",
	};
	const healing: HealingStatus = {
		attempts: {
			"conversation-fixture": {
				count: 1,
				given_up: false,
				last_at: Math.floor(Date.now() / 1000),
			},
		},
	};
	let experienceFailure: Error | null = null;
	Reflect.set(window, "ryu", {
		context: null,
		learning: {
			config: async () => {
				calls.config += 1;
				return config;
			},
			experience: async () => {
				calls.experience += 1;
				if (experienceFailure) {
					const error = experienceFailure;
					experienceFailure = null;
					throw error;
				}
				return experience;
			},
			healing: async () => {
				calls.healing += 1;
				return healing;
			},
		},
	});
	return {
		calls,
		failNextExperience(error) {
			experienceFailure = error;
		},
		setExperience(next) {
			experience = next;
		},
	};
}

async function mountApp(): Promise<HTMLDivElement> {
	const container = document.createElement("div");
	document.body.append(container);
	const root = createRoot(container);
	mountedApps.push({ container, root });
	await act(async () => {
		root.render(<App />);
		await tick(10);
	});
	return container;
}

async function clickButton(
	container: HTMLElement,
	name: string,
	delay = 0
): Promise<void> {
	const button = [...container.querySelectorAll("button")].find(
		(candidate) =>
			candidate.getAttribute("aria-label") === name ||
			candidate.textContent?.replace(/\s+/g, " ").trim() === name
	);
	if (!(button instanceof HTMLButtonElement)) {
		throw new Error(`Could not find Learning button: ${name}`);
	}
	await act(async () => {
		button.click();
		await tick(delay);
	});
}

afterEach(async () => {
	for (const { container, root } of mountedApps.splice(0)) {
		await act(async () => root.unmount());
		container.remove();
	}
	Reflect.set(window, "ryu", undefined);
});

describe("Learning rendered read-only dashboard", () => {
	test("refresh updates experience counts through only the local learning bridge", async () => {
		const fixture = installBridge();
		const container = await mountApp();
		expect(container.textContent).toContain("Learn skills from my chats");
		expect(container.textContent).toContain("Train my local model");
		expect(container.textContent).toContain("5");
		expect(fixture.calls).toEqual({ config: 1, experience: 1, healing: 1 });

		fixture.setExperience({
			experiences: [],
			min_reward: 0.4,
			scored: 6,
			total: 9,
			trainable: 4,
		});
		await clickButton(container, "Refresh", 20);
		expect(fixture.calls).toEqual({ config: 1, experience: 2, healing: 1 });
		expect(container.textContent).toContain("9");
		expect(container.textContent).toContain("6");
		expect(container.textContent).toContain("4");
	});

	test("a refused refresh retains the last readback and retries exactly once", async () => {
		const fixture = installBridge();
		const container = await mountApp();
		expect(container.textContent).toContain("5");
		fixture.failNextExperience(
			new Error("Learning history is temporarily unavailable.")
		);

		await clickButton(container, "Refresh", 20);
		expect(fixture.calls).toEqual({ config: 1, experience: 2, healing: 1 });
		expect(container.textContent).toContain("5");
		expect(container.textContent).toContain("Refresh");

		fixture.setExperience({
			experiences: [],
			min_reward: 0.4,
			scored: 7,
			total: 11,
			trainable: 3,
		});
		await clickButton(container, "Refresh", 20);
		expect(fixture.calls).toEqual({ config: 1, experience: 3, healing: 1 });
		expect(container.textContent).toContain("11");
		expect(container.textContent).toContain("7");
		expect(container.textContent).toContain("3");
	});
});

import { describe, expect, test } from "bun:test";
import {
	experienceListSchema,
	healingStatusSchema,
	learningConfigSchema,
} from "./schemas.ts";

describe("learning bridge readback contracts", () => {
	test("nullable model and reward fields remain nullable with additive Core metadata", () => {
		const config = {
			base_model: null,
			enabled: false,
			min_reward: 0.4,
			prm_model: "judge",
			prm_via_byo: false,
			skill_generation: 0,
			skills_enabled: false,
			synth_model: "synth",
			future_option: { enabled: true },
		};
		expect(learningConfigSchema.parse(config)).toEqual(config);
		const list = {
			experiences: [
				{
					agent_id: null,
					assistant_text: "answer",
					base_model: null,
					conversation_id: "conversation",
					excluded: false,
					id: "turn",
					outcome: "captured",
					reward: null,
					skill_generation: 0,
					user_text: "question",
				},
			],
			min_reward: 0.4,
			scored: 0,
			total: 1,
			trainable: 0,
		};
		expect(experienceListSchema.parse(list)).toEqual(list);
	});
	test("malformed counts and healing records are rejected before rendering", () => {
		expect(
			experienceListSchema.safeParse({
				experiences: [],
				min_reward: 0.4,
				scored: 0,
				total: "1",
				trainable: 0,
			}).success
		).toBe(false);
		expect(
			healingStatusSchema.safeParse({
				attempts: {
					"job:one": { count: 1, given_up: false, last_at: "yesterday" },
				},
			}).success
		).toBe(false);
	});
});

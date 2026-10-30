import {
	learningConfigSchema as hostLearningConfigSchema,
	learningExperienceListSchema,
	learningExperienceSchema,
	learningHealAttemptSchema,
	learningHealingStatusSchema,
} from "@ryu/app-host/rpc";
import type { z } from "zod";
import type {
	Experience,
	ExperienceList,
	HealAttempt,
	HealingStatus,
	LearningConfig,
} from "./types.ts";

export const learningConfigSchema =
	hostLearningConfigSchema satisfies z.ZodType<LearningConfig>;
export const experienceSchema =
	learningExperienceSchema satisfies z.ZodType<Experience>;
export const experienceListSchema =
	learningExperienceListSchema satisfies z.ZodType<ExperienceList>;
export const healAttemptSchema =
	learningHealAttemptSchema satisfies z.ZodType<HealAttempt>;
export const healingStatusSchema =
	learningHealingStatusSchema satisfies z.ZodType<HealingStatus>;

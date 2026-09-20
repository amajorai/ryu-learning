// The learning-loop model — ported verbatim from the desktop clients
// `apps/desktop/src/lib/api/learn.ts` + `apps/desktop/src/lib/api/healing.ts`
// (snake_case, mirroring Core's serde shapes), which the host bridge reuses: its
// closures call `getLearningConfig`/`listExperience`/`getHealingStatus` and forward
// the results unchanged over the bridge, so the app reads exactly what the desktop
// page read.

/** Resolved, client-safe learning config (mirrors Core's `LearningConfig`). */
export interface LearningConfig {
	base_model: string | null;
	enabled: boolean;
	min_reward: number;
	prm_model: string;
	prm_via_byo: boolean;
	skill_generation: number;
	skills_enabled: boolean;
	synth_model: string;
}

/** One captured turn in the experience buffer (mirrors Core's `Experience`). */
export interface Experience {
	agent_id: string | null;
	assistant_text: string;
	base_model: string | null;
	conversation_id: string;
	excluded: boolean;
	id: string;
	outcome: string;
	reward: number | null;
	skill_generation: number;
	user_text: string;
}

export interface ExperienceList {
	experiences: Experience[];
	min_reward: number;
	scored: number;
	total: number;
	trainable: number;
}

/** Per-source heal bookkeeping (mirrors Core's `HealAttempt`). */
export interface HealAttempt {
	count: number;
	given_up: boolean;
	/** Unix millis of the last heal for this source. */
	last_at: number;
}

export interface HealingStatus {
	/** Keyed by source id (a conversation id, `job:<id>`, or a workflow run id). */
	attempts: Record<string, HealAttempt>;
}

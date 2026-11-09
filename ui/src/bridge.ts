import {
	experienceListSchema,
	healingStatusSchema,
	learningConfigSchema,
} from "./schemas.ts";
// The client layer the ported page calls. It mirrors the desktop clients the
// learning page composed — `lib/api/learn.ts` (`getLearningConfig`,
// `listExperience`) and `lib/api/healing.ts` (`getHealingStatus`) — with the SAME
// function names + (target-first) signatures + return types, but every call goes
// over the `window.ryu` bridge instead of a direct `fetch`. The `target` argument is
// IGNORED (the host holds the node token; the sandboxed frame never sees it), kept
// only so the copied component call-sites need no edits. Return shapes match the
// desktop clients verbatim because the host closures reuse those very clients.

import type { RyuBridge } from "./ryu.d.ts";
import type { ExperienceList, HealingStatus, LearningConfig } from "./types.ts";

/** A node target the shell passes around. In the sandbox it is inert (the host
 *  owns the token); kept so the ported call-sites type-check unchanged. */
export interface ApiTarget {
	token: string | null;
	url: string;
}

function ryu(): RyuBridge {
	const b = globalThis.window?.ryu;
	if (!b) {
		throw new Error(
			"The learning capability is not available for this app (grant learning:crud)."
		);
	}
	return b;
}

/** Read the current learning config (`GET /api/learn/config`). */
export function getLearningConfig(_t?: ApiTarget): Promise<LearningConfig> {
	return ryu()
		.learning.config()
		.then((reply) => learningConfigSchema.parse(reply));
}

/** Read the experience buffer + its scored/trainable counts
 *  (`GET /api/experience/list`). */
export function listExperience(_t?: ApiTarget): Promise<ExperienceList> {
	return ryu()
		.learning.experience()
		.then((reply) => experienceListSchema.parse(reply));
}

/** Read the in-memory per-source heal-attempt map (`GET /api/healing/status`) —
 *  read-only observability; the approve/reject heal inbox stays in Approvals. */
export function getHealingStatus(_t?: ApiTarget): Promise<HealingStatus> {
	return ryu()
		.learning.healing()
		.then((reply) => healingStatusSchema.parse(reply));
}

// The `window.ryu` bridge surface this app consumes. The host installs it inline
// (Path B bootstrap) BEFORE this module runs; every method is a capability-gated
// RPC over a MessagePort — no tokens, no direct network (the frame's CSP is
// `connect-src 'none'`). Calls made before the host port arrives are queued and
// flushed on connect. This app needs only the `learning` surface (grant
// `learning:crud`); Core owns the `/api/learn/config` + `/api/experience/list` +
// `/api/healing/status` reads behind it.
//
// The return shapes mirror the desktop clients the host reuses verbatim (the host
// closures call `getLearningConfig`/`listExperience`/`getHealingStatus` and forward
// Core's snake_case shapes), so `bridge.ts` re-declares the concrete types and casts
// these `unknown`s. The whole family is READ-ONLY (this is the "what has it learned /
// what is it doing" surface); the *actions* — skill approvals + the heal inbox —
// live in the Inbox, and the opt-ins in this app's Learning settings tab, both
// untouched here.

export interface RyuLearning {
	/** GET /api/learn/config — resolved, secret-free learning config (both opt-ins,
	 *  models, skill generation). */
	config(): Promise<unknown>;
	/** GET /api/experience/list — the experience buffer + its scored/trainable
	 *  counts (most-recent captured turns). */
	experience(): Promise<unknown>;
	/** GET /api/healing/status — the in-memory per-source heal-attempt map
	 *  (read-only observability; the approve/reject inbox stays in Approvals). */
	healing(): Promise<unknown>;
}

export interface RyuBridge {
	context: { spaceId?: string; docId?: string } | null;
	learning: RyuLearning;
}

declare global {
	interface Window {
		ryu?: RyuBridge;
	}
}

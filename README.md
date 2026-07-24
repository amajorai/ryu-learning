# ryu-learning

Continual-learning loop for Ryu — turn chats and runs into reusable skills, gated by the approval inbox, with an experience log.

> **The public home of `ryu-learning`.** Source, builds, and releases live here —
> binaries for every platform are attached to each release.
>
> This tree is generated from the Ryu monorepo, so commits pushed here
> directly are replaced on the next sync. **Pull requests are welcome** —
> open them here and they are ported into the monorepo, then flow back out.
> Ryu as a whole: https://github.com/amajorai/ryu

## Install

- Binary: `ryu-learning` from the [Ryu releases](https://github.com/amajorai/ryu/releases).
- Crate: `cargo install ryu-learning`.

## License

Apache-2.0 — see [LICENSE](./LICENSE).

---

# com.ryu.learning — Learning

The learning loop: turn chats and runs into reusable **skills**, gated by the
approval Inbox, with an experience log of what was learned. The app surface for
Ryu's Hermes-style "make a skill from this chat" flow.

## Parts

- **`ui/` — companion (the only wired surface).** A sandboxed full-page Companion
  (Path B, `ui_format: "html"`), built to one self-contained `dist/index.html` via
  `vite-plugin-singlefile`. It drives Core's existing learning orchestration
  (`/api/learn/config`, `/api/experience/list`) entirely through the `window.ryu`
  bridge — no direct `fetch`, no node token in the sandbox.
- **`backend/` — the `ryu-learning` capability crate.** The learning ENGINE (sweep /
  PRM-score / synthesize-skill / reward-filtered cycle), the durable
  `ExperienceStore` (`experience.db`), and the `/api/learn/*` + `/api/experience/list`
  router. ZERO dependency on `apps/core`: every Core-owned callback is inverted
  through the `LearningHost` trait and the `~/.ryu` data dir through `init_data_dir`.
  Core consumes it as a **path dependency, compiled in-process** — see the
  adjudication below.

## The crate is extracted; the PROCESS is deliberately not split

This app is the documented exception to the usual apps-store shape: it ships a
backend crate but **no sidecar spec and no `http.public_mount`**, and Core keeps
serving `/api/learn/*` itself (`apps/core/src/server/learning.rs`). That is a
decision, not unfinished work.

Adjudication (Outcome B, 2026-07-18 — re-confirmed 2026-07-24): the learning loop is
welded to six live Core kernel subsystems — conversation store, Gateway PRM/synth
side-model, approvals inbox, skills registry, fine-tune dispatch, preference store —
through a 10-method `LearningHost` seam invoked ~40 times, and the sweep iterates the
WHOLE conversation corpus per run. Out-of-process, none of those is reachable without
a broker-back HTTP surface Core does not expose, so a move would relocate a
data-hungry consumer away from its data for a job that fires ~once/day. Two further
couplings are not HTTP at all and a route move would not touch
them: the scheduler's `LearningCycle` job and the approvals engine (on approve) call
the crate directly, and the thumbs-feedback sink
(`crate::learning::apply_message_feedback`) writes Core's `memory`/`retrieval` stores.
`experience.db` is likewise opened in-process by all three.

The `[[bin]] ryu-learning` in `backend/` is therefore **dormant forward-scaffolding**:
it proves the crate is process-shell-able (loopback bind + fail-closed `RYU_EXT_TOKEN`
gate, mirroring `ryu-finetune`) and its `SidecarLearningHost` degrades to a documented
`Err` on every welded callback rather than fabricating a result. Core never spawns or
health-checks it (no `RYU_LEARNING_BIN`, no port `8002` in `apps/core`). Wiring it as
it stands would regress the whole surface, and not uniformly — worth stating exactly,
because "it 500s" is the wrong summary:

- `sweep` / `score` / `synthesize` / `cycle` — hard-error; every one bottoms out in a
  `bail!`ing callback.
- `config` — answers `200` with the placeholder `gpt-4o-mini` defaults instead of the
  real ones from Core's model registry. Plausible and wrong, which is worse.
- `experience/list` — answers `200` off the real `experience.db`, but with
  default-resolved counts (`min_reward`, trainable) because the pref store is a no-op.
- `exclude` — answers `200` while `pref_set` silently drops the per-conversation
  opt-out, so an excluded chat is re-swept on the next cycle. A consent guarantee that
  reports success and does nothing.
- `synthesize` additionally loses the kernel-owned per-conversation read ACL
  (`require_conversation_read_by_id`), which is why that handler is Core-side in the
  first place; `apps/core/src/server/mod.rs` carries a test asserting it stays there.

Full rationale: `apps/core/src/learning/mod.rs` module doc.

The two-flag consent model (`learning.skills-enabled` vs `learning.enabled`) and the
approval routing live in that crate + Core glue, not in this app's UI.

## Manifest (`manifest.json`)

- **Capability grant:** `learning:crud` — the bridge capability the companion calls.
- **Dependency:** `requires.apps` → `com.ryu.skills >= 1.0.0` (proposed skills are
  written through the Skills app; the plugin dependency graph enforces enable order).
- **Runnable:** one `companion` (`Learning`, icon `mortarboard-01`).
- **No `sidecar` block and no `http.public_mount`** — intentional, per the
  adjudication above. Do not add them without first landing the broker-back
  endpoints; the fixture at
  `apps/core/src/plugin_manifest/fixtures/learning.manifest.json` must stay
  byte-identical to this manifest either way.

## Surfaces as

A companion route in the shell (label **Learning**). Proposed skills route through
the approval Inbox (`com.ryu.approvals`) before they become active, keeping the
learning loop human-gated.

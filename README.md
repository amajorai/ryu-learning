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

- **`ui/` — companion (companion-only app, no backend crate).** A sandboxed
  full-page Companion (Path B, `ui_format: "html"`), built to one self-contained
  `dist/index.html` via `vite-plugin-singlefile`. It drives Core's existing
  learning orchestration (`/api/learning/*`) entirely through the `window.ryu`
  bridge — no direct `fetch`, no node token in the sandbox.

There is no dedicated backend crate or sidecar: the learning brain (skill proposal,
the two-flag consent model — `learning.skills-enabled` vs `learning.enabled` — and
the approval routing) lives in Core; this app is only the surface.

## Manifest (`plugin.json`)

- **Capability grant:** `learning:crud` — the bridge capability the companion calls.
- **Dependency:** `requires.apps` → `com.ryu.skills >= 1.0.0` (proposed skills are
  written through the Skills app; the plugin dependency graph enforces enable order).
- **Runnable:** one `companion` (`Learning`, icon `mortarboard-01`).

## Surfaces as

A companion route in the shell (label **Learning**). Proposed skills route through
the approval Inbox (`com.ryu.approvals`) before they become active, keeping the
learning loop human-gated.

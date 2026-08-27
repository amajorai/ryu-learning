// The Learning companion root — the port of the desktop `pages/LearningPage.tsx`.
// A read-only window into Ryu's continual-learning loop — the two opt-in levels, the
// models in use, and (when training is on) the experience buffer it has captured,
// plus the read-only self-healing attempt history. The *actions* live elsewhere:
// skill suggestions land in the Inbox (approve/reject there), and the opt-ins are
// toggled in this app's own Learning settings tab (manifest-registered via
// `contributes.settings_tabs`). This page is the "what has it learned / what is it
// doing" surface.
//
// The desktop page read three react-query hooks (`getLearningConfig`,
// `listExperience`, `getHealingStatus`) with a 30s refetch; here the same three
// reads go over the `window.ryu` bridge, polling every 15s in the background (silent
// — the spinner/Refresh button never flicker on a tick). The component tree below is
// a byte-identical port; only the data layer (node/target → bridge) changed.

import {
	Cancel01Icon,
	CheckmarkCircle02Icon,
	Mortarboard01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@ryu/ui/components/badge.tsx";
import { Button } from "@ryu/ui/components/button.tsx";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@ryu/ui/components/empty.tsx";
import { Spinner } from "@ryu/ui/components/spinner.tsx";
import {
	getHealingStatus,
	getLearningConfig,
	listExperience,
} from "./bridge.ts";
import { useQuery } from "@ryu/ui/hooks/use-query.ts";
import type { Experience, HealAttempt } from "./types.ts";

const POLL_MS = 15_000;
const PREVIEW_CHARS = 140;
const REWARD_PERCENT = 100;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

function truncate(text: string): string {
	const t = text.trim();
	return t.length > PREVIEW_CHARS ? `${t.slice(0, PREVIEW_CHARS)}…` : t;
}

function relativeTime(atSeconds: number): string {
	const diffSec = Math.max(
		0,
		Math.round(Date.now() / MS_PER_SECOND - atSeconds)
	);
	if (diffSec < SECONDS_PER_MINUTE) {
		return "just now";
	}
	const minutes = Math.round(diffSec / SECONDS_PER_MINUTE);
	if (minutes < MINUTES_PER_HOUR) {
		return `${minutes}m ago`;
	}
	const hours = Math.round(minutes / MINUTES_PER_HOUR);
	if (hours < HOURS_PER_DAY) {
		return `${hours}h ago`;
	}
	return `${Math.round(hours / HOURS_PER_DAY)}d ago`;
}

export function App() {
	const configQuery = useQuery({
		queryKey: ["learning", "config"],
		queryFn: () => getLearningConfig(),
		refetchInterval: POLL_MS,
	});
	const experienceQuery = useQuery({
		queryKey: ["learning", "experience"],
		queryFn: () => listExperience(),
		refetchInterval: POLL_MS,
	});
	const healingQuery = useQuery({
		queryKey: ["healing", "status"],
		queryFn: () => getHealingStatus(),
		refetchInterval: POLL_MS,
	});

	const config = configQuery.data;
	const experience = experienceQuery.data;
	const rows = experience?.experiences ?? [];
	const healRows = Object.entries(healingQuery.data?.attempts ?? {});

	return (
		<div className="mx-auto flex h-full w-full max-w-2xl flex-col gap-6 overflow-y-auto p-6">
			<header>
				<h1 className="font-semibold text-xl">Learning</h1>
				<p className="text-muted-foreground text-sm">
					How Ryu grows with you. Skill suggestions appear in your Inbox to
					approve; the opt-ins live in Learning settings.
				</p>
			</header>

			{/* Status */}
			<section className="flex flex-col gap-3">
				<h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
					Status
				</h2>
				{configQuery.isLoading ? (
					<div className="flex justify-center py-4">
						<Spinner className="size-5" />
					</div>
				) : null}
				{config ? (
					<div className="flex flex-col gap-2">
						<StatusRow
							description="On-device. Distills reusable skills from your chats and proposes them in your Inbox."
							on={config.skills_enabled}
							title="Learn skills from my chats"
						/>
						<StatusRow
							description="Opt-in. Rates conversations with a stronger model and fine-tunes your local model on the best ones."
							on={config.enabled}
							title="Train my local model"
						/>
						<div className="rounded-lg bg-card/50 p-3 text-muted-foreground text-xs">
							<span className="font-medium">Skill model:</span>{" "}
							{config.synth_model} · <span className="font-medium">Judge:</span>{" "}
							{config.prm_model}
							{config.prm_via_byo ? " (your endpoint)" : ""} ·{" "}
							<span className="font-medium">Skill generation:</span>{" "}
							{config.skill_generation}
						</div>
					</div>
				) : null}
				{configQuery.isError ? (
					<p className="text-destructive text-sm">
						Couldn't load learning status.
					</p>
				) : null}
			</section>

			{/* Experience buffer (training path) */}
			<section className="flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
						Experience buffer
					</h2>
					<Button
						disabled={experienceQuery.isFetching}
						onClick={() => {
							void experienceQuery.refetch();
						}}
						size="sm"
						variant="outline"
					>
						{experienceQuery.isFetching ? "Refreshing…" : "Refresh"}
					</Button>
				</div>

				{experience ? (
					<div className="grid grid-cols-3 gap-2">
						<Stat label="Captured" value={experience.total} />
						<Stat label="Scored" value={experience.scored} />
						<Stat label="Trainable" value={experience.trainable} />
					</div>
				) : null}

				{!experienceQuery.isLoading && rows.length === 0 ? (
					<Empty className="py-10">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<HugeiconsIcon className="size-6" icon={Mortarboard01Icon} />
							</EmptyMedia>
							<EmptyTitle>Nothing captured yet</EmptyTitle>
							<EmptyDescription>
								Turn on “Train my local model” in Learning settings to start
								capturing conversations for training. Skill learning works
								without this.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : null}

				{rows.length > 0 ? (
					<ul className="flex flex-col gap-2">
						{rows.map((row) => (
							<ExperienceRow key={row.id} row={row} />
						))}
					</ul>
				) : null}
			</section>

			{/* Self-healing history (per-source attempt state) */}
			<section className="flex flex-col gap-3">
				<h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
					Self-healing
				</h2>
				{healRows.length > 0 ? (
					<ul className="flex flex-col gap-2">
						{healRows.map(([source, attempt]) => (
							<HealRow attempt={attempt} key={source} source={source} />
						))}
					</ul>
				) : (
					<p className="text-muted-foreground text-sm">
						No failed runs have needed healing yet. Fixes appear in your Inbox
						unless auto-fix is on (Privacy settings).
					</p>
				)}
			</section>
		</div>
	);
}

// Turn a source id into a friendly label: `job:<id>` → "Scheduled job",
// `healrun_…`/workflow ids stay as-is (shortened), conversations show a short id.
function healSourceLabel(source: string): string {
	if (source.startsWith("job:")) {
		return "Scheduled job";
	}
	if (source.startsWith("heal-exhausted:")) {
		return "Exhausted";
	}
	return source.length > 18 ? `${source.slice(0, 18)}…` : source;
}

function HealRow({
	source,
	attempt,
}: {
	source: string;
	attempt: HealAttempt;
}) {
	return (
		<li className="flex items-center justify-between gap-2 rounded-lg bg-card p-3">
			<div className="min-w-0">
				<p className="truncate font-medium text-sm">
					{healSourceLabel(source)}
				</p>
				<p className="text-muted-foreground text-xs">
					{attempt.count} attempt{attempt.count === 1 ? "" : "s"}
					{attempt.last_at > 0
						? ` · ${relativeTime(attempt.last_at / MS_PER_SECOND)}`
						: ""}
				</p>
			</div>
			{attempt.given_up ? (
				<Badge variant="destructive">gave up</Badge>
			) : (
				<Badge variant="secondary">healing</Badge>
			)}
		</li>
	);
}

function StatusRow({
	title,
	description,
	on,
}: {
	title: string;
	description: string;
	on: boolean;
}) {
	return (
		<div className="flex items-start justify-between gap-3 rounded-lg bg-card p-3">
			<div className="min-w-0">
				<p className="font-medium text-sm">{title}</p>
				<p className="mt-1 text-muted-foreground text-xs">{description}</p>
			</div>
			<Badge variant={on ? "default" : "outline"}>
				<HugeiconsIcon
					className="mr-1 size-3"
					icon={on ? CheckmarkCircle02Icon : Cancel01Icon}
				/>
				{on ? "On" : "Off"}
			</Badge>
		</div>
	);
}

function Stat({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-lg bg-card p-3 text-center">
			<p className="font-semibold text-lg">{value}</p>
			<p className="text-muted-foreground text-xs">{label}</p>
		</div>
	);
}

function ExperienceRow({ row }: { row: Experience }) {
	const reward =
		row.reward === null ? null : `${Math.round(row.reward * REWARD_PERCENT)}%`;
	return (
		<li className="rounded-lg bg-card p-3">
			<div className="flex items-center justify-between gap-2">
				<span className="truncate text-muted-foreground text-xs">
					{row.agent_id ?? "default"} · {row.outcome}
				</span>
				{reward === null ? (
					<Badge variant="outline">unscored</Badge>
				) : (
					<Badge variant="secondary">reward {reward}</Badge>
				)}
			</div>
			<p className="mt-1 truncate text-sm">{truncate(row.user_text)}</p>
		</li>
	);
}

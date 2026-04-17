<script lang="ts">
	import type { Course } from "$lib/domain/entities/course";
	import { Credit } from "$lib/domain/value-objects/credit";
	import Badge from "../ui/Badge.svelte";

	type BadgeVariant = "accent" | "warning" | "neutral" | "success" | "danger";

	interface Annotation {
		readonly course: Course;
		readonly badge: {
			readonly variant: BadgeVariant;
			readonly label: string;
		} | null;
	}

	interface Props {
		readonly courses: readonly Course[];
		readonly emptyMessage?: string;
		readonly annotations?: readonly Annotation[];
	}

	const {
		courses,
		emptyMessage = "該当科目はありません",
		annotations,
	}: Props = $props();

	const badgeById = $derived.by(() => {
		const map = new Map<string, Annotation["badge"]>();
		for (const a of annotations ?? []) {
			map.set(a.course.id as string, a.badge);
		}
		return map;
	});
</script>

{#if courses.length === 0}
	<p class="text-sm text-[color:var(--color-fg-subtle)]">{emptyMessage}</p>
{:else}
	<ul
		class="divide-y divide-[color:var(--color-divider)] rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]"
	>
		{#each courses as course (course.id)}
			{@const badge = badgeById.get(course.id as string)}
			<li
				class="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-3 sm:px-5"
			>
				<div class="flex-1 min-w-0 space-y-0.5">
					<p class="break-words text-[color:var(--color-fg)] sm:truncate">
						{course.name}
					</p>
					<p
						class="break-words text-xs text-[color:var(--color-fg-subtle)] tabular-nums sm:truncate"
					>
						{course.rawCategoryLabel}
						{#if course.year !== undefined}
							・{course.year}年度
						{/if}
					</p>
					{#if badge}
						<div class="pt-1">
							<Badge variant={badge.variant}>{badge.label}</Badge>
						</div>
					{/if}
				</div>
				<div class="flex items-center gap-3 self-end sm:self-auto">
					<span
						class="shrink-0 rounded-[var(--radius-micro)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-alt)] px-2 py-0.5 text-xs font-mono text-[color:var(--color-fg-muted)]"
					>
						{course.grade}
					</span>
					<span
						class="shrink-0 text-xs tabular-nums text-[color:var(--color-fg-muted)]"
					>
						{Credit.toNumber(course.credit)} 単位
					</span>
				</div>
			</li>
		{/each}
	</ul>
{/if}

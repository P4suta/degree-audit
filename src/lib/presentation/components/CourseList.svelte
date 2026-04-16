<script lang="ts">
	import type { Course } from "$lib/domain/entities/course";
	import { Credit } from "$lib/domain/value-objects/credit";

	interface Props {
		readonly courses: readonly Course[];
		readonly emptyMessage?: string;
	}

	const { courses, emptyMessage = "該当科目はありません" }: Props = $props();
</script>

{#if courses.length === 0}
	<p class="text-sm text-slate-500">{emptyMessage}</p>
{:else}
	<ul class="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
		{#each courses as course (course.id)}
			<li class="flex items-center justify-between gap-3 px-4 py-3 text-sm">
				<div class="flex-1 min-w-0">
					<p class="truncate font-medium text-slate-900">{course.name}</p>
					<p class="truncate text-xs text-slate-500">
						{course.rawCategoryLabel}
						{#if course.year !== undefined}
							・{course.year}年度
						{/if}
					</p>
				</div>
				<span class="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700">
					{course.grade}
				</span>
				<span class="shrink-0 text-xs text-slate-600">
					{Credit.toNumber(course.credit)} 単位
				</span>
			</li>
		{/each}
	</ul>
{/if}

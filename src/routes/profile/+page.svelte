<script lang="ts">
	import { base } from "$app/paths";
	import { StudentProfile } from "$lib/domain/entities/student-profile";
	import { isErr } from "$lib/domain/errors/result";
	import { safeGoto } from "$lib/presentation/navigation";
	import { errorsStore } from "$lib/presentation/stores/errors.svelte";
	import { profileStore } from "$lib/presentation/stores/profile.svelte";

	const YEAR_HISTORY_LENGTH = 10;
	const TYPICAL_SENIOR_OFFSET = 3;

	const currentYear = new Date().getFullYear();
	const yearOptions = Array.from(
		{ length: YEAR_HISTORY_LENGTH },
		(_, i) => currentYear - i,
	);

	const existing = profileStore.current;
	let facultyId = $state(existing?.facultyId ?? "");
	let courseId = $state(existing?.courseId ?? "");
	let matriculationYear = $state(
		existing?.matriculationYear ?? currentYear - TYPICAL_SENIOR_OFFSET,
	);

	const handleSubmit = (event: SubmitEvent) => {
		event.preventDefault();
		errorsStore.clear();
		const candidate = {
			facultyId: facultyId.trim(),
			courseId: courseId.trim(),
			matriculationYear: Number(matriculationYear),
		};
		const parsed = StudentProfile.parse(candidate);
		if (isErr(parsed)) {
			errorsStore.push(parsed.error);
			return;
		}
		profileStore.set(parsed.value);
		void safeGoto(`${base}/import`);
	};
</script>

<h2 class="text-xl font-bold">学生プロフィールの設定</h2>
<p class="text-sm text-slate-600">
	卒業要件ルールの解決に使用します。いつでも再設定できます。
</p>

<form
	class="space-y-4 rounded-lg border border-slate-200 bg-white p-6"
	onsubmit={handleSubmit}
>
	<div class="block">
		<label for="profile-faculty-id" class="text-sm font-medium text-slate-900">
			学部
		</label>
		<input
			id="profile-faculty-id"
			type="text"
			class="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
			placeholder="例: 人文社会科学部"
			bind:value={facultyId}
			required
		/>
	</div>
	<div class="block">
		<label for="profile-course-id" class="text-sm font-medium text-slate-900">
			コース
		</label>
		<input
			id="profile-course-id"
			type="text"
			class="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
			placeholder="例: 人文科学コース"
			bind:value={courseId}
			required
		/>
	</div>
	<div class="block">
		<label
			for="profile-matriculation-year"
			class="text-sm font-medium text-slate-900"
		>
			入学年度
		</label>
		<select
			id="profile-matriculation-year"
			class="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
			bind:value={matriculationYear}
			required
		>
			{#each yearOptions as y (y)}
				<option value={y}>{y} 年度</option>
			{/each}
		</select>
	</div>
	<button
		type="submit"
		class="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
	>
		保存して次へ
	</button>
</form>

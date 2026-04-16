<script lang="ts">
	import { base } from "$app/paths";
	import { goto } from "$app/navigation";
	import { profileStore } from "$lib/presentation/stores/profile.svelte";
	import { errorsStore } from "$lib/presentation/stores/errors.svelte";
	import { StudentProfile } from "$lib/domain/entities/student-profile";
	import { isErr } from "$lib/domain/errors/result";

	const existing = profileStore.current;
	let facultyId = $state(existing?.facultyId ?? "");
	let courseId = $state(existing?.courseId ?? "");
	let matriculationYear = $state(
		existing?.matriculationYear ?? new Date().getFullYear(),
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
		void goto(`${base}/import`);
	};
</script>

<h2 class="text-xl font-bold">学生プロフィールの設定</h2>
<p class="text-sm text-slate-600">
	卒業要件ルールの解決に使用します。いつでも再設定できます。
</p>

<form class="space-y-4 rounded-lg border border-slate-200 bg-white p-6" onsubmit={handleSubmit}>
	<label class="block">
		<span class="text-sm font-medium text-slate-900">学部</span>
		<input
			type="text"
			class="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
			placeholder="例: 人文社会科学部"
			bind:value={facultyId}
			required
		/>
	</label>
	<label class="block">
		<span class="text-sm font-medium text-slate-900">コース</span>
		<input
			type="text"
			class="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
			placeholder="例: 人文科学コース"
			bind:value={courseId}
			required
		/>
	</label>
	<label class="block">
		<span class="text-sm font-medium text-slate-900">入学年度</span>
		<input
			type="number"
			class="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
			min="1900"
			max="2100"
			bind:value={matriculationYear}
			required
		/>
	</label>
	<button
		type="submit"
		class="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
	>
		保存して次へ
	</button>
</form>

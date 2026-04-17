<script lang="ts">
	import { base } from "$app/paths";
	import {
		listCourseOptions,
		listFacultyOptions,
	} from "$lib/application/list-profile-options";
	import { StudentProfile } from "$lib/domain/entities/student-profile";
	import { isErr } from "$lib/domain/errors/result";
	import { defaultRegistry } from "$lib/domain/rulesets/index";
	import { safeGoto } from "$lib/presentation/navigation";
	import { errorsStore } from "$lib/presentation/stores/errors.svelte";
	import { profileStore } from "$lib/presentation/stores/profile.svelte";
	import Button from "$lib/presentation/ui/Button.svelte";
	import Card from "$lib/presentation/ui/Card.svelte";
	import Select from "$lib/presentation/ui/Select.svelte";

	// 令和元年度以前（2019 年度以前）のカリキュラムは要件データが無いため
	// 選択肢から除外する。ここの定数を上げれば UI から古い学年が自動で消える
	const MIN_SUPPORTED_YEAR = 2020;
	const TYPICAL_SENIOR_OFFSET = 3;

	const currentYear = new Date().getFullYear();
	const yearOptions = Array.from(
		{ length: currentYear - MIN_SUPPORTED_YEAR + 1 },
		(_, i) => currentYear - i,
	);

	const clampedDefault = Math.max(
		MIN_SUPPORTED_YEAR,
		currentYear - TYPICAL_SENIOR_OFFSET,
	);

	// 学部・コースは双方向にカスケードする。
	//   - 学部を選ぶとコース候補がその学部のものに絞られる
	//   - コースを選ぶと学部候補がそのコースを含む学部に絞られる
	//   - どちらの方向でも「候補が一意に決まった時点で自動選択」する
	// これにより「コースから入力しても破綻しない」UX が実現できる。
	const existing = profileStore.current;

	// 初期値は既存プロフィールが registry に適合する場合だけ引き継ぐ。
	// 適合しない場合は空のまま → 下記 $effect が候補一意時に自動補完する。
	const initialFacultyOptions = listFacultyOptions(defaultRegistry);
	const initialFaculty =
		existing !== null && initialFacultyOptions.includes(existing.facultyId)
			? existing.facultyId
			: "";
	const initialCourseOptions = listCourseOptions(defaultRegistry, {
		faculty: initialFaculty,
	});
	const initialCourse =
		existing !== null && initialCourseOptions.includes(existing.courseId)
			? existing.courseId
			: "";

	let facultyId = $state(initialFaculty);
	let courseId = $state(initialCourse);

	// 反応的な候補リスト。相手側の選択値で絞り込む（空なら絞らない = 全候補）
	const facultyOptions = $derived(
		listFacultyOptions(defaultRegistry, { course: courseId }),
	);
	const courseOptions = $derived(
		listCourseOptions(defaultRegistry, { faculty: facultyId }),
	);

	// 片方の候補が一意に決まったら自動選択。
	// 現在の値が候補から外れた場合（学部変更でコースが無効になった等）も空に戻す。
	$effect(() => {
		const only = facultyOptions.length === 1 ? facultyOptions[0] : undefined;
		if (only !== undefined && facultyId !== only) {
			facultyId = only;
		} else if (
			facultyId !== "" &&
			facultyOptions.length > 0 &&
			!facultyOptions.includes(facultyId)
		) {
			facultyId = "";
		}
	});
	$effect(() => {
		const only = courseOptions.length === 1 ? courseOptions[0] : undefined;
		if (only !== undefined && courseId !== only) {
			courseId = only;
		} else if (
			courseId !== "" &&
			courseOptions.length > 0 &&
			!courseOptions.includes(courseId)
		) {
			courseId = "";
		}
	});

	let matriculationYear = $state(
		existing !== null && existing.matriculationYear >= MIN_SUPPORTED_YEAR
			? existing.matriculationYear
			: clampedDefault,
	);
	interface FieldErrors {
		facultyId?: string;
		courseId?: string;
		matriculationYear?: string;
	}

	let fieldErrors = $state<FieldErrors>({});

	interface ZodLikeIssue {
		readonly path: ReadonlyArray<string | number>;
		readonly message: string;
	}

	const extractFieldErrors = (context: unknown): FieldErrors => {
		if (
			typeof context !== "object" ||
			context === null ||
			!("issues" in context)
		)
			return {};
		const issues = (context as { issues: unknown }).issues;
		if (!Array.isArray(issues)) return {};
		const fields: FieldErrors = {};
		for (const issue of issues as ZodLikeIssue[]) {
			const field = issue.path[0];
			if (field === "facultyId" && fields.facultyId === undefined) {
				fields.facultyId = issue.message;
			} else if (field === "courseId" && fields.courseId === undefined) {
				fields.courseId = issue.message;
			} else if (
				field === "matriculationYear" &&
				fields.matriculationYear === undefined
			) {
				fields.matriculationYear = issue.message;
			}
		}
		return fields;
	};

	const pageTitle = "プロフィール設定 — 卒業要件判定ツール";

	const handleSubmit = (event: SubmitEvent) => {
		event.preventDefault();
		errorsStore.clear();
		fieldErrors = {};
		const candidate = {
			facultyId: facultyId.trim(),
			courseId: courseId.trim(),
			matriculationYear: Number(matriculationYear),
		};
		const parsed = StudentProfile.parse(candidate);
		if (isErr(parsed)) {
			fieldErrors = extractFieldErrors(parsed.error.context);
			if (Object.keys(fieldErrors).length === 0) {
				errorsStore.push(parsed.error);
			}
			return;
		}
		profileStore.set(parsed.value);
		void safeGoto(`${base}/import`);
	};
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<header class="space-y-3">
	<h2 class="text-display text-[color:var(--color-fg)]">
		学生プロフィール
	</h2>
	<p class="text-base text-[color:var(--color-fg-muted)] max-w-[640px]">
		卒業要件ルールの解決に使用します。いつでも再設定できます。
	</p>
</header>

<Card padding="lg">
	<form class="space-y-4" onsubmit={handleSubmit}>
		<div class="block">
			<label
				for="profile-faculty-id"
				class="text-sm font-medium text-[color:var(--color-fg)]"
			>
				学部
			</label>
			<Select
				id="profile-faculty-id"
				class="mt-1"
				invalid={fieldErrors.facultyId !== undefined}
				errorId={fieldErrors.facultyId
					? "profile-faculty-id-error"
					: undefined}
				bind:value={facultyId}
				required
			>
				{#if facultyId === ""}
					<option value="" disabled>— 学部を選択 —</option>
				{/if}
				{#each facultyOptions as f (f)}
					<option value={f}>{f}</option>
				{/each}
			</Select>
			{#if fieldErrors.facultyId}
				<p
					id="profile-faculty-id-error"
					class="mt-1 text-xs text-[color:var(--color-danger-fg)]"
				>
					{fieldErrors.facultyId}
				</p>
			{/if}
		</div>
		<div class="block">
			<label
				for="profile-course-id"
				class="text-sm font-medium text-[color:var(--color-fg)]"
			>
				コース
			</label>
			<Select
				id="profile-course-id"
				class="mt-1"
				invalid={fieldErrors.courseId !== undefined}
				errorId={fieldErrors.courseId
					? "profile-course-id-error"
					: undefined}
				bind:value={courseId}
				required
			>
				{#if courseId === ""}
					<option value="" disabled>— コースを選択 —</option>
				{/if}
				{#each courseOptions as c (c)}
					<option value={c}>{c}</option>
				{/each}
			</Select>
			{#if fieldErrors.courseId}
				<p
					id="profile-course-id-error"
					class="mt-1 text-xs text-[color:var(--color-danger-fg)]"
				>
					{fieldErrors.courseId}
				</p>
			{/if}
		</div>
		<div class="block">
			<label
				for="profile-matriculation-year"
				class="text-sm font-medium text-[color:var(--color-fg)]"
			>
				入学年度
			</label>
			<Select
				id="profile-matriculation-year"
				class="mt-1"
				invalid={fieldErrors.matriculationYear !== undefined}
				errorId={fieldErrors.matriculationYear
					? "profile-matriculation-year-error"
					: undefined}
				bind:value={matriculationYear}
				required
			>
				{#each yearOptions as y (y)}
					<option value={y}>{y} 年度</option>
				{/each}
			</Select>
			<p class="mt-1 text-xs text-[color:var(--color-fg-subtle)]">
				現在、令和 2 年度（2020 年度）以降入学生に対応しています。
			</p>
			{#if fieldErrors.matriculationYear}
				<p
					id="profile-matriculation-year-error"
					class="mt-1 text-xs text-[color:var(--color-danger-fg)]"
				>
					{fieldErrors.matriculationYear}
				</p>
			{/if}
		</div>
		<Button type="submit" variant="primary" size="md">保存して次へ</Button>
	</form>
</Card>

<script lang="ts">
	interface Props {
		readonly actual: number;
		readonly required: number;
		readonly satisfied: boolean;
	}

	const { actual, required, satisfied }: Props = $props();

	const percent = $derived(
		required === 0 ? 100 : Math.min(100, (actual / required) * 100),
	);
	const barColor = $derived(
		satisfied ? "bg-emerald-500" : "bg-amber-500",
	);
</script>

<div class="h-2 w-full overflow-hidden rounded-full bg-slate-200">
	<div
		class={`h-full rounded-full ${barColor} transition-all`}
		style="width: {percent}%"
		aria-valuenow={actual}
		aria-valuemin="0"
		aria-valuemax={required}
		role="progressbar"
	></div>
</div>

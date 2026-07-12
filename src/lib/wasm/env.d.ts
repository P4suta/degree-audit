// Vite resolves `?url` imports to a (base-aware, fingerprinted) asset URL string.
declare module "*.wasm?url" {
	const url: string;
	export default url;
}

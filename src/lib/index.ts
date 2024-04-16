// place files you want to import through the `$lib` alias in this folder.

export const buildURL = (base: string, obj: Record<string, string | undefined>) =>
	`${base}?${Object.entries(obj)
		.filter((pair) => pair[1] !== undefined)
		.map((pair) => (pair as string[]).map(encodeURIComponent).join('='))
		.join('&')}`;

export function range(a: number, b?: number): number[] {
	return b === undefined ? [...Array(a).keys()] : range(b - a).map((x) => x + a);
}

/**
 * pdfjs-dist から 1 ページ分のテキストアイテムを位置情報付きで取り出す
 * 薄いアダプタ。pdfjs の API 変更に備えて、ここ 1 箇所だけでラップする。
 */

export interface PositionedTextItem {
	readonly str: string;
	readonly x: number;
	readonly y: number;
	readonly width: number;
}

export interface PdfPage {
	readonly pageNumber: number;
	readonly items: readonly PositionedTextItem[];
}

interface PdfTextItem {
	readonly str: string;
	readonly transform: readonly number[];
	readonly width: number;
}

interface PdfTextContent {
	readonly items: readonly (PdfTextItem | { type: string })[];
}

interface PdfPageProxy {
	getTextContent(): Promise<PdfTextContent>;
}

interface PdfDocumentProxy {
	readonly numPages: number;
	getPage(page: number): Promise<PdfPageProxy>;
}

export interface PdfDocumentLoader {
	load(bytes: Uint8Array): Promise<PdfDocumentProxy>;
}

const isTextItem = (
	item: PdfTextItem | { type: string },
): item is PdfTextItem =>
	(item as { str?: unknown }).str !== undefined &&
	(item as { transform?: unknown }).transform !== undefined;

export const extractPositionedText = async (
	loader: PdfDocumentLoader,
	bytes: Uint8Array,
): Promise<readonly PdfPage[]> => {
	const doc = await loader.load(bytes);
	const pages: PdfPage[] = [];
	for (let p = 1; p <= doc.numPages; p += 1) {
		const page = await doc.getPage(p);
		const content = await page.getTextContent();
		const items: PositionedTextItem[] = [];
		for (const raw of content.items) {
			if (!isTextItem(raw)) continue;
			if (raw.str === "") continue;
			// transform = [scaleX, skewY, skewX, scaleY, tx, ty]
			const x = raw.transform[4] ?? 0;
			const y = raw.transform[5] ?? 0;
			items.push({ str: raw.str, x, y, width: raw.width });
		}
		pages.push({ pageNumber: p, items });
	}
	return pages;
};

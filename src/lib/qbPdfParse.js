import * as pdfjsLib from "pdfjs-dist";
import { clean, toNumber } from "./helpers";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.js";

/* PDF text has no columns, only positioned glyphs. This reconstructs rows by
   clustering text items into lines (close y) and cells within a line (a gap in
   x wider than a couple of character widths means a new cell), then hands the
   result to the same classifyRows()/toFinanceRows() pipeline the CSV path uses.
   Column headers are taken from whichever reconstructed line has the most
   numeric-free cells before the first section keyword — the same "widest
   label row" heuristic as the CSV header guess, just position-based instead
   of comma-based. PDF layout reconstruction is inherently approximate, which
   is exactly why the importer always shows a review grid before saving anything. */
export async function parsePdfReport(file) {
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;
  const lines = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const items = content.items
      .filter((it) => clean(it.str))
      .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5], width: it.width }));

    const byY = new Map();
    items.forEach((it) => {
      const yKey = Math.round(it.y / 3) * 3;
      if (!byY.has(yKey)) byY.set(yKey, []);
      byY.get(yKey).push(it);
    });

    const pageLines = [...byY.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, rowItems]) => rowItems.sort((a, b) => a.x - b.x));

    pageLines.forEach((rowItems) => {
      const cells = [];
      let current = "";
      let lastEnd = null;
      rowItems.forEach((it) => {
        const gap = lastEnd === null ? 0 : it.x - lastEnd;
        const charWidth = it.width / Math.max(1, it.str.length);
        if (lastEnd !== null && gap > Math.max(10, charWidth * 2.2)) {
          cells.push(current.trim());
          current = it.str;
        } else {
          current += (current && !current.endsWith(" ") ? " " : "") + it.str;
        }
        lastEnd = it.x + it.width;
      });
      if (current) cells.push(current.trim());
      if (cells.length) lines.push(cells);
    });
  }

  // Header: the reconstructed line with the most cells, among the first dozen
  // non-trivial lines (title/date lines above the real header are usually short).
  let headerIdx = 0;
  let bestCount = -1;
  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    if (lines[i].length > bestCount) {
      bestCount = lines[i].length;
      headerIdx = i;
    }
  }
  const header = lines[headerIdx] || [];
  const columns = header.slice(1).length ? header.slice(1) : ["Total"];

  const rows = lines.slice(headerIdx + 1).map((cells) => ({
    label: clean(cells[0]),
    values: cells.slice(1, 1 + columns.length).map(toNumber),
  }));

  return { columns, rows };
}

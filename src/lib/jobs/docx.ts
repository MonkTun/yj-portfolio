import { crc32, deflateRawSync, inflateRawSync } from "node:zlib";

/**
 * Minimal docx (zip) reader/writer + text helpers, dependency-free via
 * node:zlib. A docx is a zip of XML parts; everything the tracker needs —
 * keyword-scoring text extraction, the Google-Docs bullet-font fix, and the
 * tailor pipeline's deterministic paragraph edits — works on word/*.xml
 * directly, so no docx library is worth its weight here.
 */

export type DocxEntry = { name: string; data: Buffer };

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;

export function readDocxEntries(buf: Buffer): DocxEntry[] {
  // The end-of-central-directory record sits at the tail, possibly followed
  // by a comment (max 64 KB) — scan backwards for its signature.
  const floor = Math.max(0, buf.length - 22 - 65_535);
  let eocd = -1;
  for (let i = buf.length - 22; i >= floor; i--) {
    if (buf.readUInt32LE(i) === SIG_EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a zip file (no end-of-central-directory)");

  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const entries: DocxEntry[] = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== SIG_CENTRAL) {
      throw new Error("Corrupt zip: bad central directory entry");
    }
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.toString("utf8", off + 46, off + 46 + nameLen);

    if (buf.readUInt32LE(localOff) !== SIG_LOCAL) {
      throw new Error(`Corrupt zip: bad local header for ${name}`);
    }
    // The local header's name/extra lengths can differ from the central
    // directory's — data offset must come from the local header.
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compSize);
    const data =
      method === 0
        ? Buffer.from(raw)
        : method === 8
          ? inflateRawSync(raw)
          : (() => {
              throw new Error(`Unsupported compression method ${method} (${name})`);
            })();
    entries.push({ name, data });
    off += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

export function writeDocxEntries(entries: DocxEntry[]): Buffer {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, "utf8");
    const comp = deflateRawSync(e.data, { level: 6 });
    const crc = crc32(e.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(SIG_LOCAL, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    chunks.push(local, nameBuf, comp);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(SIG_CENTRAL, 0);
    cd.writeUInt16LE(20, 4); // version made by
    cd.writeUInt16LE(20, 6); // version needed
    cd.writeUInt16LE(8, 10); // deflate
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(comp.length, 20);
    cd.writeUInt32LE(e.data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);

    offset += 30 + nameBuf.length + comp.length;
  }
  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(SIG_EOCD, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, centralBuf, eocd]);
}

function getEntry(entries: DocxEntry[], name: string): DocxEntry | undefined {
  return entries.find((e) => e.name === name);
}

/* ---------------- text extraction ---------------- */

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&");
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain text of one <w:p> XML slice: w:t runs joined, tabs/breaks spaced. */
function paragraphText(pXml: string): string {
  let out = "";
  const parts = pXml.match(/<w:t(?:[ >][^]*?)?<\/w:t>|<w:t\/>|<w:tab\/>|<w:br\/>/g) ?? [];
  for (const part of parts) {
    if (part === "<w:tab/>" || part === "<w:br/>") out += " ";
    else if (part === "<w:t/>") continue;
    else {
      const inner = part.replace(/^<w:t[^>]*>/, "").replace(/<\/w:t>$/, "");
      out += decodeXmlEntities(inner);
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

/** Paragraph XML slices of word/document.xml, in document order.
 *  (w:p never nests in WordprocessingML, so a non-greedy match is safe.) */
function documentParagraphSlices(xml: string): { start: number; end: number; xml: string }[] {
  const out: { start: number; end: number; xml: string }[] = [];
  const re = /<w:p[ >][^]*?<\/w:p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    out.push({ start: m.index, end: m.index + m[0].length, xml: m[0] });
  }
  return out;
}

/** All paragraph texts of a docx (empty paragraphs included, for stable
 *  indices — the tailor edit list addresses paragraphs by this index). */
export function docxParagraphs(buf: Buffer): string[] {
  const doc = getEntry(readDocxEntries(buf), "word/document.xml");
  if (!doc) throw new Error("No word/document.xml in this file");
  return documentParagraphSlices(doc.data.toString("utf8")).map((p) =>
    paragraphText(p.xml)
  );
}

/** Full plain text of a docx — the keyword engine's resume-side input. */
export function docxText(buf: Buffer): string {
  return docxParagraphs(buf).filter(Boolean).join("\n");
}

/* ---------------- Google Docs bullet-font normalization ---------------- */

/**
 * Google Docs docx exports pin bullet glyphs to embedded "Noto Sans Symbols"
 * (per-level rFonts in word/numbering.xml), which renders oversized in
 * SuperDoc. Fix (same transform applied to YJ's resume by hand, Aug 2026):
 * replace those rPr blocks with a neutral <w:u w:val="none"/>.
 */
export function normalizeDocxBulletFonts(buf: Buffer): { data: Buffer; changed: boolean } {
  let entries: DocxEntry[];
  try {
    entries = readDocxEntries(buf);
  } catch {
    return { data: buf, changed: false }; // Not a readable zip — leave as-is.
  }
  const numbering = getEntry(entries, "word/numbering.xml");
  if (!numbering) return { data: buf, changed: false };
  const xml = numbering.data.toString("utf8");
  const fixed = xml.replace(
    /<w:rPr><w:rFonts[^>]*Noto Sans Symbols[^>]*\/><\/w:rPr>/g,
    '<w:rPr><w:u w:val="none"/></w:rPr>'
  );
  if (fixed === xml) return { data: buf, changed: false };
  numbering.data = Buffer.from(fixed, "utf8");
  return { data: writeDocxEntries(entries), changed: true };
}

/* ---------------- deterministic paragraph edits (tailor) ---------------- */

export type ParagraphEdit = {
  /** Index into docxParagraphs() of the same file. */
  paragraph: number;
  /** Replacement plain text; "" deletes the paragraph. */
  text: string;
};

/**
 * Apply paragraph-level text replacements. The first text run keeps its
 * formatting and receives the whole new text; later text runs are dropped
 * (resume bullets are single-format in practice — bold sub-runs would
 * flatten, which is acceptable for tailored copies YJ reviews in the studio).
 */
export function applyParagraphEdits(buf: Buffer, edits: ParagraphEdit[]): Buffer {
  const entries = readDocxEntries(buf);
  const doc = getEntry(entries, "word/document.xml");
  if (!doc) throw new Error("No word/document.xml in this file");
  let xml = doc.data.toString("utf8");
  const slices = documentParagraphSlices(xml);

  // Apply back-to-front so earlier offsets stay valid.
  const sorted = edits
    .filter((e) => e.paragraph >= 0 && e.paragraph < slices.length)
    .sort((a, b) => b.paragraph - a.paragraph);

  for (const edit of sorted) {
    const slice = slices[edit.paragraph];
    let replacement: string;
    if (edit.text === "") {
      replacement = "";
    } else {
      replacement = rewriteParagraph(slice.xml, edit.text);
    }
    xml = xml.slice(0, slice.start) + replacement + xml.slice(slice.end);
  }

  doc.data = Buffer.from(xml, "utf8");
  return writeDocxEntries(entries);
}

function rewriteParagraph(pXml: string, text: string): string {
  const runRe = /<w:r[ >][^]*?<\/w:r>/g;
  const runs: { start: number; end: number; xml: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = runRe.exec(pXml))) {
    runs.push({ start: m.index, end: m.index + m[0].length, xml: m[0] });
  }
  const textRuns = runs.filter((r) => /<w:t[ />]/.test(r.xml));
  if (textRuns.length === 0) return pXml; // Nothing textual to replace.

  const first = textRuns[0];
  const newFirst = first.xml.replace(
    /<w:t(?:[ >][^]*?)?<\/w:t>|<w:t\/>/,
    `<w:t xml:space="preserve">${escapeXml(text)}</w:t>`
  );

  // Rebuild: keep everything, swap the first text run, drop the rest.
  let out = "";
  let cursor = 0;
  for (const run of textRuns) {
    out += pXml.slice(cursor, run.start);
    if (run === first) out += newFirst;
    cursor = run.end;
  }
  out += pXml.slice(cursor);
  return out;
}

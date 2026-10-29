import { unzipSync, strFromU8 } from "fflate";
import { XMLParser } from "fast-xml-parser";

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export type ReadableUpload = { kind: "image" | "pdf"; file: File } | { kind: "text"; text: string };
const textExtensions = /\.(txt|md|csv|tsv|json|xml|yaml|yml|toml|log|html?|css|js|jsx|ts|tsx|py|go|rs|java|c|cpp|h|sql|sh|rb|php|ini|conf|srt|vtt)$/i;

function collectText(value: unknown): string[] {
  if (typeof value === "string" || typeof value === "number") return [String(value)];
  if (Array.isArray(value)) return value.flatMap(collectText);
  if (value && typeof value === "object") return Object.entries(value).filter(([key]) => !key.startsWith("@_")).flatMap(([, item]) => collectText(item));
  return [];
}
export async function readGhostFile(file: File): Promise<ReadableUpload> {
  if (!file.size) throw new Error("This file is empty.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Choose a file under 20 MB.");
  if (["image/png", "image/jpeg", "image/webp"].includes(file.type)) return { kind: "image", file };
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return { kind: "pdf", file: new File([file], file.name, { type: "application/pdf" }) };
  let text: string;
  if (/\.(docx|pptx|xlsx|odt|ods|odp)$/i.test(file.name)) {
    let total = 0;
    const zip = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: (entry) => {
      const wanted = /^(word\/document\.xml|ppt\/slides\/slide\d+\.xml|xl\/(sharedStrings\.xml|worksheets\/sheet\d+\.xml)|content\.xml)$/.test(entry.name);
      if (wanted) { total += entry.originalSize; if (total > MAX_FILE_BYTES) throw new Error("This document expands beyond the reading limit."); }
      return wanted;
    } });
    const parser = new XMLParser({ ignoreAttributes: true, processEntities: false });
    text = Object.entries(zip).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([name, bytes]) => `${name}\n${collectText(parser.parse(strFromU8(bytes))).join("\n")}`).join("\n\n");
  } else if (file.type.startsWith("text/") || textExtensions.test(file.name)) {
    text = await file.text();
    if (text.includes("\0")) throw new Error("This appears to be a binary file, not readable text.");
  } else throw new Error("I can't read this format yet. Send PNG/JPEG/WebP, PDF, DOCX/PPTX/XLSX, OpenDocument, text, code or CSV. Executables, encrypted files, audio and video analysis are not supported here.");
  if (!text.trim()) throw new Error("No readable text was found. For scanned documents, send a PDF or image.");
  if (text.length > 120000) throw new Error("This document is too long to read completely. Split it into smaller files.");
  return { kind: "text", text: `File: ${file.name}\n${text}` };
}
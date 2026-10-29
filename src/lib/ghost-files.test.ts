import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { readGhostFile } from "./ghost-files";
describe("Ghost file understanding", () => {
  it("reads text and CSV without executing them", async () => {
    const read = await readGhostFile(new File(["name,total\nAbel,42"], "sales.csv", { type: "text/csv" }));
    expect(read).toEqual({ kind: "text", text: "File: sales.csv\nname,total\nAbel,42" });
  });
  it("extracts DOCX text", async () => {
    const bytes = zipSync({ "word/document.xml": strToU8('<w:document><w:p><w:r><w:t>Project Ghost</w:t></w:r></w:p></w:document>') });
    const read = await readGhostFile(new File([bytes], "project.docx"));
    expect(read.kind).toBe("text");
    if (read.kind === "text") expect(read.text).toContain("Project Ghost");
  });
  it("preserves PDFs for vision-enabled reading", async () => expect((await readGhostFile(new File(["%PDF-1.4"], "scan.pdf", { type: "application/pdf" }))).kind).toBe("pdf"));
  it("preserves PNG images", async () => expect((await readGhostFile(new File(["png"], "photo.png", { type: "image/png" }))).kind).toBe("image"));
  it("rejects unsupported binaries instead of pretending to read them", async () => await expect(readGhostFile(new File(["binary"], "program.exe"))).rejects.toThrow("can't read this format"));
  it("rejects oversized files", async () => await expect(readGhostFile(new File([new Uint8Array(20 * 1024 * 1024 + 1)], "big.txt", { type: "text/plain" }))).rejects.toThrow("under 20 MB"));
});
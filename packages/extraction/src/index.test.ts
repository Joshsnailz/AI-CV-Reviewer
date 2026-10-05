import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { detectFileType, extractText, normalizeWhitespace, UnreadableDocumentError } from "./index.js";

const fixture = (name: string): Buffer => readFileSync(new URL(`../fixtures/${name}`, import.meta.url));

describe("detectFileType", () => {
  it("recognises PDF and DOCX by their leading bytes", () => {
    expect(detectFileType(fixture("resume.pdf"))).toBe("pdf");
    expect(detectFileType(fixture("resume.docx"))).toBe("docx");
    expect(detectFileType(Buffer.from("plain text"))).toBeNull();
  });
});

describe("normalizeWhitespace", () => {
  it("trims lines, collapses runs of spaces and caps blank lines at one", () => {
    expect(normalizeWhitespace("  Jane\t\tDoe \r\n\r\n\r\n\r\nSKILLS  ")).toBe("Jane Doe\n\nSKILLS");
  });
});

describe("extractText", () => {
  it("extracts text and page count from a PDF", async () => {
    const result = await extractText(fixture("resume.pdf"));
    expect(result).toMatchObject({ fileType: "pdf", pageCount: 2, warnings: [] });
    expect(result.text).toContain("Senior Software Engineer, Example Ltd");
    expect(result.text).toContain("reducing processing time by 35%");
    expect(result.text).toContain("SKILLS\nTypeScript, PostgreSQL, AWS");
    expect(result.wordCount).toBe(30);
  });

  it("extracts paragraphs and table cells from a DOCX", async () => {
    const result = await extractText(fixture("resume.docx"));
    expect(result).toMatchObject({ fileType: "docx", pageCount: null, warnings: [] });
    expect(result.text).toContain("Senior Software Engineer, Example Ltd");
    expect(result.text).toContain("TypeScript");
    expect(result.text).toContain("PostgreSQL");
  });

  it("warns when a PDF has no text layer", async () => {
    const result = await extractText(fixture("blank.pdf"));
    expect(result.text).toBe("");
    expect(result.wordCount).toBe(0);
    expect(result.warnings).toEqual([expect.stringContaining("scanned image")]);
  });

  it("rejects files that are not PDF or DOCX", async () => {
    await expect(extractText(Buffer.from("plain text"))).rejects.toThrow(UnreadableDocumentError);
  });

  it("rejects a ZIP that is not a Word document", async () => {
    await expect(extractText(fixture("not-a-resume.zip"))).rejects.toThrow(/Could not read DOCX/);
  });

  it("rejects a corrupt PDF", async () => {
    await expect(extractText(Buffer.from("%PDF-1.4 truncated"))).rejects.toThrow(/Could not read PDF/);
  });
});

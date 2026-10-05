import mammoth from "mammoth";
import { extractText as extractPdfText, getDocumentProxy } from "unpdf";

// Document text extraction, step one of the analysis pipeline (architecture doc, section 4).
// Section detection and normalisation build on this output later.

export type ResumeFileType = "pdf" | "docx";

export const RESUME_MIME_TYPES: Record<ResumeFileType, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export interface ExtractionResult {
  fileType: ResumeFileType;
  text: string;
  /** Page count for PDFs; DOCX has no fixed pagination. */
  pageCount: number | null;
  wordCount: number;
  warnings: string[];
}

/** The file is not a PDF or DOCX, or is too damaged to read. */
export class UnreadableDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnreadableDocumentError";
  }
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04", the DOCX container

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  return magic.every((byte, i) => bytes[i] === byte);
}

/**
 * Identifies the file from its content, not its name or declared MIME type.
 * Any ZIP counts as DOCX here; extraction rejects ZIPs that are not Word documents.
 */
export function detectFileType(bytes: Uint8Array): ResumeFileType | null {
  if (startsWith(bytes, PDF_MAGIC)) return "pdf";
  if (startsWith(bytes, ZIP_MAGIC)) return "docx";
  return null;
}

export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\f\v\u00a0 ]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

async function extractFromPdf(bytes: Uint8Array): Promise<Omit<ExtractionResult, "wordCount">> {
  let pdf;
  try {
    // pdf.js takes ownership of the buffer it is given, so hand it a copy.
    pdf = await getDocumentProxy(new Uint8Array(bytes), { verbosity: 0 });
  } catch (error) {
    throw new UnreadableDocumentError(`Could not read PDF: ${(error as Error).message}`);
  }
  try {
    const { totalPages, text: pages } = await extractPdfText(pdf, { mergePages: false });
    const text = normalizeWhitespace(pages.join("\n\n"));
    return { fileType: "pdf", text, pageCount: totalPages, warnings: [] };
  } finally {
    await pdf.loadingTask.destroy();
  }
}

async function extractFromDocx(bytes: Uint8Array): Promise<Omit<ExtractionResult, "wordCount">> {
  let result;
  try {
    result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  } catch (error) {
    throw new UnreadableDocumentError(`Could not read DOCX: ${(error as Error).message}`);
  }
  const warnings = result.messages.map((message) => message.message);
  return { fileType: "docx", text: normalizeWhitespace(result.value), pageCount: null, warnings };
}

export async function extractText(bytes: Uint8Array): Promise<ExtractionResult> {
  const fileType = detectFileType(bytes);
  if (!fileType) {
    throw new UnreadableDocumentError("File is not a PDF or DOCX document");
  }

  const result = fileType === "pdf" ? await extractFromPdf(bytes) : await extractFromDocx(bytes);
  const warnings = [...result.warnings];
  if (!result.text) {
    warnings.push("No text found. The document may be a scanned image, which needs OCR.");
  }
  return { ...result, warnings, wordCount: countWords(result.text) };
}

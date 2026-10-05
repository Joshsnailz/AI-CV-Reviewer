// Shared domain types used by the web app and the API.
export const APP_NAME = "Resume Judge";

export type AnalysisStatus = "queued" | "processing" | "completed" | "failed";

/** Largest resume file the API accepts. */
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export interface ResumeExtraction {
  /** Page count for PDFs; null for DOCX, which has no fixed pagination. */
  pageCount: number | null;
  wordCount: number;
  /** Problems worth showing the user, such as a PDF with no text layer. */
  warnings: string[];
}

export interface ResumeResponse {
  id: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  /** Plain text extracted from the latest version of the document. */
  text: string;
  extraction: ResumeExtraction;
}

import { randomUUID } from "node:crypto";
import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import type { PrismaClient } from "@resume-judge/db";
import { detectFileType, extractText, RESUME_MIME_TYPES, UnreadableDocumentError } from "@resume-judge/extraction";
import { MAX_RESUME_BYTES, type ResumeResponse } from "@resume-judge/types";
import { PRISMA } from "../database/database.module.js";
import { STORAGE, type ObjectStorage } from "../storage/storage.module.js";

export interface UploadedResumeFile {
  originalname: string;
  buffer: Buffer;
}

const resumeWithLatestVersion = {
  include: { versions: { orderBy: { version: "desc" }, take: 1 } },
} as const;

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async upload(file: UploadedResumeFile): Promise<ResumeResponse> {
    if (file.buffer.length > MAX_RESUME_BYTES) {
      throw new PayloadTooLargeException(`Resume must be ${MAX_RESUME_BYTES / 1024 / 1024} MB or smaller`);
    }
    // Trust the file's content, not its name or the MIME type the browser sent.
    const fileType = detectFileType(file.buffer);
    if (!fileType) {
      throw new UnsupportedMediaTypeException("Resume must be a PDF or DOCX file");
    }

    let extraction;
    try {
      extraction = await extractText(file.buffer);
    } catch (error) {
      if (error instanceof UnreadableDocumentError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }

    const id = randomUUID();
    const storageKey = `resumes/${id}/original.${fileType}`;
    const mimeType = RESUME_MIME_TYPES[fileType];
    await this.storage.put(storageKey, file.buffer, mimeType);

    try {
      const resume = await this.prisma.resume.create({
        data: {
          id,
          originalFilename: file.originalname,
          storageKey,
          mimeType,
          fileSize: file.buffer.length,
          versions: {
            create: {
              version: 1,
              rawText: extraction.text,
              pageCount: extraction.pageCount,
              wordCount: extraction.wordCount,
              extractionWarnings: extraction.warnings,
            },
          },
        },
        ...resumeWithLatestVersion,
      });
      return toResponse(resume);
    } catch (error) {
      // Don't leave an orphaned document in storage when the database write fails.
      await this.storage.delete(storageKey).catch((cleanupError: unknown) => {
        this.logger.error(`Could not delete orphaned object ${storageKey}`, cleanupError);
      });
      throw error;
    }
  }

  async findOne(id: string): Promise<ResumeResponse> {
    const resume = await this.prisma.resume.findUnique({ where: { id }, ...resumeWithLatestVersion });
    if (!resume) {
      throw new NotFoundException("Resume not found");
    }
    return toResponse(resume);
  }
}

interface ResumeRecord {
  id: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  createdAt: Date;
  versions: {
    rawText: string | null;
    pageCount: number | null;
    wordCount: number;
    extractionWarnings: string[];
  }[];
}

function toResponse(resume: ResumeRecord): ResumeResponse {
  const latest = resume.versions[0];
  return {
    id: resume.id,
    originalFilename: resume.originalFilename,
    mimeType: resume.mimeType,
    fileSize: resume.fileSize,
    createdAt: resume.createdAt.toISOString(),
    text: latest?.rawText ?? "",
    extraction: {
      pageCount: latest?.pageCount ?? null,
      wordCount: latest?.wordCount ?? 0,
      warnings: latest?.extractionWarnings ?? [],
    },
  };
}

import "reflect-metadata";
import { readFileSync } from "node:fs";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PRISMA } from "../database/database.module.js";
import { STORAGE, type ObjectStorage } from "../storage/storage.module.js";
import { ResumesController } from "./resumes.controller.js";
import { ResumesService } from "./resumes.service.js";

const fixture = (name: string): Buffer =>
  readFileSync(new URL(`../../../../packages/extraction/fixtures/${name}`, import.meta.url));

const RESUME_ID = "3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b";
const CREATED_AT = new Date("2026-10-05T12:00:00Z");

// Echoes the create input back the way Prisma would, with the latest version included.
const prisma = {
  resume: {
    create: vi.fn(async ({ data }) => ({ ...data, createdAt: CREATED_AT, versions: [data.versions.create] })),
    findUnique: vi.fn(),
  },
};
const storage = {
  put: vi.fn<ObjectStorage["put"]>(async () => undefined),
  delete: vi.fn<ObjectStorage["delete"]>(async () => undefined),
};

describe("ResumesController", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ResumesController],
      providers: [
        ResumesService,
        { provide: PRISMA, useValue: prisma },
        { provide: STORAGE, useValue: storage },
      ],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores a PDF, extracts its text and saves version 1", async () => {
    const res = await request(app.getHttpServer())
      .post("/resumes")
      .attach("file", fixture("resume.pdf"), "jane-doe.pdf")
      .expect(201);

    expect(res.body).toMatchObject({
      originalFilename: "jane-doe.pdf",
      mimeType: "application/pdf",
      fileSize: fixture("resume.pdf").length,
      createdAt: CREATED_AT.toISOString(),
      extraction: { pageCount: 2, wordCount: 30, warnings: [] },
    });
    expect(res.body.text).toContain("Senior Software Engineer");

    const key = `resumes/${res.body.id}/original.pdf`;
    expect(storage.put).toHaveBeenCalledWith(key, expect.any(Buffer), "application/pdf");
    expect(prisma.resume.create.mock.calls[0]?.[0].data).toMatchObject({ storageKey: key, versions: { create: { version: 1 } } });
  });

  it("accepts a DOCX and sets its MIME type from the content", async () => {
    const res = await request(app.getHttpServer())
      .post("/resumes")
      .attach("file", fixture("resume.docx"), { filename: "cv.docx", contentType: "application/octet-stream" })
      .expect(201);

    expect(res.body.mimeType).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(res.body.extraction.pageCount).toBeNull();
    expect(res.body.text).toContain("PostgreSQL");
  });

  it("rejects a request with no file", async () => {
    await request(app.getHttpServer()).post("/resumes").expect(400);
  });

  it("rejects a file that is not a PDF or DOCX, whatever its name", async () => {
    await request(app.getHttpServer())
      .post("/resumes")
      .attach("file", Buffer.from("just some text"), "resume.pdf")
      .expect(415);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it("rejects a document it cannot read", async () => {
    await request(app.getHttpServer())
      .post("/resumes")
      .attach("file", fixture("not-a-resume.zip"), "resume.docx")
      .expect(422);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it("rejects files over 5 MB", async () => {
    const big = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(5 * 1024 * 1024)]);
    await request(app.getHttpServer()).post("/resumes").attach("file", big, "big.pdf").expect(413);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it("removes the stored document when the database write fails", async () => {
    prisma.resume.create.mockRejectedValueOnce(new Error("database down"));
    await request(app.getHttpServer()).post("/resumes").attach("file", fixture("resume.pdf"), "cv.pdf").expect(500);
    expect(storage.delete).toHaveBeenCalledWith(storage.put.mock.calls[0]?.[0]);
  });

  it("returns a stored resume with its latest version", async () => {
    prisma.resume.findUnique.mockResolvedValueOnce({
      id: RESUME_ID,
      originalFilename: "cv.pdf",
      mimeType: "application/pdf",
      fileSize: 1234,
      createdAt: CREATED_AT,
      versions: [{ rawText: "Jane Doe", pageCount: 1, wordCount: 2, extractionWarnings: [] }],
    });

    const res = await request(app.getHttpServer()).get(`/resumes/${RESUME_ID}`).expect(200);
    expect(res.body).toEqual({
      id: RESUME_ID,
      originalFilename: "cv.pdf",
      mimeType: "application/pdf",
      fileSize: 1234,
      createdAt: CREATED_AT.toISOString(),
      text: "Jane Doe",
      extraction: { pageCount: 1, wordCount: 2, warnings: [] },
    });
  });

  it("returns 404 for an unknown resume and 400 for a malformed id", async () => {
    prisma.resume.findUnique.mockResolvedValueOnce(null);
    await request(app.getHttpServer()).get(`/resumes/${RESUME_ID}`).expect(404);
    await request(app.getHttpServer()).get("/resumes/not-a-uuid").expect(400);
  });
});

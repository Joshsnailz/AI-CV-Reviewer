import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { MAX_RESUME_BYTES, type ResumeResponse } from "@resume-judge/types";
import { ResumesService, type UploadedResumeFile } from "./resumes.service.js";

@Controller("resumes")
export class ResumesController {
  constructor(@Inject(ResumesService) private readonly resumes: ResumesService) {}

  /** Multipart upload with the document in the `file` field. */
  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_RESUME_BYTES, files: 1 } }))
  upload(@UploadedFile() file: UploadedResumeFile | undefined): Promise<ResumeResponse> {
    if (!file) {
      throw new BadRequestException("Attach the resume as a multipart field named 'file'");
    }
    return this.resumes.upload(file);
  }

  @Get(":id")
  findOne(@Param("id", new ParseUUIDPipe()) id: string): Promise<ResumeResponse> {
    return this.resumes.findOne(id);
  }
}

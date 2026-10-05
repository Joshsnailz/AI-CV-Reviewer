# AI CV Reviewer

AI CV Reviewer is a project for analyzing resumes with AI and structured scoring. The goal is to help users understand how strong their resume is, identify gaps, estimate likely career level, and compare a resume against a job description.

## Current scope

This repository currently includes the architectural and product design documentation for the system, including:

- document ingestion and normalization
- AI analysis pipeline
- deterministic scoring
- evidence-backed findings
- job matching and ATS review
- backend, frontend, and data architecture recommendations

## Documentation

- [resume-judge-technical-architecture.md](resume-judge-technical-architecture.md)

## Planned stack

- Frontend: Next.js, TypeScript, React, Tailwind, shadcn/ui
- Backend: NestJS, TypeScript, REST API
- Database: PostgreSQL with Prisma
- Queue/cache: Redis + BullMQ
- Object storage: S3-compatible storage
- AI: Anthropic Claude / configurable LLM provider

## Status

This repository is in the initial architecture and planning phase.

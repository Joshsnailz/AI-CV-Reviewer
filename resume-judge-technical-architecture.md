# Resume Judge — Technical Architecture & Product Design

## 1. Objective

Build an AI-powered resume analysis web application similar in concept to AyeHigh Resume Judge.

The application should allow a user to:

1. Upload a resume in PDF or DOCX format.
2. Extract and normalize the resume content.
3. Analyze the resume using an LLM.
4. Produce a structured candidate assessment.
5. Score the resume using a deterministic scoring layer.
6. Identify strengths, weaknesses and missing signals.
7. Infer likely career level and suitable roles.
8. Optionally compare the resume against a specific job description.
9. Present the results through a polished web dashboard.
10. Save previous analyses for authenticated users.
11. Eventually support resume optimization and resume generation.

The goal is not to make a thin "upload PDF -> ask an LLM for an opinion" wrapper. The system should separate document extraction, resume normalization, AI evaluation and deterministic scoring so that results are consistent and explainable.

---

# 2. Recommended Technology Stack

## Frontend

- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod

### Responsibilities

- Landing page
- Resume upload
- Job description input
- Analysis progress
- Results dashboard
- Resume history
- User account
- Billing/credits
- Resume optimization UI

---

## Backend

- NestJS
- TypeScript
- REST API
- Zod or class-validator for request validation
- BullMQ for asynchronous analysis jobs
- Redis for queues/cache

### Responsibilities

- Authentication
- Resume upload orchestration
- Document processing
- Resume normalization
- LLM orchestration
- Scoring
- Job matching
- Persistence
- Usage/credit tracking
- Billing
- Report generation

---

## Database

### PostgreSQL

Use PostgreSQL as the primary database.

Recommended ORM:

- Prisma

PostgreSQL is preferable to MongoDB here because the application has strongly related entities:

```text
User
 ├── Resume
 │    ├── ResumeVersion
 │    └── Analysis
 │
 ├── JobDescription
 │    └── JobAnalysis
 │
 └── Subscription / CreditTransaction
```

---

## Object Storage

Use S3-compatible object storage.

Options:

- AWS S3
- Cloudflare R2
- Supabase Storage

Store uploaded documents separately from PostgreSQL.

The database stores metadata and references to the object.

Do not store the raw PDF/DOCX binary inside PostgreSQL.

---

## Cache / Queue

### Redis

Use Redis for:

- Background jobs
- Analysis queue
- Rate limiting
- Temporary state
- Caching
- Progress tracking

BullMQ can sit on top of Redis.

---

# 3. AI / LLM Architecture

## Primary LLM

The public information currently available about AyeHigh indicates that it uses the Anthropic API, although AyeHigh does not publicly identify the exact Claude model on its Resume Judge page.

For our implementation, use an Anthropic Claude model with strong structured-output and reasoning capability.

The exact model should be configurable through environment variables rather than hard-coded:

```env
LLM_PROVIDER=anthropic
LLM_MODEL=<configured-model>
```

This allows us to change models without changing application code.

---

## Do not use one giant prompt

The analysis should be a pipeline.

```text
                 Resume
                   |
                   v
          Document Extraction
                   |
                   v
          Resume Normalization
                   |
                   v
       +-----------+-----------+
       |           |           |
       v           v           v
   Experience   Skills      Structure
   Analysis     Analysis    Analysis
       |           |           |
       +-----------+-----------+
                   |
                   v
             Career Analysis
                   |
                   v
             ATS Analysis
                   |
                   v
          Evidence Aggregation
                   |
                   v
          Deterministic Scoring
                   |
                   v
             Final Report
```

This is preferable to asking an LLM:

> "Give this resume a score out of 100."

---

# 4. Document Processing Pipeline

## PDF

```text
PDF
 |
 v
Text extraction
 |
 v
Section detection
 |
 v
Layout / formatting inspection
 |
 v
Normalized Resume JSON
```

## DOCX

```text
DOCX
 |
 v
DOCX parser
 |
 v
Paragraph/table extraction
 |
 v
Section detection
 |
 v
Normalized Resume JSON
```

---

# 5. Resume Normalized Data Model

The raw document should be converted into a canonical structure.

Example:

```json
{
  "candidate": {
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "+44...",
    "location": "London, UK"
  },
  "summary": "...",
  "experience": [
    {
      "company": "Example Ltd",
      "title": "Senior Software Engineer",
      "startDate": "2022-01",
      "endDate": null,
      "location": "London",
      "description": "...",
      "bullets": [
        "..."
      ]
    }
  ],
  "education": [],
  "skills": [
    "Java",
    "Spring Boot",
    "React"
  ],
  "certifications": [],
  "projects": [],
  "languages": []
}
```

This normalized representation becomes the primary input to the AI analysis.

---

# 6. Analysis Modules

The analysis should be divided into specialized modules.

## 6.1 Experience Analysis

Evaluate:

- Responsibility
- Scope
- Technical complexity
- Ownership
- Seniority
- Career progression
- Duration
- Role consistency
- Impact

Example output:

```json
{
  "score": 84,
  "strengths": [],
  "weaknesses": [],
  "evidence": []
}
```

The model should cite the actual resume evidence internally.

---

## 6.2 Achievement Analysis

Identify whether bullets communicate:

```text
Action
+
Technical work
+
Scale
+
Outcome
```

Weak:

```text
Worked on a Java application.
```

Stronger:

```text
Redesigned the Java service architecture, reducing processing time by 35%.
```

The system should distinguish between:

- Responsibilities
- Activities
- Achievements
- Quantified achievements

---

## 6.3 Skills Analysis

Extract:

- Programming languages
- Frameworks
- Databases
- Cloud
- Infrastructure
- DevOps
- Architecture
- Methodologies
- Domain skills

Also determine:

- Proficiency signal
- Evidence of use
- Recency
- Frequency
- Seniority relevance

Avoid treating a keyword appearing once as evidence of expertise.

---

## 6.4 Career Level Analysis

Estimate:

- Junior
- Mid-level
- Senior
- Staff
- Principal
- Engineering Manager
- Director

This should be based on evidence such as:

```text
Years of experience
Scope
Ownership
Architecture
Leadership
Mentoring
System complexity
Business impact
Cross-team influence
```

---

## 6.5 Structure Analysis

Evaluate:

- Section organization
- Length
- Consistency
- Date formatting
- Heading quality
- Bullet structure
- Contact information
- Education
- Skills
- Redundancy

---

## 6.6 ATS Analysis

Check for:

- Standard section headings
- Text extractability
- Tables
- Columns
- Images
- Icons
- Header/footer dependence
- Keyword coverage
- Unusual formatting

Important:

ATS scoring should not be presented as a universal truth. Different ATS systems behave differently.

---

## 6.7 Language Analysis

Evaluate:

- Grammar
- Spelling
- Clarity
- Verb tense
- Repetition
- Weak verbs
- Filler language
- First-person usage
- Unnecessary adjectives

---

# 7. Deterministic Scoring System

The LLM should provide evidence and category-level assessments.

The backend should calculate the final score.

Example:

| Category | Weight |
|---|---:|
| Experience | 20% |
| Achievements / Impact | 15% |
| Skills | 15% |
| Career progression | 15% |
| Clarity | 10% |
| ATS compatibility | 10% |
| Grammar | 5% |
| Structure | 5% |
| Career positioning | 5% |

Formula:

```text
overallScore =
  experience * 0.20 +
  achievements * 0.15 +
  skills * 0.15 +
  progression * 0.15 +
  clarity * 0.10 +
  ats * 0.10 +
  grammar * 0.05 +
  structure * 0.05 +
  positioning * 0.05
```

This means changing the LLM does not automatically change the scoring formula.

---

# 8. Evidence-Based Analysis

Every important recommendation should be traceable to resume content.

Instead of:

```text
Your resume lacks leadership.
```

Return:

```json
{
  "finding": "Leadership signal is weak",
  "evidence": [
    {
      "section": "Experience",
      "text": "Mentored two junior developers."
    }
  ],
  "reason": "The resume demonstrates mentoring but provides limited evidence of team-level technical ownership."
}
```

This makes the product more trustworthy.

---

# 9. Career Matching

The system should produce likely roles.

Example:

```text
Senior Software Engineer       94%
Backend Engineer               91%
Full Stack Engineer             88%
Platform Engineer               82%
Solutions Engineer              77%
Engineering Manager             63%
```

The percentage should represent the application's defined match score, not a claim that the candidate has a mathematical probability of getting hired.

---

# 10. Job-Specific Analysis

This should be a major feature.

Input:

```text
Resume
+
Job Description
```

Output:

```text
Overall Match        87%

Skills               94%
Experience           91%
Seniority            88%
Domain               72%
Keywords             83%
Impact               79%
```

Then identify:

### Strong matches

```text
Java
Spring Boot
React
Microservices
REST APIs
SQL
CI/CD
```

### Missing or weak signals

```text
AWS
Kubernetes
System Design
Technical Leadership
```

### Resume changes

Recommend changes only where the candidate has supporting evidence.

Never instruct the user to add experience they do not have.

---

# 11. API Design

## Authentication

```text
POST /auth/register
POST /auth/login
POST /auth/logout
GET  /auth/me
```

---

## Resumes

```text
POST   /resumes
GET    /resumes
GET    /resumes/:id
DELETE /resumes/:id
```

---

## Analysis

```text
POST /resumes/:id/analyze
GET  /analyses/:id
GET  /analyses/:id/status
```

---

## Jobs

```text
POST   /jobs
GET    /jobs
GET    /jobs/:id
DELETE /jobs/:id
```

---

## Job Analysis

```text
POST /jobs/:jobId/analyze/:resumeId
GET  /job-analyses/:id
```

---

# 12. Asynchronous Analysis

Do not make the HTTP request wait for the entire LLM pipeline.

Use:

```text
POST /resumes/:id/analyze
        |
        v
Create Analysis
        |
        v
Queue Job
        |
        v
Return analysisId
```

Worker:

```text
Analysis Worker
 |
 +-- Extract
 |
 +-- Normalize
 |
 +-- Analyze experience
 |
 +-- Analyze skills
 |
 +-- Analyze achievements
 |
 +-- Analyze structure
 |
 +-- Analyze ATS
 |
 +-- Analyze career positioning
 |
 +-- Calculate score
 |
 +-- Persist result
```

Frontend:

```text
GET /analyses/:id/status
```

or use WebSockets/SSE for live progress.

---

# 13. Database Design

## users

```text
id
email
name
password_hash
created_at
updated_at
```

## resumes

```text
id
user_id
original_filename
storage_key
mime_type
file_size
created_at
```

## resume_versions

```text
id
resume_id
version
raw_text
normalized_json
created_at
```

## analyses

```text
id
resume_version_id
status
overall_score
analysis_json
model
prompt_version
created_at
completed_at
```

## jobs

```text
id
user_id
title
company
description
created_at
```

## job_analyses

```text
id
job_id
resume_version_id
match_score
analysis_json
model
prompt_version
created_at
```

## credit_transactions

```text
id
user_id
amount
type
reference
created_at
```

---

# 14. Prompt Versioning

Prompts should not live as random strings throughout the backend.

Use versioned prompt templates:

```text
prompts/
  resume/
    experience-v1
    experience-v2
    skills-v1
    achievements-v1
    career-v1
    ats-v1
```

Persist:

```text
model
prompt_version
analysis_version
```

with every analysis.

This allows us to determine why two analyses differ.

---

# 15. LLM Output Validation

Never blindly trust model output.

Use a schema.

Example:

```typescript
const ResumeAnalysisSchema = z.object({
  experience: z.object({
    score: z.number().min(0).max(100),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    evidence: z.array(z.string())
  }),

  skills: z.object({
    score: z.number().min(0).max(100),
    strengths: z.array(z.string()),
    gaps: z.array(z.string())
  })
});
```

If validation fails:

```text
LLM response
    ↓
Schema validation
    ↓
Invalid?
 ┌──┴──┐
Yes    No
 |      |
Retry   Persist
```

---

# 16. Frontend Design

## Landing Page

```text
------------------------------------------------
AI Resume Judge

Find out how strong your resume actually is.

Upload your resume and get a structured
assessment of your experience, skills,
career level and positioning.

[ Upload Resume ]

PDF / DOCX
------------------------------------------------
```

---

## Analysis Progress

```text
Analysing your resume...

✓ Reading document
✓ Extracting experience
✓ Identifying skills
✓ Evaluating achievements
● Assessing career level
○ Calculating final score
```

---

## Results Dashboard

```text
------------------------------------------------
YOUR RESUME SCORE

                    84
                   /100

Senior Software Engineer
Strong candidate positioning

------------------------------------------------

STRENGTHS

✓ Strong technical ownership
✓ Good career progression
✓ Strong backend experience

------------------------------------------------

AREAS TO IMPROVE

! Limited quantified impact
! Leadership evidence is weak
! Skills section is too broad

------------------------------------------------

CAREER POSITIONING

Senior Software Engineer       94%
Backend Engineer               91%
Full Stack Engineer             88%

------------------------------------------------
```

---

# 17. Resume Detail View

Allow the user to click a finding and see the source evidence.

```text
Weak impact signal

Resume evidence:

"Developed a new discharge management system."

Why this matters:

The bullet describes the work but does not establish
scale, outcome or measurable impact.

Potential improvement:

If supported by your actual experience, describe the
users affected, process improvement, time saved,
reduction in errors or operational impact.
```

The system must not invent metrics.

---

# 18. Security & Privacy

Resume data is sensitive.

Requirements:

- HTTPS
- Encryption at rest
- Secure object storage
- Signed upload URLs
- Signed download URLs
- Strict user ownership checks
- No public resume URLs
- File type validation
- File size limits
- Malware scanning
- Rate limiting
- Authentication
- Audit logging
- Data deletion
- Account deletion
- Resume deletion

The system should clearly state how uploaded resumes are handled.

For a UK-facing product, design with UK GDPR requirements in mind.

Do not retain uploaded documents indefinitely without a reason.

---

# 19. AI Cost Control

LLM calls are the primary variable cost.

Do not send the entire resume repeatedly to the model.

Pipeline:

```text
Document
   ↓
Normalize once
   ↓
Store normalized JSON
   ↓
Reuse normalized representation
```

For job matching:

```text
Normalized Resume
        +
Normalized Job
        ↓
LLM
```

instead of repeatedly parsing the resume.

Potential optimizations:

- Cache extraction
- Cache normalized resume
- Use cheaper models for simple extraction
- Use stronger models for final judgement
- Limit output tokens
- Batch independent analyses where appropriate

---

# 20. Multi-Model Strategy

A production version does not necessarily need one model for every task.

Example:

```text
PDF/DOCX extraction
        ↓
Cheap/fast model or parser

Classification / normalization
        ↓
Fast model

Detailed resume judgement
        ↓
Stronger Claude model

Final synthesis
        ↓
Strong reasoning model
```

The application should abstract the provider:

```typescript
interface LLMProvider {
  analyzeResume(input: ResumeInput): Promise<ResumeAnalysis>;
  analyzeJobMatch(
    resume: ResumeInput,
    job: JobInput
  ): Promise<JobMatchAnalysis>;
}
```

Then implementations can include:

```text
AnthropicProvider
OpenAIProvider
GoogleProvider
```

This prevents vendor lock-in.

---

# 21. Billing

Use Stripe.

Possible model:

```text
Free
1 analysis

£5
10 analyses

£10
30 analyses

£20
100 analyses
```

Track every analysis through a credit ledger.

Never simply decrement an integer without a transaction record.

---

# 22. MVP Scope

## Phase 1

Build only:

```text
Landing page
    ↓
PDF/DOCX upload
    ↓
Document extraction
    ↓
Resume normalization
    ↓
AI analysis
    ↓
Scoring
    ↓
Results dashboard
```

Include:

- Overall score
- Strengths
- Weaknesses
- Experience
- Skills
- Career level
- Recommended roles
- ATS assessment
- Improvement recommendations

No billing initially.

---

# 23. Phase 2

Add:

```text
Accounts
Resume history
Job descriptions
Job matching
Saved analyses
PDF report export
Credits
Stripe
```

---

# 24. Phase 3

Add:

```text
Resume optimizer
Resume rewriting
Cover letter generation
Resume version comparison
Job application tracking
LinkedIn profile analysis
```

---

# 25. Phase 4

Potential differentiators:

## Candidate Profile

Build a persistent candidate profile from all resume versions.

```text
Technical depth
Leadership
Architecture
Business impact
Communication
Domain expertise
Seniority
```

## Job Market Positioning

Show which roles the candidate is strongest for.

## Resume-to-Job Gap Analysis

Identify the difference between:

```text
Current profile
        ↓
Target role
```

## Interview Preparation

Generate interview questions based on:

- Resume
- Job description
- Candidate experience
- Technical stack

---

# 26. Recommended Repository Structure

```text
resume-judge/
│
├── apps/
│   ├── web/
│   │   └── Next.js application
│   │
│   └── api/
│       └── NestJS application
│
├── packages/
│   ├── types/
│   ├── schemas/
│   ├── ui/
│   ├── llm/
│   └── config/
│
├── workers/
│   └── analysis-worker/
│
├── prompts/
│   ├── resume/
│   └── job/
│
├── prisma/
│   └── schema.prisma
│
├── infrastructure/
│   ├── docker/
│   └── terraform/
│
└── docs/
    ├── architecture.md
    ├── api.md
    └── scoring.md
```

---

# 27. Local Development

Recommended Docker services:

```text
PostgreSQL
Redis
MinIO
```

Application:

```text
Next.js
NestJS
Worker
```

Example:

```text
localhost:3000   Web
localhost:4000   API
localhost:5432   PostgreSQL
localhost:6379   Redis
localhost:9000   MinIO
```

---

# 28. Deployment

A simple initial deployment:

```text
                   Internet
                      |
                 Cloudflare
                      |
          +-----------+-----------+
          |                       |
       Vercel                  API host
          |                       |
       Next.js                 NestJS
                                  |
                    +-------------+-------------+
                    |             |             |
                 Postgres       Redis           S3
                    |
                 Workers
                    |
               Anthropic API
```

Possible infrastructure:

- Vercel for Next.js
- AWS/Render/Fly.io/Railway for NestJS workers
- PostgreSQL managed service
- Redis managed service
- S3/R2 for documents
- Cloudflare for DNS/WAF

Move to AWS/GCP/Azure infrastructure when scale or compliance requirements justify it.

---

# 29. Observability

Use:

- Sentry
- OpenTelemetry
- Structured logging
- Request IDs
- LLM request tracing
- Token/cost tracking

Track:

```text
Analysis duration
LLM latency
Input tokens
Output tokens
LLM cost
Failed analyses
Schema validation failures
Retry count
User conversion
```

This is important because the LLM layer is both the most expensive and least deterministic part of the application.

---

# 30. Testing Strategy

## Unit tests

Test:

- Score calculation
- Resume normalization
- Schema validation
- Credit transactions
- Authorization
- Job matching calculations

## Integration tests

Test:

```text
Upload
→ extraction
→ analysis
→ persistence
→ result retrieval
```

## LLM evaluation tests

Create a fixed benchmark set of resumes.

For example:

```text
10 junior resumes
10 mid-level resumes
10 senior resumes
10 weak resumes
10 strong resumes
```

Run every prompt/model change against the benchmark.

Measure:

- Score consistency
- Correct skill extraction
- Correct seniority
- Hallucination rate
- Recommendation quality
- Job matching accuracy

This is important because changing the LLM or prompt can silently change product behavior.

---

# 31. Key Product Principle

The application should distinguish between:

```text
FACT
```

What is actually stated in the resume.

```text
INFERENCE
```

What the system reasonably concludes from the resume.

```text
RECOMMENDATION
```

What the candidate could improve.

Never present an inference as a fact.

Never fabricate experience, achievements or metrics.

---

# 32. Initial Build Order

Recommended implementation order:

```text
1. Monorepo
2. Next.js application
3. NestJS API
4. PostgreSQL + Prisma
5. Authentication
6. S3/R2 document storage
7. PDF/DOCX extraction
8. Resume normalization
9. Anthropic provider abstraction
10. Structured LLM analysis
11. Deterministic scoring engine
12. Analysis worker + Redis
13. Results dashboard
14. Job description analysis
15. Resume/job matching
16. Billing
17. Security hardening
18. Observability
19. Evaluation benchmark
20. Production deployment
```

---

# 33. First Production Target

The first production version should answer one question exceptionally well:

> "How strong is this resume, and what specifically should I change?"

The user journey should be:

```text
Landing Page
     ↓
Upload Resume
     ↓
Processing
     ↓
Resume Score
     ↓
Candidate Profile
     ↓
Strengths
     ↓
Weaknesses
     ↓
Evidence
     ↓
Recommendations
     ↓
Recommended Roles
```

Then the second major workflow becomes:

```text
Resume
   +
Job Description
       ↓
    Match Score
       ↓
 Strong Matches
       ↓
 Missing Signals
       ↓
 Resume Changes
```

This creates a foundation for the later resume optimizer, cover-letter generator and interview-preparation features without having to redesign the backend.

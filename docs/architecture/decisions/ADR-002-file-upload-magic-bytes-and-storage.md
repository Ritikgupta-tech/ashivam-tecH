# ADR-002: File Upload Security, Magic-Byte Signatures, and Storage Isolation

## Status
Accepted

## Context
The platform processes sensitive file uploads across two distinct operational domains:
1. **Candidate Resumes (`/api/v1/careers/jobs/:id/apply`):** Submitted by public applicants. Supported formats: PDF, DOC, DOCX. Max size: 5 MB.
2. **HR Documents (`/api/v1/hr-documents/upload`):** Uploaded by authenticated administrative users for employee onboarding and compliance. Supported formats: PDF, JPEG, PNG, WEBP, DOC, DOCX. Max size: 10 MB.

Client-provided MIME headers (`Content-Type`) and file extensions (`.pdf`, `.png`) are easily forged by malicious actors. An attacker can upload an executable (`.exe` or script) disguised as a PDF by spoofing headers. Furthermore, public direct HTTP access to the `uploads/` directory on the server could allow unauthorized access to sensitive applicant resumes and employee records.

## Decision
1. **Binary Magic-Byte Signature Validation:**
   Implement strict binary header signature checking in `validateFileSignature` before accepting or persisting any file:
   - PDF: `%PDF` (`0x25, 0x50, 0x44, 0x46`)
   - DOC: Microsoft Compound OLE (`0xD0, 0xCF, 0x11, 0xE0`)
   - DOCX: ZIP archive OpenXML (`0x50, 0x4B, 0x03, 0x04`)
   - JPEG: SOI marker (`0xFF, 0xD8, 0xFF`)
   - PNG: Magic bytes (`0x89, 0x50, 0x4E, 0x47`)
   - WEBP: RIFF container with WEBP chunk (`0x52, 0x49, 0x46, 0x46 ... 0x57, 0x45, 0x42, 0x50`)
2. **Dual-Tier Storage Architecture:**
   - **Production Tier:** Cloudflare R2 / AWS S3 object storage via `@aws-sdk/client-s3`. Files are uploaded with UUID keys, zero public bucket access, and accessed exclusively via presigned URLs or authenticated streaming endpoints.
   - **Local / Staging Fallback:** Server-isolated directory `uploads/` with direct public static routing blocked (`app.use("/uploads", ...)` returns 404). Access is mediated exclusively through authenticated RBAC streaming endpoints (`GET /api/v1/hr-documents/:id/download` and `GET /api/v1/careers/applications/:id/resume`).
3. **Header Sanitization & Content-Disposition:**
   All downloaded or viewed files are served with `Content-Security-Policy: default-src 'none'`, `X-Content-Type-Options: nosniff`, and sanitized file basenames.

## Consequences
### Positive
- Total defense against polyglot file attacks, disguised executable uploads, and script execution.
- Resumes and HR records cannot be crawled or discovered by search engines or unauthenticated actors.
- Zero local disk dependency when deployed to ephemeral container cloud platforms (Render).

### Negative / Trade-offs
- CPU overhead for reading binary buffer headers (sub-millisecond for the first 16 bytes).
- Cloud object storage requires valid S3 credentials in production (`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`).

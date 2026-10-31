# Ashivam Technologies — File Upload Security Architecture

## 1. Threat Matrix & Defense Strategy
Uploading files to web applications presents high-severity risks:
- **Executable Camouflage:** An attacker renames a malicious `.exe`, `.sh`, or `.php` file to `.pdf` and uploads it.
- **Polyglot Files:** Files that are simultaneously valid image formats and executable scripts.
- **Direct Path Traversal:** Unsanitized filenames containing `../` overwriting sensitive server files.
- **Unauthorized Information Disclosure:** Public direct access to candidate resumes and employee identity documents.

---

## 2. Multi-Tier File Validation Pipeline

```
[ Incoming Multipart Request ]
              │
              ▼
1. Multer Size Limiter: Enforces 5 MB (resumes) / 10 MB (HR docs)
              │
              ▼
2. Extension Whitelist: Strips path traversal characters, checks extension against allowed list
              │
              ▼
3. Content-Type Header Verification: Checks declared MIME type against allowed Set
              │
              ▼
4. Binary Magic-Byte Inspection: Inspects initial buffer bytes against canonical file signatures
   - PDF:  %PDF (0x25 0x50 0x44 0x46)
   - DOC:  OLE Header (0xD0 0xCF 0x11 0xE0)
   - DOCX: ZIP PK Header (0x50 0x4B 0x03 0x04)
   - JPG:  SOI (0xFF 0xD8 0xFF)
   - PNG:  \x89PNG (0x89 0x50 0x4E 0x47)
   - WEBP: RIFF....WEBP (0x52 0x49 0x46 0x46 ... 0x57 0x45 0x42 0x50)
              │
              ▼
5. Storage Persistence:
   - S3 / R2: Stored with generated UUID key; private bucket with no public read
   - Local: Stored in isolated directory; direct HTTP routing blocked via 404
              │
              ▼
6. Retrieval & Streaming:
   - Presigned S3 URLs (15m expiry) OR
   - Authenticated RBAC streaming with Content-Disposition & nosniff headers
```

---

## 3. Storage Isolation & Download Hardening
1. **Public URL Elimination:** Direct static public serving of uploads is blocked (`app.use("/uploads", ...)` returns 404). Resumes and HR records cannot be crawled or downloaded by unauthenticated parties.
2. **Download Headers:** When documents are streamed to authorized administrators:
   - `Content-Security-Policy: default-src 'none'`
   - `X-Content-Type-Options: nosniff`
   - `Content-Disposition: attachment; filename="<sanitized_name>"`

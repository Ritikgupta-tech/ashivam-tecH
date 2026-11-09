# ASHIVAM TECHNOLOGIES — DATA MAPPING & PRIVACY SPECIFICATION
## Phase 6: Privacy by Design, Field Mapping & Data Minimization

---

## 1. Data Minimization Principles

Under the Ashivam Technologies Data Protection Standard (aligned with ISO/IEC 27001 and GDPR principles), cross-service handoffs transfer strictly the minimal necessary fields:

- **What IS Transferred:**
  - Candidate identity (Full Name, Contact Email, Phone).
  - Relevant academic/professional track.
  - Final performance metric (Aggregated score 0-100 and honors grade).
  - Cryptographically verifiable Certificate Number.
  - Official Mentor hiring recommendation.

- **What is NEVER Transferred across Service Boundaries:**
  - Raw national identity documents (Aadhaar, Passport, SSN) — remain strictly inside the respective system vault.
  - Personal emergency contact details of interns until employment onboarding is approved.
  - Granular internal committee deliberations or private notes.
  - User passwords or password hashes (zero credential synchronization).

---

## 2. Field Mapping Tables

### 2.1 Website Application to Internship Application Mapping

| Source Field (`CareerApplication`) | Target Field (`Application`) | Transformation / Validation Rule |
| :--- | :--- | :--- |
| `name` | `applicantName` | Trimmed, validated non-empty |
| `email` | `email` | Lowercased, regex validated |
| `phone` | `phone` | Sanitized phone string |
| `roleApplied` | `program` | Normalized to standard track catalog |
| `resumeUrl` | `resumeUrl` | Direct HTTPS URL link |
| `coverLetter` | `reviewNotes` | Prefixed with Website integration metadata |

---

### 2.2 Internship Completed Intern to HRMS Conversion Queue Mapping

| Source Field (`InternProfile` & `Certificate`) | Target Field (`ConversionQueue`) | Notes |
| :--- | :--- | :--- |
| `internId` | `internId` | Unique cross-reference key |
| `certificateNumber` | `certificateNumber` | Cryptographic reference |
| `name` | `candidateName` | Preserved |
| `email` | `candidateEmail` | Primary key for HRMS employee dossier |
| `phone` | `candidatePhone` | Emergency/HR contact |
| `track` | `track` | Informs department & designation |
| `finalScore` | `finalScore` | Performance justification |
| `grade` | `grade` | Distinction, Merit, Pass |
| `mentorRecommendation` | `mentorRecommendation` | Hiring evidence |

---

### 2.3 HRMS Conversion Approval to Master Employee Mapping

| Source Field (`ConversionQueue`) | Target Field (`Employee`) | Transformation Rule |
| :--- | :--- | :--- |
| `candidateName` | `firstName`, `lastName` | Split on whitespace; defaults to 'Intern' / 'Graduate' |
| `candidateEmail` | `officialEmail` | Becomes primary corporate email |
| `candidatePhone` | `phone` | Stored in employee dossier |
| User Selection | `department` | ObjectId ref to `Department` |
| User Selection | `designation` | ObjectId ref to `Designation` |
| User Selection | `compensation` | Monthly base salary in INR |
| Generated | `employeeId` | Generated sequence: `ASH-EMP-YYYY-XXXX` |
| Automatic | `status` | Set to `Onboarding` |
| Automatic | `onboardingChecklist` | Step 1 checklist initialized |
| Automatic | `leaveBalances` | Annual, Sick, and Casual leave allocated |

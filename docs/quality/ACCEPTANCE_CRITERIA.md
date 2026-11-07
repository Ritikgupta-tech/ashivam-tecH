# Ashivam Technologies — Production Acceptance Criteria & Gherkin Specifications

> **Document Version:** 1.0.0  
> **Classification:** Engineering & QA Standard  
> **Status:** Production Accepted  
> **Format:** Given-When-Then (Gherkin Standard)  

---

## 1. Corporate Website Acceptance Criteria

### 1.1 Inbound Customer Inquiry Submission
```gherkin
Scenario: Successful enterprise inquiry submission
  Given an anonymous visitor navigates to "/contact"
  When they fill in "fullName" with "Alexander Wright"
    And "email" with "alexander.wright@enterprise.com"
    And "phone" with "+91 98765 43210"
    And "message" with "Requesting software architecture consultation for FinTech application."
    And leave the hidden "_gotcha" honeypot field empty
    And click "Send Message"
  Then the system returns HTTP 201 Created
    And a record is persisted in "inquiries" with status "NEW"
    And an asynchronous task is enqueued in "outbox_events" for email delivery
    And the user interface displays a success confirmation modal with reference ID
```

### 1.2 Anti-Spam Honeypot Detection
```gherkin
Scenario: Automated bot trips hidden honeypot
  Given a malicious web crawler submits a POST request to "/api/v1/inquiries"
  When the payload includes "_gotcha" with value "spam_bot_payload"
  Then the system rejects the submission with HTTP 400 Bad Request
    And no record is written to the database
    And no email notification is dispatched
```

### 1.3 Careers Application with Resume Upload
```gherkin
Scenario: Candidate submits application with valid PDF resume
  Given an applicant is on "/careers" and opens the application modal for "Senior DevOps Architect"
  When they provide candidate details and attach "resume.pdf" with valid "%PDF-" magic bytes (< 5MB)
    And click "Submit Application"
  Then the file is uploaded to encrypted S3 storage
    And a career application record is created with status "SUBMITTED"
    And the applicant receives a confirmation email
    And the modal safely returns focus to the trigger button upon dismissal
```

---

## 2. Authentication & Session Acceptance Criteria

### 2.1 Refresh Token Rotation
```gherkin
Scenario: User silently refreshes expired access token
  Given an authenticated user with an expired JWT access token
  When the client makes an API request to a protected endpoint
    And the API client automatically calls "/api/v1/auth/refresh-token" with the valid HttpOnly cookie
  Then the server verifies the token family
    And issues a new JWT access token in the response body
    And rotates the HttpOnly cookie with a fresh refresh token
    And the original API request succeeds transparently
```

### 2.2 Replay Attack Detection & Immediate Family Revocation
```gherkin
Scenario: Attacker attempts to replay a previously consumed refresh token
  Given an attacker intercepts "RefreshToken_V1" after it has already rotated to "RefreshToken_V2"
  When the attacker submits "RefreshToken_V1" to "/api/v1/auth/refresh-token"
  Then the server detects that "RefreshToken_V1" has already been consumed
    And immediately revokes the entire token family
    And returns HTTP 403 Forbidden
    And invalidates all active sessions for that user
    And logs a high-severity security incident
```

---

## 3. HRMS & Document Vault Acceptance Criteria

### 3.1 KYC Document Upload & Ephemeral Preview
```gherkin
Scenario: Employee uploads PAN card and HR inspects via time-limited link
  Given an onboarded employee uploads their PAN card PDF
  When the file is validated and stored in encrypted S3
  Then the document status is set to "PENDING"
    And an audit log entry is recorded
  When an authorized HR Manager requests a document preview
  Then the server verifies their "HR_MANAGER" role
    And returns a pre-signed S3 URL valid for exactly 120 seconds
    And logs the preview access event
```

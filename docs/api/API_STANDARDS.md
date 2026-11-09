# Ashivam Technologies — REST API Design Standards & Protocol Specifications

> **Document Version:** 1.0.0  
> **Classification:** Engineering Standard  
> **Status:** Production Standard  
> **Target Audience:** Backend Engineers, Frontend Engineers, Integration Partners  

---

## 1. Executive Summary

This standard defines the architectural conventions, JSON envelope schemas, HTTP status codes, pagination models, error formats, and required transport headers for all REST APIs developed at Ashivam Technologies.

---

## 2. General REST Principles

1. **Resource-Oriented URIs:** URIs must use plural nouns representing resources, never verbs or operations.
   - Good: `GET /api/v1/inquiries`, `POST /api/v1/careers`
   - Bad: `POST /api/v1/createInquiry`, `GET /api/v1/getCareers`
2. **Predictable Versioning:** All endpoints are prefixed with the major API version: `/api/v1/...`.
3. **HTTP Methods & Semantics:**
   - `GET`: Read resource without side-effects. Safe and idempotent.
   - `POST`: Create a new resource or execute a non-idempotent operation.
   - `PUT`: Complete resource replacement (idempotent).
   - `PATCH`: Partial resource update (idempotent).
   - `DELETE`: Remove or soft-delete a resource (idempotent).

---

## 3. Standard JSON Response Envelope

All API endpoints must return responses conforming to the standardized Ashivam JSON envelope.

### 3.1 Successful Response Format
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Resource retrieved successfully",
  "data": {
    "id": "6724fa10b...",
    "fullName": "Jane Doe",
    "email": "ritik95061@gmail.com"
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "totalRecords": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "correlationId": "req_8f19b4e0-798c-4f81-a83d-1a8c9b910bcf",
  "timestamp": "2026-11-07T18:30:00.000Z"
}
```

### 3.2 Error Response Format
```json
{
  "success": false,
  "statusCode": 422,
  "message": "Validation failed on submitted payload",
  "errors": [
    {
      "field": "email",
      "message": "Must be a valid email address conforming to RFC 5322"
    },
    {
      "field": "phone",
      "message": "Phone number must contain between 10 and 15 digits"
    }
  ],
  "correlationId": "req_8f19b4e0-798c-4f81-a83d-1a8c9b910bcf",
  "timestamp": "2026-11-07T18:30:01.000Z"
}
```

---

## 4. Standard HTTP Status Codes

| Status Code | Meaning | When to Use |
| :--- | :--- | :--- |
| **`200 OK`** | Request Succeeded | Successful `GET`, `PATCH`, or `PUT`. |
| **`201 Created`** | Resource Created | Successful `POST` creating an entity (`Inquiry`, `Employee`). |
| **`204 No Content`** | Request Succeeded (No Body) | Successful `DELETE` or state transition returning empty payload. |
| **`400 Bad Request`** | Malformed Request | Syntax error, malformed JSON, or missing magic bytes in uploads. |
| **`401 Unauthorized`**| Unauthenticated | Missing or expired JWT access token; missing authentication header. |
| **`403 Forbidden`** | Insufficient Privilege | Valid token, but user lacks necessary RBAC role or resource ownership. |
| **`404 Not Found`** | Resource Missing | Entity ID does not exist in the database. |
| **`409 Conflict`** | State Conflict | Optimistic locking `VersionError`, or unique index violation. |
| **`422 Unprocessable`**| Schema Validation Error | Payload is well-formed JSON but violates field validation rules. |
| **`429 Rate Limited`** | Rate Limit Tripped | Client exceeded IP or sliding window rate limit. |
| **`500 Server Error`** | Uncaught Exception | Internal server failure. Stack trace suppressed in production. |
| **`503 Unavailable`** | Service Outage | Downstream database, Redis, or SMTP connection unavailable. |

---

## 5. Pagination, Sorting & Filtering Conventions

### 5.1 Query Parameters
- **Pagination:**
  - `page`: 1-based page index (Default: `1`).
  - `limit`: Items per page (Default: `20`, Maximum: `100`).
- **Sorting:**
  - `sort`: Field name prefixed with `-` for descending, or `+` for ascending.  
    *Example:* `?sort=-createdAt` (newest first), `?sort=fullName` (alphabetical).
- **Filtering:**
  - Direct field filtering: `?department=Engineering&status=ACTIVE`.
  - Date range filtering: `?createdAfter=2026-01-01T00:00:00Z&createdBefore=2026-12-31T23:59:59Z`.

---

## 6. Required HTTP Headers

### 6.1 Request Headers
- `X-Correlation-ID`: Optional client UUID. If omitted, Express gateway generates one.
- `Authorization`: `Bearer <jwt_access_token>` for all protected endpoints.
- `Content-Type`: `application/json` (or `multipart/form-data` for file uploads).

### 6.2 Response Security Headers
All API responses must include security headers applied via Helmet:
```http
X-Correlation-ID: req_8f19b4e0-798c-4f81-a83d-1a8c9b910bcf
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
```

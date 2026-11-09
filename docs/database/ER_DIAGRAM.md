# Ashivam Technologies — Database Entity-Relationship (ER) Architecture

> **Document Version:** 1.0.0  
> **Classification:** Engineering Reference  
> **Database Engine:** MongoDB Atlas 7.0 Replica Set  
> **ODM:** Mongoose 8.x  

---

## 1. Complete Entity-Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ REFRESH_TOKEN_FAMILY : "owns"
    USER ||--o{ AUDIT_LOG : "triggers"
    
    INQUIRY {
        ObjectId _id PK
        string fullName
        string email
        string phone
        string subject
        string message
        string status
        boolean isArchived
        string adminNotes
        timestamp createdAt
        timestamp updatedAt
    }

    CAREER ||--o{ CAREER_APPLICATION : "receives"
    CAREER {
        ObjectId _id PK
        string title
        string department
        string jobType
        string experienceLevel
        string location
        string description
        string[] requirements
        string status
        timestamp createdAt
    }

    CAREER_APPLICATION {
        ObjectId _id PK
        ObjectId careerId FK
        string candidateName
        string email
        string phone
        string resumeUrl
        string resumeStorageKey
        string status
        timestamp createdAt
    }

    INTERNSHIP ||--o{ INTERN : "enrolls"
    INTERNSHIP {
        ObjectId _id PK
        string title
        string track
        string cohortBatch
        date startDate
        date endDate
        int totalSeats
        string syllabusSummary
        string status
        timestamp createdAt
    }

    INTERN ||--o{ CERTIFICATE : "earns"
    INTERN {
        ObjectId _id PK
        ObjectId internshipId FK
        ObjectId userId FK
        string fullName
        string email
        string phone
        string collegeName
        string gitHubProfile
        string mentorAssigned
        int milestoneScoreTotal
        string status
        timestamp createdAt
    }

    CERTIFICATE {
        ObjectId _id PK
        ObjectId internId FK
        string certificateNumber UK
        string recipientName
        string trackTitle
        string issueDate
        string sha256Signature
        string verificationQrUrl
        string pdfStorageUrl
        boolean isRevoked
    }

    EMPLOYEE ||--o{ EMPLOYEE_DOCUMENT : "owns"
    EMPLOYEE ||--o{ HR_DOCUMENT_ACKNOWLEDGMENT : "acknowledges"
    EMPLOYEE {
        ObjectId _id PK
        ObjectId userId FK
        string employeeId UK
        string fullName
        string workEmail UK
        string personalEmail
        string phone
        string department
        string designation
        date dateOfJoining
        string employmentStatus
        boolean isDeleted
        date deletedAt
        int __v "Optimistic Locking"
    }

    EMPLOYEE_DOCUMENT {
        ObjectId _id PK
        ObjectId employeeId FK
        string documentType
        string s3StorageKey
        string originalFileName
        string mimeType
        int fileSize
        string sha256Checksum
        string verificationStatus
        ObjectId verifiedBy FK
        timestamp verifiedAt
        string rejectionReason
    }

    HR_DOCUMENT ||--o{ HR_DOCUMENT_ACKNOWLEDGMENT : "tracked_by"
    HR_DOCUMENT {
        ObjectId _id PK
        string title
        string category
        string version
        string policyPdfUrl
        boolean isMandatory
        boolean isActive
        timestamp createdAt
    }

    HR_DOCUMENT_ACKNOWLEDGMENT {
        ObjectId _id PK
        ObjectId hrDocumentId FK
        ObjectId employeeId FK
        string ipAddress
        string userAgent
        timestamp acknowledgedAt
    }

    USER {
        ObjectId _id PK
        string email UK
        string passwordHash
        string role
        boolean isActive
        boolean isLocked
        int failedLoginAttempts
        timestamp lockUntil
        string mfaSecret
        boolean mfaEnabled
    }

    REFRESH_TOKEN_FAMILY {
        ObjectId _id PK
        ObjectId userId FK
        string familyId UK
        string tokenHash
        boolean isConsumed
        boolean isRevoked
        timestamp expiresAt
    }

    OUTBOX_EVENT {
        ObjectId _id PK
        string aggregateType
        string aggregateId
        string eventType
        json payload
        string status
        int retryCount
        timestamp createdAt
        timestamp publishedAt
    }

    AUDIT_LOG {
        ObjectId _id PK
        ObjectId userId FK
        string action
        string targetEntity
        string targetId
        string ipAddress
        string userAgent
        json metadata
        timestamp createdAt
    }
```

---

## 2. Relational Integrity & Cascade Rules

1. **Soft Delete Cascades:** When an `Employee` is marked `isDeleted: true`, linked `EmployeeDocument` records remain intact for statutory retention (7 years), but are hidden from active operational views.
2. **Career Archival:** When a `Career` posting is archived or closed, linked historical `CareerApplication` records are preserved permanently in the talent pool database.
3. **Internship to Certificate Integrity:** Certificates can only be issued if the linked `Intern` record is in `GRADUATED` or `COMPLETED` status with `milestoneScoreTotal >= 70`.

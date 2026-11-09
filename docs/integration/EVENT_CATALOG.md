# ASHIVAM TECHNOLOGIES — INTEGRATION EVENT CATALOG
## Phase 6: Auditable Event Schema & Lifecycle Transitions

---

## 1. Integration Events Catalog

| Event Name | Source System | Target System | Trigger | Resulting State |
| :--- | :--- | :--- | :--- | :--- |
| `WEBSITE_APPLICATION_DISPATCHED` | `ashivam-website` | Outbound Dispatcher | Candidate submits job application | `IntegrationHandoff` created in website DB (`RETRYING` or `DELIVERED`). |
| `WEBSITE_APPLICATION_INGESTED` | `ashivam-website` | `ashivam-internship` | Reception of signed candidate payload | `Application` record created in `ashivam_internship` with status `Initial Screening`. |
| `INTERNSHIP_COMPLETION_ISSUED` | `ashivam-internship` | Internal Domain | Evaluation passes final threshold & HMAC Certificate signed | Intern status becomes `Completed`. Certificate record active. |
| `INTERNSHIP_CONVERSION_DISPATCHED` | `ashivam-internship` | Outbound Dispatcher | Program Manager / Director clicks dispatch to HRMS | `ConversionHandoff` created in internship DB (`QUEUED_IN_HRMS`). |
| `INTERNSHIP_CONVERSION_INGESTED` | `ashivam-internship` | `ashivam-hrms` | Reception of signed conversion proposal | `ConversionQueue` created in `ashivam_hrms` with status `PENDING_HR_REVIEW`. |
| `INTERN_CONVERSION_APPROVED` | `ashivam-hrms` | Internal Domain | HR explicitly approves conversion gate | `Employee` created (`ASH-EMP-YYYY-XXXX`), Step 1 Onboarding & Leave initialized. |
| `INTERN_CONVERSION_REJECTED` | `ashivam-hrms` | Internal Domain | HR explicitly rejects conversion gate | `ConversionQueue` marked `REJECTED` with logged rationale. |
| `HRMS_CONVERSION_STATUS_RECEIVED` | `ashivam-hrms` | `ashivam-internship` | Webhook callback delivering HR decision | `ConversionHandoff` updated with final decision and `hrmsEmployeeId`. |

---

## 2. Event Payload Schemas & Audit Immutability

Every event stored in `IntegrationEvent` maintains the following immutable audit schema:

```json
{
  "_id": "6aef88a3e44b4426fb86ece9",
  "idempotencyKey": "idemp_1794080123_4a9b21",
  "sourceSystem": "ashivam-internship",
  "targetSystem": "ashivam-hrms",
  "requestId": "req_1794080123_77ef",
  "correlationId": "corr_1794080123_0012",
  "eventType": "INTERNSHIP_CONVERSION_INGESTED",
  "status": "COMPLETED",
  "requestPayload": { ... },
  "responsePayload": { ... },
  "error": null,
  "createdAt": "2026-11-08T02:40:00.000Z",
  "updatedAt": "2026-11-08T02:40:00.000Z"
}
```

- **Retention & Cleanup:** A MongoDB TTL index (`expireAfterSeconds: 2592000`) automatically purges records older than 30 days, keeping database working sets lean while satisfying operational audit requirements.

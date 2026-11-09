# Contributing to Ashivam Technologies

Thank you for contributing to the Ashivam Technologies corporate and administrative platforms. To maintain enterprise production quality, all contributors must adhere strictly to these guidelines.

---

## 1. Non-Negotiable Engineering Standards

- **Preserve Working Functionality:** Never blindly rewrite existing features or replace dependencies without verified compatibility.
- **Zero Mock Data in Production:** Features must integrate with real verified APIs and database models.
- **Never Commit Secrets:** `.env` files, production API keys, and database passwords must never be committed to Git.
- **Evidence-Based Verification:** Every feature or bugfix PR must include passing automated test evidence.

---

## 2. Git Branching & Workflow

```
main (Production Protected)
  ▲
  │ Pull Request (Requires CI Pass & Code Review)
  │
feature/your-descriptive-feature-name
bugfix/ticket-id-description
docs/documentation-update
```

1. **Branch Naming:**
   - Features: `feature/<feature-name>`
   - Bugfixes: `bugfix/<issue-name>`
   - Hotfixes: `hotfix/<critical-issue>`
   - Documentation: `docs/<topic>`
2. **Commit Conventions (Conventional Commits):**
   - `feat(auth): implement web locks for token refresh`
   - `fix(css): restore missing secondary button styling`
   - `docs(api): document openapi 3.1 endpoints`
   - `test(security): add test for replay token revocation`

---

## 3. Pull Request Checklist

Before submitting a PR for review:

- [ ] All 107 frontend unit and accessibility tests pass: `npm test -- --run`
- [ ] Frontend builds cleanly with zero errors: `npm run build`
- [ ] Backend test suites pass without regression: `cd backend && npm test`
- [ ] Zero High or Critical security advisories: `npm audit`
- [ ] No unformatted code or unhandled console logs left in production files.
- [ ] Branch rebased cleanly against latest `main`.

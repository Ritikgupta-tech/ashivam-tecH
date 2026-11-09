# Ashivam Technologies — Pull Request

## Pull Request Checklist

### 1. Release Governance & Branching
- [ ] Source branch is `release/github-readiness` or a verified feature branch.
- [ ] Target branch is `main`.
- [ ] Commits follow Conventional Commits specification (`feat:`, `fix:`, `test:`, `chore:`).
- [ ] Commit author is verified as `Ritikgupta-tech <ritik95061@gmail.com>`.

### 2. Automated Testing & Verification
- [ ] All automated frontend tests pass locally (`npm test`).
- [ ] All automated backend tests pass locally (`npm test`).
- [ ] All database-safety and isolation defense tests pass (`node --test tests/database-safety.test.js`).
- [ ] Production Vite build succeeds without errors (`npm run build`).

### 3. Security & Data Protection
- [ ] Zero secrets, API keys, private keys, or passwords committed.
- [ ] No actual `.env` files tracked (only `.env.example` templates).
- [ ] High-severity dependency vulnerability audit is clean (`npm audit --audit-level=high`).
- [ ] Operational databases are protected with fail-closed test naming enforcement (`_test`).
- [ ] Corporate notifications route strictly to `ritik95061@gmail.com`.

### 4. Summary of Changes
- **Component(s) Affected:**
- **Description of Changes:**
- **Related Issue / Acceptance Decision:**

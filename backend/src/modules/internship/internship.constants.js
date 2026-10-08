/*
 * Lifecycle of an internship application.
 *
 * The live Intern Portal already shows "Under Review", "In Progress" and
 * "Completed". "applied", "selected" and "rejected" are added because an
 * admin must be able to record the selection decision.
 */
export const INTERNSHIP_STATUSES = [
  "applied",
  "under_review",
  "selected",
  "in_progress",
  "completed",
  "rejected",
];

/*
 * Statuses that count as an open application for duplicate protection.
 */
export const ACTIVE_INTERNSHIP_STATUSES = [
  "applied",
  "under_review",
  "selected",
  "in_progress",
];

/*
 * Must match the <select> options of the Internship form in index.html
 */
export const INTERNSHIP_DOMAINS = [
  "Web Development (React & Node.js)",
  "Mobile App Development (React Native)",
  "Python & Django Backend",
  "Java & Spring Boot",
  "UI/UX Design & Figma",
  "Software Engineering & APIs",
  "AI, ML & Data Science",
  "Cloud Infrastructure & DevOps",
];

export const INTERNSHIP_DURATIONS = [
  "4 Weeks",
  "6 Weeks",
  "8 Weeks",
  "3 Months",
];

export const INTERNSHIP_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "name",
  "status",
  "startDate",
];

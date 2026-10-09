/**
 * Validates whether a job record is a legitimate public vacancy,
 * filtering out draft/inactive jobs, expired positions, and internal QA/test verification records.
 */
export function isLegitimatePublishedJob(job) {
  if (!job || typeof job !== 'object') return false;
  if (!job.isActive) return false;

  // Check application deadline if specified
  if (job.applicationDeadline) {
    const deadline = new Date(job.applicationDeadline);
    if (!isNaN(deadline.getTime()) && deadline < new Date()) {
      return false;
    }
  }

  // Inspect title, description, and slug for test/verification markers
  const title = String(job.title || '').toLowerCase();
  const desc = String(job.description || '').toLowerCase();
  const slug = String(job.slug || '').toLowerCase();

  const isTestRecord =
    desc.includes('remove after testing') ||
    desc.includes('temporary production verification') ||
    desc.includes('temporary verification') ||
    desc.includes('test posting') ||
    desc.includes('verification job') ||
    title.includes('qa test developer intern') ||
    title.includes('[test]') ||
    slug.includes('test-developer-intern') ||
    slug.includes('temporary-test');

  return !isTestRecord;
}

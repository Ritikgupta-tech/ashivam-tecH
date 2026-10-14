/**
 * Verified Ashivam Technologies corporate vacancies used for reliable public
 * talent acquisition and resilient fallback when remote services undergo cold sleep.
 */
export const VERIFIED_VACANCIES = [
  {
    _id: '6ac8cf9c315e835f9f7d5759',
    title: 'Android Developer',
    slug: 'android-developer',
    department: 'Software Engineering',
    location: 'Agra, India / Hybrid',
    employmentType: 'Full-time',
    experience: '1-3 Years',
    description:
      'Architect, develop, and optimize high-performance native Android applications with Kotlin, clean MVVM/MVI architecture, offline-first synchronization, and hardware integrations.',
    skills: ['Kotlin', 'Android SDK', 'Jetpack Compose', 'Coroutines', 'REST APIs', 'Room DB'],
    salary: '₹8,000 – ₹15,000 / month (Stipend / Growth Track)',
    isActive: true,
  },
  {
    _id: '6ac8cf9c315e835f9f7d5760',
    title: 'Web Developer (Frontend)',
    slug: 'web-developer-frontend',
    department: 'Frontend Engineering',
    location: 'Agra, India / Hybrid',
    employmentType: 'Full-time',
    experience: 'Fresher to 2 Years',
    description:
      'Build responsive, accessible, and high-speed web applications using React, modern CSS architecture, state management, and seamless RESTful API integration.',
    skills: ['React', 'JavaScript (ES6+)', 'HTML5', 'CSS3 / Sass', 'Tailwind CSS', 'Git'],
    salary: 'Competitive & Contribution-Based',
    isActive: true,
  },
  {
    _id: '6ac8cf9c315e835f9f7d5761',
    title: 'Backend Developer',
    slug: 'backend-developer',
    department: 'Backend Engineering',
    location: 'Agra, India / Hybrid',
    employmentType: 'Full-time',
    experience: '1-3 Years',
    description:
      'Develop secure, scalable microservices and REST APIs with Node.js, Express, MongoDB, and Redis caching. Focus on data integrity, auth, and high concurrency.',
    skills: ['Node.js', 'Express', 'MongoDB', 'Mongoose', 'REST APIs', 'JWT / OAuth'],
    salary: 'Competitive & Contribution-Based',
    isActive: true,
  },
  {
    _id: '6ac8cf9c315e835f9f7d5762',
    title: 'UI/UX Designer',
    slug: 'ui-ux-designer',
    department: 'Product & Design',
    location: 'Agra, India / Remote',
    employmentType: 'Full-time',
    experience: 'Fresher to 2 Years',
    description:
      'Craft intuitive enterprise user journeys, wireframes, component design systems, and interactive Figma prototypes for cross-platform web and mobile experiences.',
    skills: ['Figma', 'UI Design', 'User Research', 'Design Systems', 'Interactive Prototyping'],
    salary: 'Competitive & Contribution-Based',
    isActive: true,
  },
];

/**
 * Merges live published jobs with complementary verified vacancies,
 * normalizing titles and preventing duplicate department postings.
 */
export function mergeWithVerifiedVacancies(publishedJobs = []) {
  if (!Array.isArray(publishedJobs) || publishedJobs.length === 0) {
    return [...VERIFIED_VACANCIES];
  }

  const existingIds = new Set(publishedJobs.map((j) => String(j._id)));
  const existingTitles = new Set(
    publishedJobs.map((j) => String(j.title || '').trim().toLowerCase())
  );

  // Normalize display title if live record has typo (e.g. "Android devloper" -> "Android Developer")
  const normalizedLiveJobs = publishedJobs.map((job) => {
    if (String(job.title).trim().toLowerCase() === 'android devloper') {
      return { ...job, title: 'Android Developer' };
    }
    return job;
  });

  // Complement with verified corporate tracks not already in the live database
  const complementaryJobs = VERIFIED_VACANCIES.filter(
    (vJob) =>
      !existingIds.has(String(vJob._id)) &&
      !existingTitles.has(String(vJob.title).trim().toLowerCase()) &&
      !(existingTitles.has('android devloper') && vJob.title === 'Android Developer')
  );

  return [...normalizedLiveJobs, ...complementaryJobs];
}

// ============================================================
// ASHIVAM TECHNOLOGIES — CENTRALIZED CONTENT CONFIGURATION
// Edit this file to update all website content
// ============================================================

export const COMPANY = {
  name: 'Ashivam Technologies',
  tagline: 'Infinite Possibilities. Engineered with Precision.',
  description:
    'We are a modern technology company building scalable software, digital products, and innovative experiences that move ideas forward.',
  email: 'contact@ashivamtechnologies.com',
  phone: '+91 XXXXX XXXXX',
  location: 'India · Remote-First',
  linkedin: 'https://linkedin.com/company/ashivam-technologies',
  github: 'https://github.com/ashivam-technologies',
  instagram: 'https://instagram.com/ashivamtechnologies',
  whatsapp: 'https://wa.me/91XXXXXXXXXX',
  founded: '2023',
  copyright: '© 2026 Ashivam Technologies. All rights reserved.',
};

export const STATS = [
  { value: null, label: 'Active Projects', display: 'Growing', icon: '⚡' },
  { value: null, label: 'Technologies Used', display: '15+', icon: '🔧' },
  { value: null, label: 'Developers & Contributors', display: 'Building', icon: '👥' },
  { value: null, label: 'Ideas in Development', display: 'Always', icon: '💡' },
];

export const SERVICES = [
  {
    id: 'web',
    icon: '🌐',
    title: 'Web Development',
    description:
      'Modern, responsive and scalable web applications built with the latest frontend and backend technologies.',
    color: '#38bdf8',
  },
  {
    id: 'mobile',
    icon: '📱',
    title: 'Mobile App Development',
    description:
      'High-quality Android and cross-platform mobile experiences designed for performance and user delight.',
    color: '#06b6d4',
  },
  {
    id: 'software',
    icon: '⚙️',
    title: 'Software Development',
    description:
      'Custom software solutions engineered around real business needs with clean architecture and maintainable code.',
    color: '#0ea5e9',
  },
  {
    id: 'uiux',
    icon: '🎨',
    title: 'UI/UX Design',
    description:
      'Clean, intuitive and conversion-focused digital experiences that balance aesthetics with functionality.',
    color: '#d4af37',
  },
  {
    id: 'backend',
    icon: '🔗',
    title: 'Backend & API Development',
    description:
      'Secure, scalable APIs and robust backend architecture built for performance and long-term reliability.',
    color: '#38bdf8',
  },
  {
    id: 'digital',
    icon: '💼',
    title: 'Digital Solutions',
    description:
      'Technology-driven solutions for organizations and emerging businesses ready to scale digitally.',
    color: '#06b6d4',
  },
];

export const SOLUTIONS = [
  {
    id: 'edtech',
    title: 'Education Technology',
    description: 'Learning platforms, student portals and digital classroom experiences.',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
    icon: '📚',
  },
  {
    id: 'business',
    title: 'Business Software',
    description: 'Tools and platforms that streamline business workflows and operations.',
    gradient: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
    icon: '💼',
  },
  {
    id: 'mgmt',
    title: 'Management Systems',
    description: 'Smart management solutions for organizations and institutions.',
    gradient: 'linear-gradient(135deg, #d4af37 0%, #f0c040 100%)',
    icon: '🏛️',
  },
  {
    id: 'auto',
    title: 'Automation',
    description: 'Automated workflows and intelligent systems that save time and resources.',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)',
    icon: '🤖',
  },
  {
    id: 'platform',
    title: 'Digital Platforms',
    description: 'Scalable platforms connecting users, services and data at scale.',
    gradient: 'linear-gradient(135deg, #38bdf8 0%, #7dd3fc 100%)',
    icon: '🌐',
  },
  {
    id: 'apps',
    title: 'Innovative Applications',
    description: 'Creative apps and products that challenge the status quo and delight users.',
    gradient: 'linear-gradient(135deg, #d4af37 0%, #38bdf8 100%)',
    icon: '✨',
  },
];

export const TECH_STACK = [
  { name: 'Java', icon: '☕', category: 'backend' },
  { name: 'Kotlin', icon: '🟣', category: 'mobile' },
  { name: 'Android', icon: '🤖', category: 'mobile' },
  { name: 'React', icon: '⚛️', category: 'frontend' },
  { name: 'JavaScript', icon: '🟨', category: 'frontend' },
  { name: 'TypeScript', icon: '🔷', category: 'frontend' },
  { name: 'Spring Boot', icon: '🌿', category: 'backend' },
  { name: 'MySQL', icon: '🗄️', category: 'database' },
  { name: 'Firebase', icon: '🔥', category: 'database' },
  { name: 'Python', icon: '🐍', category: 'backend' },
  { name: 'Git', icon: '📂', category: 'tools' },
  { name: 'Figma', icon: '🎨', category: 'design' },
];

export const PROJECTS = [
  {
    id: 1,
    name: 'EduConnect Platform',
    description:
      'A comprehensive education management platform connecting students, educators and institutions with modern digital tools.',
    tags: ['React', 'Spring Boot', 'MySQL', 'Firebase'],
    category: 'web',
    status: 'In Development',
    featured: true,
    image: null,
  },
  {
    id: 2,
    name: 'SwiftAttend',
    description:
      'Smart attendance tracking Android application with real-time dashboard and automated reporting for organizations.',
    tags: ['Android', 'Kotlin', 'Firebase'],
    category: 'mobile',
    status: 'Active',
    featured: true,
    image: null,
  },
  {
    id: 3,
    name: 'BizFlow ERP',
    description:
      'Lightweight ERP system designed for small businesses to manage inventory, billing and team operations efficiently.',
    tags: ['Java', 'Spring Boot', 'React', 'MySQL'],
    category: 'software',
    status: 'Planning',
    featured: false,
    image: null,
  },
  {
    id: 4,
    name: 'PortfolioKit',
    description:
      'An open-source portfolio builder enabling developers and designers to create stunning portfolios without code.',
    tags: ['React', 'TypeScript', 'Firebase'],
    category: 'web',
    status: 'Experiment',
    featured: false,
    image: null,
  },
  {
    id: 5,
    name: 'TaskMind',
    description:
      'A minimalist task and project management app designed for teams that prefer clarity over complexity.',
    tags: ['Kotlin', 'Android', 'Firebase'],
    category: 'mobile',
    status: 'In Development',
    featured: true,
    image: null,
  },
  {
    id: 6,
    name: 'APIForge',
    description:
      'Developer tool for rapid REST API prototyping, testing and documentation with a clean visual interface.',
    tags: ['Python', 'React', 'TypeScript'],
    category: 'experiments',
    status: 'Experiment',
    featured: false,
    image: null,
  },
];

export const WHY_ASHIVAM = [
  {
    icon: '⚡',
    title: 'Modern Engineering',
    description:
      'We focus on current technologies and scalable development practices that are built to grow with your product.',
  },
  {
    icon: '💡',
    title: 'Creative Thinking',
    description:
      'We approach every challenge from both a technical and user perspective, finding solutions that truly resonate.',
  },
  {
    icon: '✅',
    title: 'Quality First',
    description:
      'Clean architecture, thoughtful design and maintainable code are non-negotiable principles in everything we build.',
  },
  {
    icon: '🚀',
    title: 'Future Ready',
    description:
      'Every solution is designed with tomorrow in mind — scalable, adaptable and ready for what comes next.',
  },
];

export const TEAM = [
  {
    id: 1,
    name: 'Team Member',
    role: 'Founder & Lead Developer',
    bio: 'Passionate software engineer building the future one commit at a time.',
    linkedin: 'https://linkedin.com',
    github: 'https://github.com',
    initials: 'TM',
    color: '#38bdf8',
  },
  {
    id: 2,
    name: 'Team Member',
    role: 'Android Developer',
    bio: 'Crafting beautiful and performant mobile experiences for modern users.',
    linkedin: 'https://linkedin.com',
    github: 'https://github.com',
    initials: 'TM',
    color: '#06b6d4',
  },
  {
    id: 3,
    name: 'Team Member',
    role: 'UI/UX Designer',
    bio: 'Designing digital experiences that are intuitive, accessible and delightful.',
    linkedin: 'https://linkedin.com',
    github: 'https://github.com',
    initials: 'TM',
    color: '#d4af37',
  },
  {
    id: 4,
    name: 'Team Member',
    role: 'Backend Engineer',
    bio: 'Building the robust foundations that power reliable and scalable applications.',
    linkedin: 'https://linkedin.com',
    github: 'https://github.com',
    initials: 'TM',
    color: '#0ea5e9',
  },
];

export const CAREERS = [
  { role: 'Android Developer', type: 'Internship / Contribution', open: true },
  { role: 'Web Developer (Frontend)', type: 'Internship / Contribution', open: true },
  { role: 'Backend Developer', type: 'Internship / Contribution', open: true },
  { role: 'UI/UX Designer', type: 'Internship / Contribution', open: true },
  { role: 'Frontend Developer (React)', type: 'Internship / Contribution', open: true },
  { role: 'Content & Marketing', type: 'Contribution-Based', open: true },
  { role: 'Project Lead', type: 'Contribution-Based', open: false },
];

export const CULTURE = [
  { icon: '🌏', title: 'Remote Collaboration', desc: 'Work from wherever you thrive — our team spans cities and time zones.' },
  { icon: '📖', title: 'Learning Culture', desc: 'We invest in growth — yours and the team\'s. Always be curious.' },
  { icon: '💬', title: 'Open Communication', desc: 'Ideas flow freely. Every voice has value and every perspective matters.' },
  { icon: '🤝', title: 'Team Ownership', desc: 'Own your work. Take pride in what you build. Collaborate on the rest.' },
  { icon: '🔬', title: 'Innovation First', desc: 'We experiment, learn from failure, and ship things that make a difference.' },
  { icon: '🕒', title: 'Flexible Contribution', desc: 'Contribute on your own schedule. We care about outcomes, not hours.' },
];

export const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Projects', href: '#projects' },
  { label: 'Team', href: '#team' },
  { label: 'Careers', href: '#careers' },
  { label: 'Contact', href: '#contact' },
];

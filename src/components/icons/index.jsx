// ============================================================
// ASHIVAM TECHNOLOGIES — CENTRALIZED PROFESSIONAL SVG ICON SYSTEM
// High-precision vector icons with gold brand accent compatibility.
// All icons support size, color, className, and aria attributes.
// ============================================================

export function IconBase({ size = 24, className = '', children, viewBox = '0 0 24 24', fill = 'none', stroke = 'currentColor', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill={fill}
      stroke={stroke}
      className={`ashivam-icon ${className}`}
      aria-hidden={props['aria-label'] ? undefined : 'true'}
      {...props}
    >
      {children}
    </svg>
  );
}

// ----------------- TECHNOLOGY BRAND ICONS -----------------

export function ReactIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} viewBox="-11.5 -10.23174 23 20.46348" fill="none" stroke="#61DAFB" strokeWidth="1" {...props}>
      <circle cx="0" cy="0" r="2.05" fill="#61DAFB" stroke="none" />
      <g stroke="#61DAFB">
        <ellipse rx="11" ry="4.2" />
        <ellipse rx="11" ry="4.2" transform="rotate(60)" />
        <ellipse rx="11" ry="4.2" transform="rotate(120)" />
      </g>
    </IconBase>
  );
}

export function JavaScriptIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} viewBox="0 0 24 24" fill="none" stroke="none" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#F7DF1E" />
      <path d="M7 17.5v-3.8c0-1.8 1.1-2.5 2.5-2.5.4 0 .8.1 1.1.2v2.2c-.2-.1-.5-.1-.8-.1-.6 0-.8.3-.8.9v3.1H7zm6.7.1c-1.2 0-2.1-.6-2.5-1.5l1.8-1.1c.3.5.7.8 1.1.8.5 0 .8-.2.8-.5 0-.4-.4-.5-1.1-.8-.9-.4-1.8-.9-1.8-1.9 0-1.1.9-1.9 2.2-1.9 1 0 1.7.4 2.2 1.2l-1.7 1.1c-.2-.3-.5-.5-.8-.5-.4 0-.6.2-.6.4 0 .3.3.4.9.7 1.1.4 2 .9 2 2 0 1.2-1 2-2.5 2z" fill="#000000" />
    </IconBase>
  );
}

export function TypeScriptIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} viewBox="0 0 24 24" fill="none" stroke="none" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#3178C6" />
      <path d="M5.5 9h6v2h-1.9v6.5h-2.2V11H5.5V9zm8.5 8.6c-1.3 0-2.2-.7-2.6-1.6l1.9-1.1c.3.5.7.8 1.2.8.5 0 .8-.2.8-.5 0-.4-.4-.6-1.1-.9-.9-.4-1.8-.9-1.8-1.9 0-1.1.9-1.9 2.2-1.9 1 0 1.8.4 2.3 1.2l-1.7 1.1c-.2-.4-.5-.5-.8-.5-.4 0-.6.2-.6.4 0 .3.3.5.9.7 1.1.4 2 .9 2 2.1 0 1.3-1 2-2.5 2z" fill="#ffffff" />
    </IconBase>
  );
}

export function JavaIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* Sleek stylized coffee cup / steam */}
      <path d="M4 11h13a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4h-2.5" />
      <path d="M4 11v6a3 3 0 0 0 3 3h7a3 3 0 0 0 3-3v-6H4z" fill="rgba(230, 197, 92, 0.15)" stroke="var(--clr-gold, #c59b27)" />
      <path d="M3 21h15" stroke="var(--clr-gold, #c59b27)" />
      <path d="M8 4c0 2-1 3-1 4" stroke="#e6c55c" />
      <path d="M12 3c0 2-1 3-1 5" stroke="#e6c55c" />
      <path d="M16 4c0 2-1 3-1 4" stroke="#e6c55c" />
    </IconBase>
  );
}

export function SpringBootIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} viewBox="0 0 24 24" fill="none" stroke="none" {...props}>
      {/* Spring leaf logo */}
      <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.82.1-.65.35-1.07.63-1.32-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-1.99 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.72 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" fill="#6DB33F" opacity="0.1" />
      <path d="M21.2 5.5C18.6 3 13.9 3.5 10.4 6.8c-3.6 3.4-4.8 7.9-2.9 10.5 1.2 1.6 3 2.4 5.2 2.4 3.7 0 7.4-2.6 8.5-7.3.7-2.9.2-5.4-0-6.9zm-4.7 9.8c-2.3 2.4-5.6 2.2-7.3.3-1.6-1.8-.9-4.8 1.4-7.2 2.4-2.4 5.7-2.3 7.3-.4 1.7 1.8 1 4.8-1.4 7.3z" fill="#6DB33F" />
      <circle cx="12" cy="12" r="2.2" fill="#e6c55c" />
    </IconBase>
  );
}

export function AndroidIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} viewBox="0 0 24 24" fill="none" stroke="none" {...props}>
      {/* Android bot head */}
      <path d="M6 18c0 .55.45 1 1 1h1v2c0 .55.45 1 1 1s1-.45 1-1v-2h4v2c0 .55.45 1 1 1s1-.45 1-1v-2h1c.55 0 1-.45 1-1V9H6v9z" fill="#3DDC84" opacity="0.3" />
      <path d="M7 8.5a5 5 0 0 1 10 0v.5H7v-.5z" fill="#3DDC84" />
      <line x1="8.5" y1="5.5" x2="6.8" y2="3.2" stroke="#3DDC84" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15.5" y1="5.5" x2="17.2" y2="3.2" stroke="#3DDC84" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="7.2" r="0.75" fill="#0b0f17" />
      <circle cx="14" cy="7.2" r="0.75" fill="#0b0f17" />
      <rect x="6" y="10" width="12" height="7" rx="1.5" fill="#3DDC84" />
    </IconBase>
  );
}

export function KotlinIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} viewBox="0 0 24 24" fill="none" stroke="none" {...props}>
      <defs>
        <linearGradient id="kotlin-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7F52FF" />
          <stop offset="0.5" stopColor="#C711E1" />
          <stop offset="1" stopColor="#E4485D" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="3.5" fill="#182030" />
      <path d="M22 2H2v20h20L12 12 22 2z" fill="url(#kotlin-grad)" opacity="0.9" />
      <path d="M2 2h10l-10 10V2z" fill="#7F52FF" />
      <path d="M2 12l10 10H2V12z" fill="#E4485D" />
    </IconBase>
  );
}

export function PythonIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} viewBox="0 0 24 24" fill="none" stroke="none" {...props}>
      <path d="M11.9 2c-3.1 0-2.9 1.3-2.9 1.3l.03 1.4h2.9v.4H6.2S3.3 5 3.3 8.3s2.5 3.2 2.5 3.2h1.5v-1.5c0-.9.8-1.6 1.7-1.6h2.9c.9 0 1.6-.7 1.6-1.6V3.6c0-.9-.7-1.6-1.6-1.6zm-1.6 1.1a.6.6 0 1 1 0 1.2.6.6 0 0 1 0-1.2z" fill="#3776AB" />
      <path d="M12.1 22c3.1 0 2.9-1.3 2.9-1.3l-.03-1.4h-2.9v-.4h5.7s2.9.1 2.9-3.2-2.5-3.2-2.5-3.2h-1.5v1.5c0 .9-.8 1.6-1.7 1.6h-2.9c-.9 0-1.6.7-1.6 1.6v3.2c0 .9.7 1.6 1.6 1.6zm1.6-1.1a.6.6 0 1 1 0-1.2.6.6 0 0 1 0 1.2z" fill="#FFD43B" />
    </IconBase>
  );
}

export function MySQLIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* Sleek database server cylinders with dolphin silhouette */}
      <ellipse cx="12" cy="5" rx="8" ry="3" fill="rgba(0, 117, 143, 0.2)" stroke="#00758F" />
      <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" stroke="#00758F" />
      <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" stroke="#F29111" />
      <path d="M12 11c1.5 0 2.8.5 3.5 1.2" stroke="#e6c55c" strokeWidth="1.8" />
    </IconBase>
  );
}

export function FirebaseIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} viewBox="0 0 24 24" fill="none" stroke="none" {...props}>
      {/* Firebase flame */}
      <path d="M4.6 17.5L7.3 3.2c.1-.5.7-.7 1-.3l3 4.2-6.7 10.4z" fill="#FFA000" />
      <path d="M12.9 8.2l2.3-3.6c.3-.5 1-.4 1.2.1l3 12.8-6.5-9.3z" fill="#F57C00" />
      <path d="M3.7 18.2L11 21.8c.6.3 1.3.3 1.9 0l7.4-3.6-6.7-13.4-9.9 13.4z" fill="#FFCA28" opacity="0.3" />
      <path d="M19.4 17.5L16.4 4.7c-.1-.5-.8-.6-1.1-.2L3.7 17.5l7.5 4.3c.5.3 1.1.3 1.6 0l6.6-4.3z" fill="#FFCA28" />
    </IconBase>
  );
}

export function GitIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} viewBox="0 0 24 24" fill="none" stroke="#F05032" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="4" transform="rotate(45 12 12)" fill="#182030" stroke="#F05032" strokeWidth="1.2" />
      <circle cx="12" cy="7.5" r="1.5" fill="#F05032" stroke="none" />
      <circle cx="8" cy="12" r="1.5" fill="#F05032" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.5" fill="#F05032" stroke="none" />
      <path d="M12 9v2.5a2 2 0 0 1-2 2H9.5" />
      <path d="M12 9v5.5l2 1" />
    </IconBase>
  );
}

export function FigmaIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} viewBox="0 0 24 24" fill="none" stroke="none" {...props}>
      <rect x="5" y="2" width="7" height="6.6" rx="3.3" fill="#F24E1E" />
      <rect x="12" y="2" width="7" height="6.6" rx="3.3" fill="#FF7262" />
      <rect x="5" y="8.7" width="7" height="6.6" rx="3.3" fill="#A259FF" />
      <circle cx="15.5" cy="12" r="3.3" fill="#1ABCFE" />
      <path d="M5 15.4h3.7A3.3 3.3 0 0 1 12 18.7v0A3.3 3.3 0 0 1 8.7 22H5v-6.6z" fill="#0ACF83" />
    </IconBase>
  );
}

// ----------------- SERVICE & DOMAIN SVG ICONS -----------------

export function WebIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <path d="M12 3a15 15 0 0 1 4 9 15 15 0 0 1-4 9 15 15 0 0 1-4-9 15 15 0 0 1 4-9z" />
    </IconBase>
  );
}

export function MobileIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <line x1="11" y1="18" x2="13" y2="18" strokeWidth="2" />
      <line x1="10" y1="5" x2="14" y2="5" />
    </IconBase>
  );
}

export function SoftwareIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
      <line x1="14" y1="4" x2="10" y2="20" />
    </IconBase>
  );
}

export function DesignIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </IconBase>
  );
}

export function ApiIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </IconBase>
  );
}

export function SolutionsIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </IconBase>
  );
}

// ----------------- SOLUTIONS DOMAIN ICONS -----------------

export function EdTechIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5" />
    </IconBase>
  );
}

export function BusinessIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3" />
      <path d="M2 13h20" />
      <path d="M10 12v3h4v-3" />
    </IconBase>
  );
}

export function ManagementIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
      <path d="M9 9h1" />
      <path d="M9 13h1" />
      <path d="M9 17h1" />
    </IconBase>
  );
}

export function AutomationIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="11" width="18" height="10" rx="3" />
      <circle cx="8.5" cy="16" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="16" r="1.5" fill="currentColor" stroke="none" />
      <path d="M12 2v5" />
      <circle cx="12" cy="2" r="1.5" fill="currentColor" stroke="none" />
      <line x1="2" y1="16" x2="3" y2="16" />
      <line x1="21" y1="16" x2="22" y2="16" />
    </IconBase>
  );
}

export function PlatformIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="5" r="3" />
      <circle cx="5" cy="19" r="3" />
      <circle cx="19" cy="19" r="3" />
      <path d="M12 8v4M9.5 13.5L6.8 16.5M14.5 13.5l2.7 3" />
    </IconBase>
  );
}

export function InnovationIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </IconBase>
  );
}

// ----------------- STATS, CULTURE & PRINCIPLES ICONS -----------------

export function ActivityIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </IconBase>
  );
}

export function StackIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </IconBase>
  );
}

export function UsersIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  );
}

export function LightbulbIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.2 4.7 3 6v1h8v-1c1.8-1.3 3-3.5 3-6a7 7 0 0 0-7-7z" />
    </IconBase>
  );
}

export function ShieldCheckIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </IconBase>
  );
}

export function RocketIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4.5c1.62-1.63 5-2.5 5-2.5" />
      <path d="M12 15v5s3.03-.55 4.5-2c1.63-1.62 2.5-5 2.5-5" />
    </IconBase>
  );
}

export function GearIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </IconBase>
  );
}

export function GlobeIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </IconBase>
  );
}

export function BookOpenIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </IconBase>
  );
}

export function MessageIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </IconBase>
  );
}

export function HandshakeIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 11l-4.5 4.5a3 3 0 0 1-4.24 0L5 11.24a3 3 0 0 1 0-4.24l.7-.7a3 3 0 0 1 4.25 0L12 8.4l2.06-2.1a3 3 0 0 1 4.24 0l.7.7a3 3 0 0 1 0 4.24z" />
      <path d="M2 17l4 4" />
      <path d="M22 17l-4 4" />
    </IconBase>
  );
}

export function ClockIcon({ size = 24, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </IconBase>
  );
}

export function StarIcon({ size = 16, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} viewBox="0 0 24 24" fill="var(--clr-gold, #c59b27)" stroke="none" {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </IconBase>
  );
}

export function CheckIcon({ size = 20, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </IconBase>
  );
}

export function ArrowRightIcon({ size = 16, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </IconBase>
  );
}

export function MapPinIcon({ size = 20, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </IconBase>
  );
}

export function MailIcon({ size = 20, className = '', ...props }) {
  return (
    <IconBase size={size} className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 6l-10 7L2 6" />
    </IconBase>
  );
}

// ----------------- CENTRALIZED ICON MAPS -----------------

export const TECH_ICON_MAP = {
  React: ReactIcon,
  JavaScript: JavaScriptIcon,
  TypeScript: TypeScriptIcon,
  Java: JavaIcon,
  'Spring Boot': SpringBootIcon,
  Python: PythonIcon,
  Android: AndroidIcon,
  Kotlin: KotlinIcon,
  MySQL: MySQLIcon,
  Firebase: FirebaseIcon,
  Git: GitIcon,
  Figma: FigmaIcon,
};

export const SERVICE_ICON_MAP = {
  web: WebIcon,
  mobile: MobileIcon,
  software: SoftwareIcon,
  uiux: DesignIcon,
  backend: ApiIcon,
  digital: SolutionsIcon,
};

export const SOLUTION_ICON_MAP = {
  edtech: EdTechIcon,
  business: BusinessIcon,
  mgmt: ManagementIcon,
  auto: AutomationIcon,
  platform: PlatformIcon,
  apps: InnovationIcon,
};

export const STAT_ICON_MAP = {
  'Active Projects': ActivityIcon,
  'Technologies Used': StackIcon,
  'Developers & Contributors': UsersIcon,
  'Ideas in Development': LightbulbIcon,
};

export const PRINCIPLE_ICON_MAP = {
  'Modern Engineering': GearIcon,
  'Creative Thinking': LightbulbIcon,
  'Quality First': ShieldCheckIcon,
  'Future Ready': RocketIcon,
};

export const CULTURE_ICON_MAP = {
  'Remote Collaboration': GlobeIcon,
  'Learning Culture': BookOpenIcon,
  'Open Communication': MessageIcon,
  'Team Ownership': HandshakeIcon,
  'Innovation First': RocketIcon,
  'Flexible Contribution': ClockIcon,
};

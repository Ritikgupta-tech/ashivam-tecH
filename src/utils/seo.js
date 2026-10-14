/**
 * ASHIVAM TECHNOLOGIES — DYNAMIC CLIENT-SIDE SEO & METADATA MANAGER
 * Updates <title>, <meta name="description">, canonical <link>, and Open Graph tags per route.
 */

export function updatePageMeta({
  title,
  description,
  canonical,
  ogImage = 'https://ashivam-tec-h.vercel.app/logo-symbol.png',
  ogType = 'website',
}) {
  if (typeof document === 'undefined') return;

  // Title
  if (title) {
    document.title = title;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', title);
  }

  // Description
  if (description) {
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute('content', description);
  }

  // Canonical URL & OG URL
  if (canonical) {
    let linkCan = document.querySelector('link[rel="canonical"]');
    if (!linkCan) {
      linkCan = document.createElement('link');
      linkCan.rel = 'canonical';
      document.head.appendChild(linkCan);
    }
    linkCan.setAttribute('href', canonical);

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', canonical);
  }

  // Image
  if (ogImage) {
    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg) ogImg.setAttribute('content', ogImage);
    const twImg = document.querySelector('meta[name="twitter:image"]');
    if (twImg) twImg.setAttribute('content', ogImage);
  }

  // Type
  if (ogType) {
    const ogTp = document.querySelector('meta[property="og:type"]');
    if (ogTp) ogTp.setAttribute('content', ogType);
  }
}

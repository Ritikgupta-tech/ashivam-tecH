/**
 * ASHIVAM TECHNOLOGIES — CLIENT TELEMETRY & CONVERSION ANALYTICS
 * Privacy-respecting conversion tracking for project inquiries, CTA clicks, and service interactions.
 * Integrates safely with Google Analytics 4 (gtag) when VITE_GA_ID is configured in environment.
 */

const IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined';
const IS_DEV = import.meta.env?.DEV;

/**
 * Initializes Google Analytics 4 (gtag.js) script dynamically if VITE_GA_ID is provided.
 */
export function initAnalytics() {
  if (!IS_BROWSER) return false;

  const gaId = import.meta.env?.VITE_GA_ID;
  if (!gaId || typeof gaId !== 'string' || !/^G-[A-Za-z0-9]+$/.test(gaId.trim())) {
    return false;
  }

  const cleanId = gaId.trim();

  // Avoid injecting duplicate script tags
  if (!document.getElementById('ga4-gtag-script')) {
    const script = document.createElement('script');
    script.id = 'ga4-gtag-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cleanId)}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', cleanId, {
      send_page_view: false, // SPA explicitly tracks page views
    });
  }

  return true;
}

// Automatically attempt initialization in browser runtime
if (IS_BROWSER) {
  initAnalytics();
}

/**
 * Dispatches an analytics event to GA4 (gtag) and dev console.
 */
export function trackEvent(eventName, properties = {}) {
  if (!IS_BROWSER) return;

  const payload = {
    ...properties,
    timestamp: new Date().toISOString(),
    path: window.location.pathname,
  };

  // Google Analytics 4 (gtag) dispatch
  if (typeof window.gtag === 'function') {
    try {
      window.gtag('event', eventName, payload);
    } catch {
      // Ignore dispatch failures
    }
  }

  // Custom dev logging for verification without spamming prod
  if (IS_DEV) {
    console.info(`[Analytics Event] ${eventName}:`, payload);
  }
}

export function trackPageView(path) {
  trackEvent('page_view', { page_path: path || window.location.pathname });
}

export function trackInquiryStart(formType = 'project_consultation') {
  trackEvent('inquiry_started', { form_type: formType });
}

export function trackInquirySubmit(projectType, budget) {
  trackEvent('inquiry_submitted', {
    project_type: projectType || 'unspecified',
    budget_range: budget || 'unspecified',
  });
}

export function trackCtaClick(label, destination) {
  trackEvent('cta_click', {
    cta_label: label,
    destination: destination,
  });
}

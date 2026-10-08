const isValidEmail = (value) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const isValidUrl = (value) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

export const validateSettings = (req, res, next) => {
  const { company, social, seo, branding } = req.body;

  if (company?.email && !isValidEmail(company.email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid company email",
    });
  }

  const socialLinks = social
    ? Object.values(social).filter(Boolean)
    : [];

  for (const link of socialLinks) {
    if (!isValidUrl(link)) {
      return res.status(400).json({
        success: false,
        message: "Invalid social media URL",
      });
    }
  }

  const imageLinks = [
    seo?.ogImage,
    seo?.favicon,
    branding?.logo,
    branding?.darkLogo,
    branding?.favicon,
  ].filter(Boolean);

  for (const link of imageLinks) {
    if (!isValidUrl(link)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branding or SEO asset URL",
      });
    }
  }

  if (
    seo?.keywords &&
    !Array.isArray(seo.keywords)
  ) {
    return res.status(400).json({
      success: false,
      message: "SEO keywords must be an array",
    });
  }

  if (
    req.body.maintenance?.enabled !== undefined &&
    typeof req.body.maintenance.enabled !== "boolean"
  ) {
    return res.status(400).json({
      success: false,
      message: "Maintenance enabled must be boolean",
    });
  }

  next();
};
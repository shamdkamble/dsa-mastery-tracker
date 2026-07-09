/**
 * DSAMantra — single source of truth for product branding
 */

export const BRAND = {
  name: "DSAMantra",
  tagline: "Master DSA. Build Intuition. Land FAANG.",
  credit: "DSAMantra by Sham Kamble",
  author: "Sham Kamble",
  description:
    "DSAMantra — Master DSA. Build Intuition. Land FAANG. Track problems, follow the FAANG roadmap, and build real interview intuition.",
  themeColor: "#6366f1",
};

export function pageTitle(pageName) {
  return pageName ? `${pageName} · ${BRAND.name}` : BRAND.name;
}
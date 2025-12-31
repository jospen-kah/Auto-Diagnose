
const SITE_CODE_REGEX = /^(EXN|NRD|ADM|SUO|NRO|CTR|LIT|EST|OST|SUD)_\d{3,4}/;

export const extractSiteCode = (siteName = "") => {
  if (!siteName) return "UNKNOWN";

  const match = siteName.match(SITE_CODE_REGEX);
  return match ? match[0] : "UNKNOWN";
};
const configuredLegalName = process.env.GOTLOCKS_LEGAL_COMPANY_NAME?.trim();
const configuredSupportEmail = process.env.GOTLOCKS_SUPPORT_EMAIL?.trim();

export const COMPANY_LEGAL_NAME = configuredLegalName || "GOTLOCKS LLC";
export const SUPPORT_EMAIL = configuredSupportEmail || "support@gotlocks.app";
export const SUPPORT_HREF = SUPPORT_EMAIL
  ? `mailto:${SUPPORT_EMAIL}`
  : "/support";

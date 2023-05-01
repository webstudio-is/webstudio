export const validateDomain = (
  domain: string
): { success: false; error: string } | { success: true; domain: string } => {
  try {
    const domainUrl = new URL(`https://${domain}`);
    const domainHost = domainUrl.host;

    if (domainHost.split(".").length < 2) {
      return {
        success: false,
        error: `The domain "${domainHost}" must have at least two levels.`,
      };
    }

    if (domainHost.split(".").length > 4) {
      return {
        success: false,
        error: `The domain "${domainHost}" must have at most four levels.`,
      };
    }
    return {
      success: true,
      domain: domainHost,
    };
  } catch {
    return {
      success: false,
      error: `Invalid domain ${domain}`,
    };
  }
};

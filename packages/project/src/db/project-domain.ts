import { customAlphabet } from "nanoid";
import slugify from "slugify";

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz");

const slugifyOptions = { lower: true, strict: true };
const MIN_DOMAIN_LENGTH = 10;

// MIN_DOMAIN_LENGTH doesn't allow to use "assets" as a domain,
// but in case it will be changed in the future, we reserve even short names
const reservedDomains = [
  // Reserved for SaaS support
  "customer",
  "customers",
  "proxy-fallback",
  // Reserved for local development
  "local",
  // Reserved for image transforms
  "image-transform",
  "image-transforms",
  "images-transform",
  "images-transforms",
  // Assets
  "assets",
  "fonts",
  "images",
];

// For the future use, reserve prefixes we can use for internal services
const reservedPrefixes = ["wstd_sys_", "wstd-sys-"];

export const validateProjectDomain = (
  domainInput: string
): { success: false; error: string } | { success: true; domain: string } => {
  try {
    const domain = slugify(domainInput, slugifyOptions);

    if (domain.length < MIN_DOMAIN_LENGTH) {
      return {
        success: false,
        error: `Minimum ${MIN_DOMAIN_LENGTH} characters required`,
      };
    }

    if (reservedDomains.includes(domain)) {
      return {
        success: false,
        error: `Domain ${domain} is reserved`,
      };
    }

    if (reservedPrefixes.some((prefix) => domain.startsWith(prefix))) {
      return {
        success: false,
        error: `Domain ${domain} is reserved`,
      };
    }

    return {
      success: true,
      domain,
    };
  } catch {
    return {
      success: false,
      error: `Invalid domain ${domainInput}`,
    };
  }
};

export const generateDomain = (title: string) => {
  const slugifiedTitle = slugify(title, slugifyOptions);
  const domain = `${slugifiedTitle}-${nanoid(
    // If user entered a long title already, we just add 5 chars generated id
    // Otherwise we add the amount of chars to satisfy min length
    Math.max(MIN_DOMAIN_LENGTH - slugifiedTitle.length - 1, 5)
  )}`;
  return domain;
};

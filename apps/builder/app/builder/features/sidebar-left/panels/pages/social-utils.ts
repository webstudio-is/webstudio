/**
 * Exact google truncation logic is not known, but this is a close approximation
 */
export const truncateByWords = (
  description: string,
  maxLength: number = 155
) => {
  if (description.length <= maxLength) {
    return description;
  }

  const ellipsis = "\u00A0...";
  let truncated = description.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(" ");

  // If there's a space to truncate at, use it; otherwise, use the max length
  truncated =
    lastSpaceIndex > 0 ? truncated.substring(0, lastSpaceIndex) : truncated;

  return `${truncated}${ellipsis}`;
};

export const truncate = (pageUrl: string, maxLength = 53) => {
  if (pageUrl.length <= maxLength) {
    return pageUrl;
  }

  const ellipsis = "...";
  const truncated = pageUrl.substring(0, maxLength);

  return `${truncated}${ellipsis}`;
};

export const formatUrl = (urlString: string) => {
  const url = new URL(urlString);

  return `${url.origin}${url.pathname.split("/").join(" › ")}`;
};

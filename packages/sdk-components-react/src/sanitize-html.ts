import sanitizeHtml from "sanitize-html";

const bundledSanitizeHtml = Object.assign(
  (...args: Parameters<typeof sanitizeHtml>) => sanitizeHtml(...args),
  sanitizeHtml
);

export default bundledSanitizeHtml;

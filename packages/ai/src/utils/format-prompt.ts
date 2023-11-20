import escapeStringRegexp from "escape-string-regexp";

// If necessary replace with utility with an actual templating library.
export const formatPrompt = function getMessage(
  replacements: Record<string, string>,
  template: string
) {
  let message = template;
  Object.entries(replacements).forEach(([key, value]) => {
    if (typeof value === "string") {
      message = message.replace(
        new RegExp(`{${escapeStringRegexp(key)}}`, "g"),
        value.replace(/`/g, "\\`")
      );
    }
  });
  return message;
};

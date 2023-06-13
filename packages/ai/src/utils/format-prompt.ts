export const formatPrompt = function getMessage(
  prompts: Record<string, string>,
  template: string
) {
  let message = template;
  Object.entries(prompts).forEach(([key, value]) => {
    if (typeof value === "string") {
      // @todo escape key
      message = message.replace(
        new RegExp(`{${key}}`, "g"),
        value.replace(/`/g, "\\`")
      );
    }
  });
  return message;
};

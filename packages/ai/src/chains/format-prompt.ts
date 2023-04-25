export const formatPrompt = function getMessage(
  prompts: Record<string, string>,
  template: string
) {
  let message = template;
  Object.entries(prompts).forEach(([key, value]) => {
    // @todo escape key
    message = message.replace(new RegExp(`{${key}}`, "g"), value);
  });
  return message;
};

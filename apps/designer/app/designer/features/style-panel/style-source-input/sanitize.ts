// Allow all useful alphanumeric characters, dashes, and spaces
const regex = /([^\w\d- ])+/gi;

export const sanitize = (string: string) => string.replace(regex, "");

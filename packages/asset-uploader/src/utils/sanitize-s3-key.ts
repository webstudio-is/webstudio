/**
 * Based on this: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html
 * Characters that might require special handling
 * ASCII character ranges 00–1F hex (0–31 decimal) and 7F (127 decimal)
 * "&","$", "@", "=", ";" "/", ":", "+", Significant sequences of spaces might be lost in some uses (especially multiple spaces)
 * ",", "?"
 * Characters to avoid
 * Non-printable ASCII characters (128–255 decimal characters)
 * "\", "{", "^", "}", "%", "`", "]", ', ", “, ”, ">", "[", "~",  "<", "#", "|"
 **/

// eslint-disable-next-line no-control-regex
const specialRegexps = [/[\x00-\x1F\x7F]+/g, /[&$@=;/:+\s,?]+/g];

// eslint-disable-next-line no-control-regex
const avoidRegexps = [/[\x80-\xFF]+/g, /[\\{^}%`\]'"“”>[~<#|]+/g];

const allRegexps = [...specialRegexps, ...avoidRegexps];

const REPLACE_CHAR = "_";

/**
 * Sanitize S3 key based on https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html
 * plz do not use this function for other purposes
 **/
export const sanitizeS3Key = (str: string): string => {
  return allRegexps.reduce((r, reg) => r.replace(reg, REPLACE_CHAR), str);
};

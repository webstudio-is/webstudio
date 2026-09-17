import { decodeNamedCharacterReference } from "decode-named-character-reference";

const assetAttributes = new Map<string, ReadonlySet<string>>([
  ["audio", new Set(["src"])],
  ["embed", new Set(["src"])],
  ["img", new Set(["src", "srcset"])],
  ["input", new Set(["src"])],
  ["link", new Set(["href"])],
  ["object", new Set(["data"])],
  ["script", new Set(["src"])],
  ["source", new Set(["src", "srcset"])],
  ["track", new Set(["src"])],
  ["video", new Set(["src", "poster"])],
]);

const rawTextElements = new Set([
  "iframe",
  "noembed",
  "noframes",
  "noscript",
  "plaintext",
  "script",
  "style",
  "textarea",
  "title",
  "xmp",
]);

const isWhitespace = (character: string | undefined) =>
  character !== undefined && /\s/.test(character);
const isTagNameCharacter = (character: string | undefined) =>
  character !== undefined && /[A-Za-z0-9:-]/.test(character);

const decodeHtmlCharacterReferences = (value: string) =>
  value.replace(
    /&(#(?:\d+|x[\da-f]+)|[a-z][\da-z]+);/gi,
    (reference, name: string) => {
      if (name[0] !== "#") {
        return decodeNamedCharacterReference(name) || reference;
      }
      const isHex = name[1]?.toLowerCase() === "x";
      const radix = isHex ? 16 : 10;
      const codePoint = Number.parseInt(name.slice(isHex ? 2 : 1), radix);
      if (
        Number.isNaN(codePoint) ||
        codePoint === 0 ||
        codePoint > 0x10ffff ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff)
      ) {
        return "�";
      }
      return String.fromCodePoint(codePoint);
    }
  );

const encodeAssetPathSegment = (segment: string) => {
  const encoded = encodeURIComponent(segment);
  if (encoded === ".") {
    return "%2E";
  }
  if (encoded === "..") {
    return "%2E%2E";
  }
  return encoded;
};

const normalizeAssetPath = (path: string) =>
  path
    .split("/")
    .map((segment) => {
      try {
        return encodeAssetPathSegment(decodeURIComponent(segment));
      } catch {
        return encodeAssetPathSegment(segment);
      }
    })
    .join("/");

const resolveAssetUrl = (
  value: string,
  assetUrlsByPath: Readonly<Record<string, string>>
) => {
  value = decodeHtmlCharacterReferences(value);
  if (value.startsWith("/") === false || value.startsWith("//")) {
    return;
  }

  const base = "https://webstudio.invalid";
  const hashIndex = value.indexOf("#");
  const beforeHash = hashIndex === -1 ? value : value.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : value.slice(hashIndex);
  const searchIndex = beforeHash.indexOf("?");
  const pathname =
    searchIndex === -1 ? beforeHash : beforeHash.slice(0, searchIndex);
  const search = searchIndex === -1 ? "" : beforeHash.slice(searchIndex);
  const assetUrl = assetUrlsByPath[normalizeAssetPath(pathname)];
  if (assetUrl === undefined) {
    return;
  }

  const isAbsolute = URL.canParse(assetUrl);
  const resolved = new URL(assetUrl, base);
  for (const [name, value] of new URLSearchParams(search)) {
    resolved.searchParams.append(name, value);
  }
  if (hash !== "") {
    resolved.hash = hash;
  }
  return isAbsolute
    ? resolved.href
    : `${resolved.pathname}${resolved.search}${resolved.hash}`;
};

const resolveSrcset = (
  value: string,
  assetUrlsByPath: Readonly<Record<string, string>>
) => {
  const replacements: Replacement[] = [];
  let index = 0;
  while (index < value.length) {
    while (
      index < value.length &&
      (isWhitespace(value[index]) || value[index] === ",")
    ) {
      index += 1;
    }
    const urlStart = index;
    while (index < value.length && isWhitespace(value[index]) === false) {
      index += 1;
    }
    let urlEnd = index;
    while (urlEnd > urlStart && value[urlEnd - 1] === ",") {
      urlEnd -= 1;
    }
    const resolved = resolveAssetUrl(
      value.slice(urlStart, urlEnd),
      assetUrlsByPath
    );
    if (resolved !== undefined) {
      replacements.push({ start: urlStart, end: urlEnd, value: resolved });
    }
    while (index < value.length && value[index] !== ",") {
      index += 1;
    }
  }
  if (replacements.length === 0) {
    return;
  }
  let resolved = value;
  for (const replacement of replacements.toReversed()) {
    resolved = `${resolved.slice(0, replacement.start)}${replacement.value}${resolved.slice(replacement.end)}`;
  }
  return resolved;
};

type Replacement = { start: number; end: number; value: string };

const findTagEnd = (code: string, start: number) => {
  let quote = "";
  for (let index = start; index < code.length; index += 1) {
    const character = code[index];
    if (quote !== "") {
      if (character === quote) {
        quote = "";
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === ">") {
      return index;
    }
  }
  return code.length;
};

const collectAttributeReplacements = ({
  code,
  start,
  end,
  attributeNames,
  assetUrlsByPath,
}: {
  code: string;
  start: number;
  end: number;
  attributeNames: ReadonlySet<string>;
  assetUrlsByPath: Readonly<Record<string, string>>;
}) => {
  const replacements: Replacement[] = [];
  let index = start;
  while (index < end) {
    while (index < end && (isWhitespace(code[index]) || code[index] === "/")) {
      index += 1;
    }
    const nameStart = index;
    while (
      index < end &&
      isWhitespace(code[index]) === false &&
      code[index] !== "=" &&
      code[index] !== "/" &&
      code[index] !== ">"
    ) {
      index += 1;
    }
    if (index === nameStart) {
      index += 1;
      continue;
    }
    const name = code.slice(nameStart, index).toLowerCase();
    while (index < end && isWhitespace(code[index])) {
      index += 1;
    }
    if (code[index] !== "=") {
      continue;
    }
    index += 1;
    while (index < end && isWhitespace(code[index])) {
      index += 1;
    }
    const quote = code[index] === '"' || code[index] === "'" ? code[index] : "";
    if (quote !== "") {
      index += 1;
    }
    const valueStart = index;
    if (quote === "") {
      while (
        index < end &&
        isWhitespace(code[index]) === false &&
        code[index] !== ">"
      ) {
        index += 1;
      }
    } else {
      while (index < end && code[index] !== quote) {
        index += 1;
      }
    }
    const valueEnd = index;
    if (quote !== "" && code[index] === quote) {
      index += 1;
    }
    if (attributeNames.has(name)) {
      const attributeValue = code.slice(valueStart, valueEnd);
      const value =
        name === "srcset"
          ? resolveSrcset(attributeValue, assetUrlsByPath)
          : resolveAssetUrl(attributeValue, assetUrlsByPath);
      if (value !== undefined) {
        replacements.push({ start: valueStart, end: valueEnd, value });
      }
    }
  }
  return replacements;
};

const findRawTextEnd = (code: string, tagName: string, start: number) => {
  if (tagName === "plaintext") {
    return code.length;
  }
  const lowerCode = code.toLowerCase();
  let index = start;
  while (index < code.length) {
    const closingTag = lowerCode.indexOf(`</${tagName}`, index);
    if (closingTag === -1) {
      return code.length;
    }
    const afterName = code[closingTag + tagName.length + 2];
    if (afterName === ">" || afterName === "/" || isWhitespace(afterName)) {
      return closingTag;
    }
    index = closingTag + tagName.length + 2;
  }
  return code.length;
};

export const resolveHtmlEmbedAssetUrls = (
  code: string,
  assetUrlsByPath: Readonly<Record<string, string>> | undefined
) => {
  if (
    assetUrlsByPath === undefined ||
    Object.keys(assetUrlsByPath).length === 0
  ) {
    return code;
  }

  const replacements: Replacement[] = [];
  let index = 0;
  while (index < code.length) {
    const tagStart = code.indexOf("<", index);
    if (tagStart === -1) {
      break;
    }
    if (code.startsWith("<!--", tagStart)) {
      const commentEnd = code.indexOf("-->", tagStart + 4);
      index = commentEnd === -1 ? code.length : commentEnd + 3;
      continue;
    }
    const nameStart = tagStart + 1;
    if (
      code[nameStart] === "/" ||
      code[nameStart] === "!" ||
      code[nameStart] === "?"
    ) {
      index = findTagEnd(code, nameStart) + 1;
      continue;
    }
    let nameEnd = nameStart;
    while (isTagNameCharacter(code[nameEnd])) {
      nameEnd += 1;
    }
    if (nameEnd === nameStart) {
      index = tagStart + 1;
      continue;
    }
    const tagName = code.slice(nameStart, nameEnd).toLowerCase();
    const tagEnd = findTagEnd(code, nameEnd);
    const attributeNames = assetAttributes.get(tagName);
    if (attributeNames !== undefined) {
      replacements.push(
        ...collectAttributeReplacements({
          code,
          start: nameEnd,
          end: tagEnd,
          attributeNames,
          assetUrlsByPath,
        })
      );
    }
    index = tagEnd + 1;
    if (rawTextElements.has(tagName)) {
      index = findRawTextEnd(code, tagName, index);
    }
  }

  if (replacements.length === 0) {
    return code;
  }
  let resolved = code;
  for (const replacement of replacements.toReversed()) {
    resolved = `${resolved.slice(0, replacement.start)}${replacement.value}${resolved.slice(replacement.end)}`;
  }
  return resolved;
};

const assetAttributes = new Map<string, ReadonlySet<string>>([
  ["audio", new Set(["src"])],
  ["embed", new Set(["src"])],
  ["img", new Set(["src"])],
  ["input", new Set(["src"])],
  ["link", new Set(["href"])],
  ["object", new Set(["data"])],
  ["script", new Set(["src"])],
  ["source", new Set(["src"])],
  ["track", new Set(["src"])],
  ["video", new Set(["src", "poster"])],
]);

const rawTextElements = new Set([
  "iframe",
  "noembed",
  "noframes",
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

const resolveAssetUrl = (
  value: string,
  assetUrlsByPath: Readonly<Record<string, string>>
) => {
  if (value.startsWith("/") === false || value.startsWith("//")) {
    return;
  }

  const base = "https://webstudio.invalid";
  let reference: URL;
  try {
    reference = new URL(value, base);
  } catch {
    return;
  }

  const assetUrl = assetUrlsByPath[reference.pathname];
  if (assetUrl === undefined) {
    return;
  }

  const isAbsolute = URL.canParse(assetUrl);
  const resolved = new URL(assetUrl, base);
  for (const [name, value] of reference.searchParams) {
    resolved.searchParams.append(name, value);
  }
  if (reference.hash !== "") {
    resolved.hash = reference.hash;
  }
  return isAbsolute
    ? resolved.href
    : `${resolved.pathname}${resolved.search}${resolved.hash}`;
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
      const value = resolveAssetUrl(
        code.slice(valueStart, valueEnd),
        assetUrlsByPath
      );
      if (value !== undefined) {
        replacements.push({ start: valueStart, end: valueEnd, value });
      }
    }
  }
  return replacements;
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
  const lowerCode = code.toLowerCase();
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
      const closingTag = lowerCode.indexOf(`</${tagName}`, index);
      index = closingTag === -1 ? code.length : closingTag;
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

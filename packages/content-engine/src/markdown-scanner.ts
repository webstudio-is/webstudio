export const markdownByteOrderMark = new Uint8Array([0xef, 0xbb, 0xbf]);

const startsWith = (bytes: Uint8Array, expected: Uint8Array, offset = 0) => {
  if (bytes.byteLength - offset < expected.byteLength) {
    return false;
  }
  return expected.every((value, index) => bytes[offset + index] === value);
};

export type LocatedMarkdownFrontmatter = {
  yamlStart: number;
  yamlEnd: number;
  blockEnd: number;
};

export const findMarkdownFrontmatter = (
  bytes: Uint8Array,
  endOfFile: boolean
): LocatedMarkdownFrontmatter | null | undefined => {
  let openingStart = 0;
  if (startsWith(bytes, markdownByteOrderMark)) {
    openingStart = markdownByteOrderMark.byteLength;
  } else if (
    bytes.byteLength < markdownByteOrderMark.byteLength &&
    markdownByteOrderMark
      .slice(0, bytes.byteLength)
      .every((value, index) => value === bytes[index])
  ) {
    return endOfFile ? null : undefined;
  }

  if (bytes.byteLength < openingStart + 4) {
    return endOfFile ? null : undefined;
  }
  if (
    bytes[openingStart] !== 0x2d ||
    bytes[openingStart + 1] !== 0x2d ||
    bytes[openingStart + 2] !== 0x2d
  ) {
    return null;
  }

  let yamlStart = openingStart + 3;
  if (bytes[yamlStart] === 0x0a) {
    yamlStart += 1;
  } else if (bytes[yamlStart] === 0x0d) {
    if (bytes.byteLength === yamlStart + 1) {
      return endOfFile ? null : undefined;
    }
    if (bytes[yamlStart + 1] !== 0x0a) {
      return null;
    }
    yamlStart += 2;
  } else {
    return null;
  }

  let lineStart = yamlStart;
  for (let index = yamlStart; index <= bytes.byteLength; index += 1) {
    const atEnd = index === bytes.byteLength;
    if (atEnd === false && bytes[index] !== 0x0a) {
      continue;
    }
    if (atEnd && endOfFile === false) {
      return;
    }

    let lineEnd = index;
    if (lineEnd > lineStart && bytes[lineEnd - 1] === 0x0d) {
      lineEnd -= 1;
    }
    const lineLength = lineEnd - lineStart;
    const isDelimiter =
      lineLength === 3 &&
      ((bytes[lineStart] === 0x2d &&
        bytes[lineStart + 1] === 0x2d &&
        bytes[lineStart + 2] === 0x2d) ||
        (bytes[lineStart] === 0x2e &&
          bytes[lineStart + 1] === 0x2e &&
          bytes[lineStart + 2] === 0x2e));
    if (isDelimiter) {
      return {
        yamlStart,
        yamlEnd: lineStart,
        blockEnd: atEnd ? index : index + 1,
      };
    }
    lineStart = index + 1;
  }
};

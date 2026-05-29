/**
 * HTML elements whose rendering is replaced by external content or a
 * browser-provided widget.
 *
 * This is useful for CSS rules that distinguish regular inline boxes from
 * replaced inline boxes.
 */
export const htmlReplacedElementTags = [
  "audio",
  "canvas",
  "embed",
  "iframe",
  "img",
  "input",
  "object",
  "select",
  "textarea",
  "video",
] as const;

const htmlReplacedElementTagSet = new Set(htmlReplacedElementTags);

export const isHtmlReplacedElementTag = (
  tag: string
): tag is (typeof htmlReplacedElementTags)[number] => {
  return htmlReplacedElementTagSet.has(
    tag as (typeof htmlReplacedElementTags)[number]
  );
};

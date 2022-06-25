/**
 * @description
 * - detects whether the pointer/keyboard is on any given token as specified by the {contents: []} contract.
 * - pointermove/keyup in turn dispatch onMouseMove/onCaretMove with the current state if and when within a configured content token.
 * - returns two methods {update, disconnectedCallback} the former of which dispatches a content update(while preserving the caret position if any)
 * - read/write methods are called when reading from the passed element or when updating/writing to the same element.
 * @example
 * const target = document.querySelector('input');
 * const {update, disconnectedCallback} = createContentController(target, {
 *   contents: [
 *     { name: 'unit', match: (value) => value === 'px' },
 *     { name: 'number', match: (value) => isNaN(parseFloat(value)) === false },
 *     { name: 'unknown', match: (value) => true },
 *   ],
 *   onMouseMove: ({name, value, position}) => { },
 *   onCaretMove: ({name, value, position}) => { },
 *   read: (value) => target.value,
 *   write: (value) => target.value = value,
 * });
 */
const canvasContext = globalThis.document
  ?.createElement("canvas")
  .getContext("2d");
const measureTextWidth = (value) => canvasContext.measureText(value).width;
const measureTextPadding = (node, value) => {
  const {
    fontSize,
    fontFamily,
    fontWeight,
    textAlign,
    letterSpacing,
    paddingLeft,
    paddingRight,
  } = getComputedStyle(node);
  if (letterSpacing !== "normal") canvasContext.letterSpacing = letterSpacing;
  canvasContext.font = `${fontWeight} ${fontSize} ${fontFamily}`;
  return textAlign === "left"
    ? parseFloat(paddingLeft)
    : node.clientWidth -
        canvasContext.measureText(value).width -
        parseFloat(paddingRight);
};
const measureTextMetrics = (value, index, offset) => {
  const DECIMAL_OR_WHITESPACE_OR_NON_WORD = /([-+]?\d*\.?\d+)|([\s\W])/;
  return value
    .split(DECIMAL_OR_WHITESPACE_OR_NON_WORD)
    .filter((value) => value)
    .map((value) => {
      const width = measureTextWidth(value);
      const head = index - offset;
      const tail = index - (offset + width);
      const props = { head, tail, value, width, length, offset };
      length += value.length;
      offset += width;
      return props;
    });
};
export const createContentController = (
  targetNode,
  {
    read = (node) => node.value,
    write = (value) => {},
    contents = [],
    onMouseMove = () => {},
    onCaretMove = () => {},
  }
) => {
  const eventNames = ["keyup", "pointermove"];
  const handleEvent = ({ type, offsetX }) => {
    const targetValue = read(targetNode);
    const targetPadding = measureTextPadding(targetNode, targetValue);
    if (type === eventNames[0])
      offsetX =
        targetPadding +
        measureTextWidth(targetValue.slice(0, targetNode.selectionStart));
    const targetMetrics = measureTextMetrics(
      targetValue,
      offsetX,
      targetPadding
    );
    for (const targetMetricsData of targetMetrics) {
      const { head, tail, value } = targetMetricsData;
      // zero for exact boundary match, added buffer for precision forgiveness, more so from the head
      if (head >= -2 && tail <= 0) {
        const current = contents.find(({ match }) => match(value));
        if (current) {
          const { name } = current;
          const position = `${head},${tail}`;
          if (type === eventNames[0]) {
            onCaretMove({ name, value, position });
          } else if (type === eventNames[1]) {
            onMouseMove({ name, value, position });
          }
        }
      }
    }
  };
  eventNames.forEach((eventName) =>
    targetNode.addEventListener(eventName, handleEvent)
  );
  return {
    update: (value) => {
      let { selectionStart, selectionEnd } = targetNode;
      write(value);
      targetNode.setSelectionRange?.(selectionStart, selectionEnd);
    },
    disconnectedCallback: () => {
      eventName.forEach((eventName) =>
        targetNode.addEventListener(eventName, handleEvent)
      );
    },
  };
};

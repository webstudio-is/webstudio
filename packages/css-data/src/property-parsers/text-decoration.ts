const style = ["solid", "double", "dotted", "dashed", "wavy"];
const line = ["underline", "overline", "line-through", "blink"];
const thickness = ["from-font"];

export const textDecorationToLonghand = (value: string) => {
  let textDecorationStyle;
  let textDecorationLine;
  let textDecorationThickness;
  let textDecorationColor;

  const parts = value.split(" ");

  const unparsed = [];
  let open = false;

  for (let i = 0; i < parts.length; i++) {
    const item = parts[i];

    if (style.includes(item)) {
      textDecorationStyle = item;
    } else if (line.includes(item)) {
      textDecorationLine = item;
    } else if (thickness.includes(item) || (!open && !isNaN(Number(item[0])))) {
      textDecorationThickness = item;
    } else {
      unparsed.push(item);

      if (item.includes("(")) {
        open = true;
      } else if (open && item.includes(")")) {
        open = false;
      }
    }
  }

  if (unparsed.length > 0) {
    textDecorationColor = unparsed.join(" ");
  }

  return {
    textDecorationStyle,
    textDecorationLine,
    textDecorationThickness,
    textDecorationColor,
  };
};

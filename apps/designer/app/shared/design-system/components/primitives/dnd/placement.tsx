import { Box } from "../../box";

export type Rect = Pick<DOMRect, "top" | "left" | "width" | "height">;

const probe = document.createElement("div");

/**
 * We place a div at the position where future drop will happen.
 * We learn if the indicator will render vertically or horizontally as well as its width/heigh.
 */
export const getPlacement = ({ target, index = 0 }: any = {}) => {
  const { children } = target;
  if (index > children.length - 1) {
    target.appendChild(probe);
  } else {
    target.insertBefore(probe, children[index]);
  }
  const rect = probe.getBoundingClientRect();
  target.removeChild(probe);
  return rect;
};

export const PlacementIndicator = ({ rect }: { rect?: Rect }) => {
  if (rect === undefined) return null;
  const style = {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
  return (
    <Box
      style={style}
      css={{ position: "absolute", border: "1px solid green" }}
    />
  );
};

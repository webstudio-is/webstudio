// We increment by 10 when shift is pressed, by 0.1 when alt/option is pressed and by 1 by default.
export const handleNumericInputArrowKeys = (
  value: number,
  { altKey, shiftKey, key }: { altKey: boolean; shiftKey: boolean; key: string }
) => {
  if (key !== "ArrowUp" && key !== "ArrowDown") {
    return value;
  }
  const delta = shiftKey ? 10 : altKey ? 0.1 : 1;
  const multiplier = key === "ArrowUp" ? 1 : -1;
  return Number((value + delta * multiplier).toFixed(1));
};

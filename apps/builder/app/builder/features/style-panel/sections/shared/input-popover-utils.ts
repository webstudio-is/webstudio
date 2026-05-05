import type { Modifiers } from "../../shared/modifier-keys";

export const getChangeCompleteModifiers = (event: {
  type: string;
  altKey: boolean;
  shiftKey: boolean;
}): Modifiers | undefined =>
  event.type === "delta"
    ? undefined
    : {
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        ctrlKey: false,
        metaKey: false,
      };

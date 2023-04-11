import { useEffect, useRef } from "react";
import {
  numericScrubControl,
  type NumericScrubValue,
} from "./numeric-gesture-control";
import { unstable_batchedUpdates as unstableBatchedUpdates } from "react-dom";

export const useScrub = ({
  value,
  onChange,
  onChangeComplete,
  shouldHandleEvent,
}: {
  value: NumericScrubValue;
  onChange: (value: NumericScrubValue) => void;
  onChangeComplete?: (value: NumericScrubValue) => void;
  shouldHandleEvent?: (node: EventTarget) => boolean;
}) => {
  const scrubRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onChangeCompleteRef = useRef(onChangeComplete);
  onChangeCompleteRef.current = onChangeComplete;

  const valueRef = useRef(value);
  valueRef.current = value;

  const shouldHandleEventRef = useRef(shouldHandleEvent);
  shouldHandleEventRef.current = shouldHandleEvent;

  // Since scrub is going to call onChange and onChangeComplete callbacks, it will result in a new value and potentially new callback refs.
  // We need this effect to ONLY run when type or unit changes, but not when callbacks or value.value changes.
  useEffect(() => {
    const inputRefCurrent = inputRef.current;
    const scrubRefCurrent = scrubRef.current;
    if (inputRefCurrent === null || scrubRefCurrent === null) {
      return;
    }

    const scrub = numericScrubControl(scrubRefCurrent, {
      // @todo: after this https://github.com/webstudio-is/webstudio-builder/issues/564
      // we can switch back on using just initial value
      //
      // For now we are reusing controls for different selectedInstanceData,
      // and the best here is to call useEffect every time selectedInstanceData changes
      // and recreate numericScrubControl.
      // Until we have decision do we use key properties for this or not,
      // on of the solution to get value inside scrub is to use ref and lazy getter.
      // Getter to avoid recreating scrub on every value change
      getValue: () => {
        return valueRef.current;
      },
      onValueInput(event) {
        // Moving focus to container of the input to hide the caret
        // (it makes text harder to read and may jump around as you scrub)
        scrubRef.current?.setAttribute("tabindex", "-1");
        scrubRef.current?.focus();

        onChangeRef.current(event.value);
      },
      onValueChange(event) {
        // Will work without but depends on order of setState updates
        // at text-control, now fixed in both places (order of updates is right, and batched here)
        unstableBatchedUpdates(() => {
          onChangeCompleteRef.current?.(event.value);
        });

        // Returning focus that we've moved above
        scrubRef.current?.removeAttribute("tabindex");
        inputRef.current?.focus();
        inputRef.current?.select();
      },
      shouldHandleEvent: shouldHandleEventRef.current,
    });

    return scrub.disconnectedCallback;
  }, []);

  return { scrubRef, inputRef };
};

import { type SyntheticEvent, type KeyboardEvent, useRef } from "react";
import { useEffectEvent } from "./effect-event";

type UseClickAndHoldProps = {
  onStart: () => void;
  onEnd: () => void;
  onCancel?: () => void;
  longPressDuration?: number;
};

/**
 * Toggle hook with long-press handling.
 * - `onStart`: First click.
 * - `onEnd`: Second click or long-press release.
 * - `onCancel`: Pointer up outside target during long press.
 */
export const useLongPressToggle = (props: UseClickAndHoldProps) => {
  const currentTarget = useRef<Element>();
  const pointerDownTimeRef = useRef(0);
  const stateRef = useRef<"idle" | "active">("idle");
  const keyMapRef = useRef(new Set<string>());

  const { longPressDuration = 1000 } = props;

  // Wrap to be sure that latest callback is used in event handlers.
  const onStart = useEffectEvent(props.onStart);
  const onEnd = useEffectEvent(props.onEnd);
  const onCancel = useEffectEvent(props.onCancel);

  const handlePointerUp = useEffectEvent((event: Event) => {
    if (stateRef.current === "idle") {
      return;
    }
    const { target } = event;

    if (!(target instanceof Element)) {
      return;
    }

    const time = Date.now() - pointerDownTimeRef.current;
    const isLongPress = time >= longPressDuration;

    if (isLongPress === false) {
      return;
    }

    if (currentTarget.current?.contains(target)) {
      const time = Date.now() - pointerDownTimeRef.current;
      if (time >= longPressDuration) {
        onEnd();
        stateRef.current = "idle";
      }
      return;
    }

    onCancel?.();
    stateRef.current = "idle";
  });

  const onPointerDown = useEffectEvent((event: SyntheticEvent) => {
    if (stateRef.current === "active") {
      onEnd();
      stateRef.current = "idle";
      return;
    }

    stateRef.current = "active";
    currentTarget.current = event.currentTarget;
    pointerDownTimeRef.current = Date.now();
    document.addEventListener("pointerup", handlePointerUp, { once: true });
    onStart();
  });

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (keyMapRef.current.has(event.code)) {
      return;
    }

    if (event.code === "Enter" || event.code === "Space") {
      keyMapRef.current.add(event.code);
      onPointerDown(event);
    }
  });

  const onKeyUp = useEffectEvent((event: KeyboardEvent) => {
    if (event.code === "Enter" || event.code === "Space") {
      keyMapRef.current.delete(event.code);

      handlePointerUp(event.nativeEvent);
    }
  });

  return { onPointerDown, onKeyDown, onKeyUp };
};

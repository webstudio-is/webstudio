import { forwardRef, useEffect, useMemo, useRef, type ElementRef } from "react";
import type { Hook } from "@webstudio-is/react-sdk";
import type {
  AnimationAction,
  AnimationActionEvent,
  EventAnimation,
} from "@webstudio-is/sdk";
import { animationCanPlayOnCanvasProperty } from "@webstudio-is/sdk/runtime";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { toValue } from "@webstudio-is/css-engine";

const isEventAction = (
  action: AnimationAction | undefined
): action is AnimationActionEvent => {
  return action !== undefined && action.type === "event";
};

type KeyframesAndTiming = {
  keyframes: Keyframe[];
  timing: KeyframeAnimationOptions;
};

const convertDuration = (value: EventAnimation["timing"]["duration"]) => {
  if (value === undefined) {
    return undefined;
  }
  if (value.type === "unit") {
    return value.unit === "s" ? value.value * 1000 : value.value;
  }
  if (value.type === "var") {
    return undefined;
  }
  return undefined;
};

const compileAnimation = (animation: EventAnimation): KeyframesAndTiming => {
  const keyframes: Keyframe[] = animation.keyframes.map((frame) => {
    const compiled: Keyframe = {};
    if (frame.offset !== undefined) {
      compiled.offset = frame.offset;
    }
    for (const [property, value] of Object.entries(frame.styles)) {
      compiled[property] = toValue(value);
    }
    return compiled;
  });

  const timing: KeyframeAnimationOptions = {
    fill: animation.timing.fill,
    easing: animation.timing.easing,
    direction: animation.timing.direction,
    iterations:
      animation.timing.iterations === "infinite"
        ? Infinity
        : animation.timing.iterations,
    playbackRate: animation.timing.playbackRate,
    delay: convertDuration(animation.timing.delay),
    duration: convertDuration(animation.timing.duration),
  };

  return { keyframes, timing };
};

const resolveTargets = (
  action: AnimationActionEvent,
  host: HTMLElement | null
): HTMLElement[] => {
  if (action.target === undefined || action.target === "self") {
    // For "self" target, animate all child elements since host has display:contents
    if (host === null) {
      return [];
    }
    // Get all element children (skip text nodes)
    const children = Array.from(host.children) as HTMLElement[];
    return children.length > 0 ? children : [host];
  }
  const target =
    typeof document !== "undefined"
      ? (document.querySelector(
          `[data-ws-id="${CSS.escape(action.target)}"]`
        ) as HTMLElement | null)
      : null;
  return target ? [target] : [];
};

const applyCommand = ({
  command,
  seekTo,
  getAnimations,
  buildAnimations,
  cleanup,
}: {
  command: AnimationActionEvent["command"];
  seekTo: AnimationActionEvent["seekTo"];
  getAnimations: () => Animation[];
  buildAnimations: () => Animation[];
  cleanup: () => void;
}) => {
  const animations = getAnimations();
  const ensureAnimations = () =>
    animations.length > 0 ? animations : buildAnimations();

  const activeAnimations = ensureAnimations();

  switch (command) {
    case "play": {
      for (const animation of activeAnimations) {
        animation.play();
      }
      break;
    }
    case "pause": {
      for (const animation of activeAnimations) {
        animation.pause();
      }
      break;
    }
    case "toggle": {
      const paused = activeAnimations.some(
        (animation) => animation.playState === "paused"
      );
      for (const animation of activeAnimations) {
        if (paused) {
          animation.play();
        } else {
          animation.pause();
        }
      }
      break;
    }
    case "restart": {
      cleanup();
      const fresh = buildAnimations();
      for (const animation of fresh) {
        animation.play();
      }
      break;
    }
    case "reverse": {
      const targets = ensureAnimations();
      for (const animation of targets) {
        if (typeof animation.reverse === "function") {
          animation.reverse();
        } else {
          animation.playbackRate = (animation.playbackRate ?? 1) * -1;
        }
      }
      break;
    }
    case "seek": {
      if (seekTo === undefined) {
        return;
      }
      const targets = ensureAnimations();
      for (const animation of targets) {
        const duration = animation.effect?.getTiming().duration;
        if (typeof duration === "number") {
          animation.currentTime = duration * seekTo;
          animation.pause();
        }
      }
      break;
    }
  }
};

type ScrollProps = {
  debug?: boolean;
  children?: React.ReactNode;
  action: AnimationAction;
};

export const AnimateChildren = forwardRef<ElementRef<"div">, ScrollProps>(
  ({ debug = false, action, ...props }, ref) => {
    const localRef = useRef<ElementRef<"div"> | null>(null);
    const resolvedRef = (node: ElementRef<"div"> | null) => {
      localRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ref.current = node;
      }
    };

    const compiledAnimations = useMemo((): KeyframesAndTiming[] => {
      if (isEventAction(action) === false) {
        return [];
      }
      return action.animations.map(compileAnimation);
    }, [action]);

    useEffect(() => {
      if (isEventAction(action) === false) {
        return;
      }
      // Store typed action for use in closures
      const eventAction = action;

      if (isFeatureEnabled("commandAnimations") === false) {
        return;
      }
      if (
        eventAction.respectReducedMotion !== false &&
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }
      if (typeof window === "undefined" || typeof document === "undefined") {
        return;
      }

      const host = localRef.current;
      if (host === null) {
        return;
      }

      const targets = resolveTargets(eventAction, host);
      if (targets.length === 0) {
        return;
      }

      let animations: Animation[] = [];

      const cleanup = () => {
        for (const animation of animations) {
          animation.cancel();
        }
        animations = [];
      };

      const buildAnimations = () => {
        cleanup();
        // Apply animation to all target elements
        animations = targets.flatMap((target) =>
          compiledAnimations.map(({ keyframes, timing }) =>
            target.animate(keyframes, timing)
          )
        );
        return animations;
      };

      const getAnimations = () => animations;

      const handler = (event: Event) => {
        // Allow animation when: isPinned is true OR debug is true OR command is "seek"
        const canPlay =
          eventAction.isPinned === true ||
          debug === true ||
          eventAction.command === "seek";
        if (canPlay === false) {
          return;
        }
        if (
          (event.type === "keydown" || event.type === "keyup") &&
          "key" in event &&
          eventAction.triggers.some((trigger) => trigger.kind === event.type) &&
          eventAction.triggers.every((trigger) => {
            if (trigger.kind !== event.type) {
              return true;
            }
            if (trigger.key === undefined) {
              return true;
            }
            return trigger.key === (event as KeyboardEvent).key;
          }) === false
        ) {
          return;
        }

        applyCommand({
          command: eventAction.command,
          seekTo: eventAction.seekTo,
          getAnimations,
          buildAnimations,
          cleanup,
        });
      };

      const listeners: Array<[EventTarget, string, EventListener]> = [];

      for (const trigger of eventAction.triggers) {
        const eventName =
          trigger.kind === "custom" ? trigger.customName : trigger.kind;
        if (eventName === undefined) {
          continue;
        }
        const listener: EventListener = (event) => {
          if (
            (trigger.kind === "keydown" || trigger.kind === "keyup") &&
            trigger.key !== undefined &&
            "key" in event &&
            trigger.key !== (event as KeyboardEvent).key
          ) {
            return;
          }
          handler(event);
        };
        host.addEventListener(eventName, listener);
        listeners.push([host, eventName, listener]);
      }

      return () => {
        cleanup();
        for (const [target, name, listener] of listeners) {
          target.removeEventListener(name, listener);
        }
      };
    }, [action, compiledAnimations, debug]);

    // Live preview: auto-play animation when isPinned is true and animations change
    useEffect(() => {
      if (isEventAction(action) === false) {
        return;
      }
      // Store typed action for use in closures
      const eventAction = action;

      if (isFeatureEnabled("commandAnimations") === false) {
        return;
      }
      // Only auto-play when isPinned (Run on Canvas) is enabled
      if (eventAction.isPinned !== true) {
        return;
      }
      if (compiledAnimations.length === 0) {
        return;
      }
      if (typeof window === "undefined" || typeof document === "undefined") {
        return;
      }

      const host = localRef.current;
      if (host === null) {
        return;
      }

      const targets = resolveTargets(eventAction, host);
      if (targets.length === 0) {
        return;
      }

      let previewAnimations: Animation[] = [];

      // Small delay to ensure DOM is ready and to debounce rapid changes
      const timeoutId = setTimeout(() => {
        // Reset any previous animation styles before starting new ones
        for (const target of targets) {
          target.getAnimations().forEach((anim) => anim.cancel());
        }

        // Apply animation to all target elements
        previewAnimations = targets.flatMap((target) =>
          compiledAnimations.map(({ keyframes, timing }) =>
            target.animate(keyframes, {
              ...timing,
              // Use "none" fill for preview to avoid persisting end state
              fill: "none",
            })
          )
        );
      }, 50);

      return () => {
        clearTimeout(timeoutId);
        // Cancel all preview animations and reset element state
        for (const animation of previewAnimations) {
          animation.cancel();
        }
        // Also cancel any other animations on all targets
        for (const target of targets) {
          target.getAnimations().forEach((anim) => anim.cancel());
        }
      };
    }, [action, compiledAnimations]);

    return <div ref={resolvedRef} style={{ display: "contents" }} {...props} />;
  }
);

const displayName = "AnimateChildren";
AnimateChildren.displayName = displayName;

const namespace = "@webstudio-is/sdk-components-animation";

export const hooksAnimateChildren: Hook = {
  onNavigatorUnselect: (context, event) => {
    if (
      event.instancePath.length > 0 &&
      event.instancePath[0].component === `${namespace}:${displayName}`
    ) {
      context.setMemoryProp(
        event.instancePath[0],
        animationCanPlayOnCanvasProperty,
        undefined
      );
    }
  },
  onNavigatorSelect: (context, event) => {
    if (
      event.instancePath.length > 0 &&
      event.instancePath[0].component === `${namespace}:${displayName}`
    ) {
      context.setMemoryProp(
        event.instancePath[0],
        animationCanPlayOnCanvasProperty,
        true
      );
    }
  },
};

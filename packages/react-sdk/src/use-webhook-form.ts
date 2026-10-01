import { useEffect, useRef, type FormEventHandler } from "react";
import { isBraveBrowser } from "@webstudio-is/sdk/runtime";
import { resolveRedirectUrl } from "@webstudio-is/sdk/link-utils";

export type WebhookFormState = "initial" | "success" | "error";
export type WebhookFormResult = { success: boolean; partialSuccess?: boolean };

// gcd - greatest common divisor
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

const getAspectRatioString = (width: number, height: number) => {
  const r = gcd(width, height);
  const aspectRatio = `${width / r}/${height / r}`;
  return aspectRatio;
};

/**
 * jsdom detector, trying to check that matchMedia is working (jsdom has no support of matchMedia and usually simple stub is used)
 */
const isJSDom = () => {
  if (typeof matchMedia === "undefined") {
    return true;
  }

  const { width, height } = screen;
  const deviceAspectRatio = getAspectRatioString(width, height);

  const matchAspectRatio = matchMedia(
    `(device-aspect-ratio: ${deviceAspectRatio})`
  ).matches;

  const matchWidthHeight = matchMedia(
    `(device-width: ${width}px) and (device-height: ${height}px)`
  ).matches;

  const matchWidthHeightFail = matchMedia(
    `(device-width: ${width - 1}px) and (device-height: ${height}px)`
  ).matches;

  const matchLight = matchMedia("(prefers-color-scheme: light)").matches;
  const matchDark = matchMedia("(prefers-color-scheme: dark)").matches;

  const hasMatchMedia =
    matchAspectRatio &&
    matchWidthHeight &&
    !matchWidthHeightFail &&
    matchLight !== matchDark;

  return hasMatchMedia === false;
};

/** Shared submission behavior for the Remix and React Router adapters. */
export const useWebhookForm = ({
  state,
  data,
  onStateChange,
  successRedirect,
  onSubmit,
}: {
  state: "idle" | "submitting" | "loading";
  data?: WebhookFormResult;
  onStateChange?: (state: WebhookFormState) => void;
  successRedirect?: string;
  onSubmit?: FormEventHandler<HTMLFormElement>;
}) => {
  const botInputRef = useRef<HTMLInputElement>(null);
  const previousState = useRef(state);
  const callbacks = useRef({ onStateChange, successRedirect });
  callbacks.current = { onStateChange, successRedirect };
  useEffect(() => {
    const finished = previousState.current !== "idle" && state === "idle";
    previousState.current = state;
    if (!finished || data === undefined) {
      return;
    }
    const { onStateChange, successRedirect } = callbacks.current;
    onStateChange?.(data?.success === true ? "success" : "error");
    if (data?.success === true) {
      const destination = resolveRedirectUrl(
        successRedirect,
        window.location.href
      );
      if (destination !== undefined) {
        window.location.assign(destination);
      }
    }
  }, [state, data]);

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    onSubmit?.(event);
    const input = botInputRef.current;
    if (event.defaultPrevented || input === null) {
      return;
    }
    // Refresh on every retry. Brave Shields blocks the matchMedia checks.
    input.value = isBraveBrowser()
      ? "brave"
      : isJSDom()
        ? "jsdom"
        : Date.now().toString(16);
  };
  return { botInputRef, handleSubmit };
};

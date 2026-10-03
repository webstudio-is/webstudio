import {
  useEffect,
  useRef,
  useState,
  type ForwardedRef,
  type FormEvent,
} from "react";
import { formBotFieldName, isBraveBrowser } from "@webstudio-is/sdk/runtime";
import { resolveRedirectUrl } from "@webstudio-is/sdk/link-utils";
import { useFormFeedbackScroll } from "./form-feedback-scroll";

export type LegacyWebhookState = "initial" | "success" | "error";
type TransportState = "idle" | "submitting" | "loading";

// The existing hidden browser marker is regenerated for every fetcher submit.
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

const isJSDom = () => {
  if (typeof matchMedia === "undefined") {
    return true;
  }
  const { width, height } = screen;
  const ratio = gcd(width, height);
  const deviceAspectRatio = `${width / ratio}/${height / ratio}`;
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
  return (
    (matchAspectRatio &&
      matchWidthHeight &&
      !matchWidthHeightFail &&
      matchLight !== matchDark) === false
  );
};

const replaceBotMarker = (form: HTMLFormElement) => {
  for (const field of form.querySelectorAll(`[name="${formBotFieldName}"]`)) {
    field.remove();
  }
  const hiddenInput = document.createElement("input");
  hiddenInput.type = "hidden";
  hiddenInput.name = formBotFieldName;
  // Brave Shields blocks the browser properties used by the regular check.
  hiddenInput.value = isBraveBrowser()
    ? "brave"
    : isJSDom()
      ? "jsdom"
      : Date.now().toString(16);
  form.appendChild(hiddenInput);
};

/** Submission lifecycle shared by the Router and Remix legacy Form adapters. */
export const useLegacyWebhookSubmission = ({
  transportState,
  result,
  state,
  onStateChange,
  successRedirect,
  forwardedRef,
}: {
  transportState: TransportState;
  result?: { success: boolean };
  state?: LegacyWebhookState;
  onStateChange?: (state: LegacyWebhookState) => void;
  successRedirect?: string;
  forwardedRef: ForwardedRef<HTMLFormElement>;
}) => {
  const [internalState, setInternalState] =
    useState<LegacyWebhookState>("initial");
  const effectiveState = state ?? internalState;
  const { setFormRef, prepareFeedback, revealFeedback } = useFormFeedbackScroll(
    forwardedRef,
    effectiveState
  );
  const previousTransportState = useRef(transportState);
  const latest = useRef({ onStateChange, successRedirect });
  latest.current = { onStateChange, successRedirect };

  useEffect(() => {
    if (
      previousTransportState.current !== transportState &&
      transportState === "idle" &&
      result !== undefined
    ) {
      const nextState = result.success === true ? "success" : "error";
      setInternalState(nextState);
      latest.current.onStateChange?.(nextState);
      const destination =
        nextState === "success"
          ? resolveRedirectUrl(
              latest.current.successRedirect,
              window.location.href
            )
          : undefined;
      if (destination !== undefined) {
        window.location.assign(destination);
      } else {
        revealFeedback();
      }
    }
    previousTransportState.current = transportState;
  }, [transportState, result, revealFeedback]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    prepareFeedback();
    setInternalState("initial");
    onStateChange?.("initial");
    replaceBotMarker(event.currentTarget);
  };

  return {
    setFormRef,
    handleSubmit,
    state: effectiveState,
    pending: transportState !== "idle",
  };
};

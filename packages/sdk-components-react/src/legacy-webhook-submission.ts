import {
  useEffect,
  useRef,
  useState,
  type ForwardedRef,
  type FormEvent,
} from "react";
import { formBotFieldName, isBraveBrowser } from "@webstudio-is/sdk/runtime";
import { resolveRedirectUrl } from "@webstudio-is/sdk/link-utils";
import { submitFormData } from "./managed-form-client";
import { useFormFeedbackScroll } from "./form-feedback-scroll";

export type LegacyWebhookState = "initial" | "success" | "error";

// Saved Webhook Forms still send one fresh browser marker per submission.
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
  hiddenInput.value = isBraveBrowser()
    ? "brave"
    : isJSDom()
      ? "jsdom"
      : Date.now().toString(16);
  form.appendChild(hiddenInput);
};

/** Shared HTTP submission lifecycle for saved Router and Remix Webhook Forms. */
export const useLegacyWebhookSubmission = ({
  state,
  onStateChange,
  successRedirect,
  onSubmissionSuccess,
  navigationToken,
  forwardedRef,
}: {
  state?: LegacyWebhookState;
  onStateChange?: (state: LegacyWebhookState) => void;
  successRedirect?: string;
  onSubmissionSuccess?: () => void | Promise<void>;
  navigationToken?: string;
  forwardedRef: ForwardedRef<HTMLFormElement>;
}) => {
  const [internalState, setInternalState] =
    useState<LegacyWebhookState>("initial");
  const [pending, setPending] = useState(false);
  const effectiveState = state ?? internalState;
  const { setFormRef, prepareFeedback, revealFeedback } = useFormFeedbackScroll(
    forwardedRef,
    effectiveState
  );
  const activeRequest = useRef<AbortController>();
  const previousNavigationToken = useRef(navigationToken);
  const currentNavigationToken = useRef(navigationToken);
  currentNavigationToken.current = navigationToken;
  useEffect(() => () => activeRequest.current?.abort(), []);
  useEffect(() => {
    if (previousNavigationToken.current !== navigationToken) {
      activeRequest.current?.abort();
      activeRequest.current = undefined;
      setPending(false);
      previousNavigationToken.current = navigationToken;
    }
  }, [navigationToken]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (event.defaultPrevented) {
      return;
    }
    event.preventDefault();
    if (activeRequest.current) {
      return;
    }
    prepareFeedback();
    setInternalState("initial");
    onStateChange?.("initial");
    replaceBotMarker(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData =
      submitter instanceof HTMLElement
        ? new FormData(event.currentTarget, submitter)
        : new FormData(event.currentTarget);
    const controller = new AbortController();
    const submittedNavigationToken = navigationToken;
    const submittedLocation = window.location.href;
    activeRequest.current = controller;
    setPending(true);
    submitFormData({
      formData,
      location: submittedLocation,
      signal: controller.signal,
    })
      .then((response) => {
        if (
          controller.signal.aborted ||
          submittedNavigationToken !== currentNavigationToken.current ||
          submittedLocation !== window.location.href
        ) {
          return;
        }
        setPending(false);
        const nextState = response.success ? "success" : "error";
        setInternalState(nextState);
        onStateChange?.(nextState);
        const destination = response.success
          ? resolveRedirectUrl(successRedirect, window.location.href)
          : undefined;
        if (destination !== undefined) {
          window.location.assign(destination);
          return;
        }
        revealFeedback();
        if (response.success) {
          try {
            Promise.resolve(onSubmissionSuccess?.()).catch(console.error);
          } catch (error) {
            console.error(error);
          }
        }
      })
      .catch(() => {
        // Unmount and navigation cancel a request without showing an error.
      })
      .finally(() => {
        if (activeRequest.current === controller) {
          activeRequest.current = undefined;
        }
      });
  };

  return { setFormRef, handleSubmit, state: effectiveState, pending };
};

import { useEffect, useRef } from "react";
import { resolveRedirectUrl } from "@webstudio-is/sdk/link-utils";
import type { ManagedFormResponse } from "@webstudio-is/sdk/runtime";

export type ManagedFormActionResult = {
  success: boolean;
  errors?: string[] | ManagedFormResponse["errors"];
};

/** Kept for callers of the original form result hook. */
export type ManagedFormResult = ManagedFormActionResult;

/** Applies the shared completion behavior for Router and Remix Forms. */
export const useManagedFormResult = ({
  state,
  data,
  onStateChange,
  onResultChange,
  successRedirect,
  revealFeedback,
}: {
  state: "idle" | "submitting" | "loading";
  data?: ManagedFormActionResult;
  onStateChange?: (state: "initial" | "success" | "error") => void;
  onResultChange?: (result: ManagedFormResponse) => void;
  successRedirect?: string;
  revealFeedback?: () => void;
}) => {
  const previousData = useRef(data);
  const callbacks = useRef({
    onStateChange,
    onResultChange,
    successRedirect,
    revealFeedback,
  });
  callbacks.current = {
    onStateChange,
    onResultChange,
    successRedirect,
    revealFeedback,
  };
  useEffect(() => {
    if (
      state !== "idle" ||
      data === undefined ||
      data === previousData.current
    ) {
      return;
    }
    previousData.current = data;
    const { onStateChange, onResultChange, successRedirect, revealFeedback } =
      callbacks.current;
    if ("results" in data && "status" in data) {
      onResultChange?.(data as ManagedFormResponse);
    }
    const destination = data.success
      ? resolveRedirectUrl(successRedirect, window.location.href)
      : undefined;
    onStateChange?.(data.success ? "success" : "error");
    if (destination !== undefined) {
      window.location.assign(destination);
    } else {
      revealFeedback?.();
    }
  }, [data, state]);
};

import { useEffect, useRef } from "react";
import { resolveRedirectUrl } from "@webstudio-is/sdk/link-utils";

export type ManagedFormResult = {
  success: boolean;
  errors?: string[];
};

/** Applies the shared completion behavior for Router and Remix Forms. */
export const useManagedFormResult = ({
  state,
  data,
  onStateChange,
  successRedirect,
}: {
  state: "idle" | "submitting" | "loading";
  data?: ManagedFormResult;
  onStateChange?: (state: "initial" | "success" | "error") => void;
  successRedirect?: string;
}) => {
  const previousData = useRef(data);
  const callbacks = useRef({ onStateChange, successRedirect });
  callbacks.current = { onStateChange, successRedirect };
  useEffect(() => {
    if (
      state !== "idle" ||
      data === undefined ||
      data === previousData.current
    ) {
      return;
    }
    previousData.current = data;
    const { onStateChange, successRedirect } = callbacks.current;
    onStateChange?.(data.success ? "success" : "error");
    if (data.success) {
      const destination = resolveRedirectUrl(
        successRedirect,
        window.location.href
      );
      if (destination !== undefined) {
        window.location.assign(destination);
      }
    }
  }, [data, state]);
};

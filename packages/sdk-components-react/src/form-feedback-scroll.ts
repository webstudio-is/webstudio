import { useCallback, useEffect, useRef, type ForwardedRef } from "react";

const isVisible = (element: Element, form: HTMLFormElement) => {
  if (element instanceof HTMLInputElement && element.type === "hidden") {
    return false;
  }
  for (
    let current: Element | null = element;
    current && current !== form;
    current = current.parentElement
  ) {
    const style = window.getComputedStyle(current);
    if (
      current.hasAttribute("hidden") ||
      current.getAttribute("aria-hidden") === "true" ||
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse"
    ) {
      return false;
    }
  }
  return true;
};

const getVisibleElements = (form: HTMLFormElement) =>
  new Set(
    Array.from(form.querySelectorAll("*")).filter((element) =>
      isVisible(element, form)
    )
  );

/** Reveal feedback created by state-driven form content, including saved forms without markers. */
export const useFormFeedbackScroll = (
  forwardedRef: ForwardedRef<HTMLFormElement>,
  state?: "initial" | "success" | "error"
) => {
  const formRef = useRef<HTMLFormElement | null>(null);
  const beforeSubmit = useRef<Set<Element>>(new Set());
  const prepared = useRef(false);
  const frame = useRef<number>();

  const setFormRef = useCallback(
    (form: HTMLFormElement | null) => {
      formRef.current = form;
      if (typeof forwardedRef === "function") {
        forwardedRef(form);
      } else if (forwardedRef) {
        forwardedRef.current = form;
      }
    },
    [forwardedRef]
  );

  const prepareFeedback = useCallback(() => {
    prepared.current = true;
    if (formRef.current) {
      beforeSubmit.current = getVisibleElements(formRef.current);
    }
    if (frame.current !== undefined) {
      cancelAnimationFrame(frame.current);
    }
  }, []);

  // Re-snapshot after an earlier error is hidden. Saved forms may keep the
  // feedback element mounted and toggle its display instead of mounting it.
  useEffect(() => {
    if (state === "initial" && prepared.current && formRef.current) {
      beforeSubmit.current = getVisibleElements(formRef.current);
    }
  }, [state]);

  const revealFeedback = useCallback(() => {
    let remainingFrames = 10;
    const check = () => {
      const form = formRef.current;
      if (!form) {
        return;
      }
      const visibleElements = Array.from(form.querySelectorAll("*")).filter(
        (element) => isVisible(element, form) && element instanceof HTMLElement
      );
      const target =
        visibleElements.find((element) =>
          element.hasAttribute("data-ws-form-feedback")
        ) ??
        visibleElements.find((element) => !beforeSubmit.current.has(element));
      if (!target) {
        if (--remainingFrames > 0) {
          frame.current = requestAnimationFrame(check);
        }
        return;
      }
      const bounds = target.getBoundingClientRect();
      if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
        target.scrollIntoView({
          block: "center",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
        });
      }
    };
    frame.current = requestAnimationFrame(check);
  }, []);

  useEffect(
    () => () => {
      if (frame.current !== undefined) {
        cancelAnimationFrame(frame.current);
      }
    },
    []
  );

  return { setFormRef, prepareFeedback, revealFeedback };
};

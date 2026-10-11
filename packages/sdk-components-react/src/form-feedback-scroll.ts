import { useCallback, useEffect, useRef, type ForwardedRef } from "react";

/** Scroll a submitted Form into view after its result renders. */
export const useFormFeedbackScroll = (
  forwardedRef: ForwardedRef<HTMLFormElement>
) => {
  const formRef = useRef<HTMLFormElement | null>(null);
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

  const revealFeedback = useCallback(() => {
    if (frame.current !== undefined) {
      cancelAnimationFrame(frame.current);
    }
    frame.current = requestAnimationFrame(() => {
      // Let React commit the success/error feedback before measuring the Form.
      frame.current = requestAnimationFrame(() => {
        const form = formRef.current;
        if (!form) {
          return;
        }
        const bounds = form.getBoundingClientRect();
        if (bounds.bottom < 0 || bounds.bottom > window.innerHeight) {
          form.scrollIntoView({
            block: "end",
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "instant"
              : "smooth",
          });
        }
      });
    });
  }, []);

  useEffect(
    () => () => {
      if (frame.current !== undefined) {
        cancelAnimationFrame(frame.current);
      }
    },
    []
  );

  return { setFormRef, revealFeedback };
};

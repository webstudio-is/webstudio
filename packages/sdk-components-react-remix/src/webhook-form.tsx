import {
  type ElementRef,
  type ComponentProps,
  forwardRef,
  useRef,
  useEffect,
} from "react";
import { useFetcher, type Fetcher, type FormProps } from "@remix-run/react";
import {
  formIdFieldName,
  formBotFieldName,
  createFormBotValue,
} from "@webstudio-is/sdk/form/browser";

// This module serves only the deprecated Webhook Form. Remove its private
// fetch and state helpers with the component.
/** @deprecated Tag for the deprecated Webhook Form component. */
export const defaultTag = "form";

const useOnFetchEnd = <Data,>(
  fetcher: Fetcher<Data>,
  handler: (data: Data) => void
) => {
  const latestHandler = useRef(handler);
  latestHandler.current = handler;

  const prevFetcher = useRef(fetcher);
  useEffect(() => {
    if (
      prevFetcher.current.state !== fetcher.state &&
      fetcher.state === "idle" &&
      fetcher.data !== undefined
    ) {
      latestHandler.current(fetcher.data);
    }
    prevFetcher.current = fetcher;
  }, [fetcher]);
};

type State = "initial" | "success" | "error";

/** @deprecated Webhook Form is supported through the next release. Use Form for new forms. */
export const WebhookForm = forwardRef<
  ElementRef<typeof defaultTag>,
  Omit<ComponentProps<typeof defaultTag>, "action"> & {
    /** Use this property to reveal the Success and Error states on the canvas so they can be styled. The Initial state is displayed when the page first opens. The Success and Error states are displayed depending on whether the Form submits successfully or unsuccessfully. */
    state?: State;
    encType?: FormProps["encType"];
    onStateChange?: (state: State) => void;
    action?: string;
  }
>(
  (
    { children, action, method, state = "initial", onStateChange, ...rest },
    ref
  ) => {
    const fetcher = useFetcher<{ success: boolean }>();
    const hiddenJsInput = useRef<HTMLInputElement>(null);

    useOnFetchEnd(fetcher, (data) => {
      const state: State = data?.success === true ? "success" : "error";
      onStateChange?.(state);
    });

    /** Refresh the bot field before every submission. */
    const handleSubmitAndAddHiddenJsField = (
      event: React.FormEvent<HTMLFormElement>
    ) => {
      const hiddenInput = hiddenJsInput.current;
      if (hiddenInput === null) {
        event.preventDefault();
        return;
      }
      hiddenInput.value = createFormBotValue();
    };

    return (
      <fetcher.Form
        {...rest}
        method="post"
        data-state={state}
        ref={ref}
        onSubmit={handleSubmitAndAddHiddenJsField}
      >
        <input
          type="hidden"
          name={formIdFieldName}
          value={action?.toString()}
        />
        <input type="hidden" name={formBotFieldName} ref={hiddenJsInput} />
        {children}
      </fetcher.Form>
    );
  }
);

WebhookForm.displayName = "WebhookForm";

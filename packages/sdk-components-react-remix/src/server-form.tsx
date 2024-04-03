import {
  type ElementRef,
  type ComponentProps,
  forwardRef,
  useRef,
  useEffect,
} from "react";
import { useFetcher, type Fetcher, type FormProps } from "@remix-run/react";
import { formIdFieldName } from "@webstudio-is/form-handlers";
import { getInstanceIdFromComponentProps } from "@webstudio-is/react-sdk";

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

export const ServerForm = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag> & {
    /** Use this property to reveal the Success and Error states on the canvas so they can be styled. The Initial state is displayed when the page first opens. The Success and Error states are displayed depending on whether the Form submits successfully or unsuccessfully. */
    state?: State;
    encType?: FormProps["encType"];
    onStateChange?: (state: State) => void;
  }
>(
  (
    { children, action, method, state = "initial", onStateChange, ...rest },
    ref
  ) => {
    const fetcher = useFetcher<{ success: boolean }>();

    const instanceId = getInstanceIdFromComponentProps(rest);

    useOnFetchEnd(fetcher, (data) => {
      const state: State = data?.success === true ? "success" : "error";
      onStateChange?.(state);
    });

    return (
      <fetcher.Form {...rest} method="post" data-state={state} ref={ref}>
        <input type="hidden" name={formIdFieldName} value={instanceId} />
        {children}
      </fetcher.Form>
    );
  }
);

ServerForm.displayName = "Form";

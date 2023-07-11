import {
  type ElementRef,
  type ComponentProps,
  forwardRef,
  useRef,
  useEffect,
  useContext,
} from "react";
import { useFetcher, type Fetcher, type FormProps } from "@remix-run/react";
import { formIdFieldName } from "@webstudio-is/form-handlers";
import {
  ReactSdkContext,
  getInstanceIdFromComponentProps,
} from "@webstudio-is/react-sdk";

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

export const Form = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag> & {
    state?: State;
    encType?: FormProps["encType"];
  }
>(({ children, action, method, state = "initial", ...rest }, ref) => {
  const { setBoundDataSourceValue } = useContext(ReactSdkContext);

  const fetcher = useFetcher();

  const instanceId = getInstanceIdFromComponentProps(rest);

  useOnFetchEnd(fetcher, (data) => {
    const state: State = data?.success === true ? "success" : "error";
    setBoundDataSourceValue(instanceId, "state", state);
  });

  return (
    <fetcher.Form {...rest} method="post" data-state={state} ref={ref}>
      <input type="hidden" name={formIdFieldName} value={instanceId} />
      {children}
    </fetcher.Form>
  );
});

Form.displayName = "Form";

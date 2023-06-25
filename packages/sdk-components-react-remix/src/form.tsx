import {
  type ReactNode,
  type ElementRef,
  type ComponentProps,
  Children,
  cloneElement,
  forwardRef,
  useRef,
  useEffect,
  useContext,
} from "react";
import { useFetcher, type Fetcher } from "@remix-run/react";
import { formIdFieldName } from "@webstudio-is/form-handlers";
import {
  ReactSdkContext,
  getInstanceIdFromComponentProps,
} from "@webstudio-is/react-sdk";

export const defaultTag = "form";

const isComponentNode = (
  component: string,
  node: Exclude<ReactNode, null | number | string | boolean | undefined>
) => "props" in node && node.props.instance?.component === component;

const onlyErrorMessage = (children: ReactNode) =>
  Children.map(children, (child): ReactNode => {
    if (typeof child !== "object" || child === null) {
      return null;
    }

    if (isComponentNode("ErrorMessage", child)) {
      return child;
    }

    if ("props" in child) {
      const newChildren = onlyErrorMessage(child.props.children);
      return Children.toArray(newChildren).some((child) => child !== null)
        ? cloneElement(child, { children: newChildren })
        : null;
    }

    return onlyErrorMessage(child);
  });

const onlySuccessMessage = (children: ReactNode) =>
  Children.map(children, (child): ReactNode => {
    if (typeof child !== "object" || child === null) {
      return null;
    }

    if (isComponentNode("SuccessMessage", child)) {
      return child;
    }

    if ("props" in child) {
      const newChildren = onlySuccessMessage(child.props.children);
      return Children.toArray(newChildren).some((child) => child !== null)
        ? cloneElement(child, { children: newChildren })
        : null;
    }

    return onlySuccessMessage(child);
  });

const withoutMessages = (children: ReactNode) =>
  Children.map(children, (child): ReactNode => {
    if (typeof child !== "object" || child === null) {
      return child;
    }

    if (
      isComponentNode("ErrorMessage", child) ||
      isComponentNode("SuccessMessage", child)
    ) {
      return null;
    }

    if ("props" in child) {
      return cloneElement(child, {
        children: withoutMessages(child.props.children),
      });
    }

    return withoutMessages(child);
  });

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
    initialState?: "initial" | "success" | "error";
    state?: State;
    initial?: boolean;
    success?: boolean;
    error?: boolean;
  }
>((props, ref) => {
  const {
    children,
    initialState = "initial",
    action,
    method,
    state = "initial",
    initial = true,
    success = false,
    error = false,
    ...rest
  } = props;
  const { setDataSourceValue } = useContext(ReactSdkContext);

  const fetcher = useFetcher();

  const instanceId = getInstanceIdFromComponentProps(rest);

  useOnFetchEnd(fetcher, (data) => {
    const state: State = data?.success === true ? "success" : "error";
    const success = state === "success";
    const error = state === "error";
    setDataSourceValue(instanceId, "state", state);
    setDataSourceValue(instanceId, "initial", false);
    setDataSourceValue(instanceId, "success", success);
    setDataSourceValue(instanceId, "error", error);
  });

  return (
    <fetcher.Form {...rest} method="post" data-state={state} ref={ref}>
      <input type="hidden" name={formIdFieldName} value={instanceId} />
      {state === "success"
        ? onlySuccessMessage(children)
        : state === "error"
        ? onlyErrorMessage(children)
        : withoutMessages(children)}
    </fetcher.Form>
  );
});

Form.displayName = "Form";

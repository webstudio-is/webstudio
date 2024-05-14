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
import { formBotFieldName } from "../../form-handlers/src/shared";

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

// gcd - greatest common divisor
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

const getAspectRatioString = (width: number, height: number) => {
  const r = gcd(width, height);
  const aspectRatio = `${width / r}/${height / r}`;
  return aspectRatio;
};

/**
 * jsdom detector, trying to check that matchMedia is working (jsdom has no support of matchMedia and usually simple stub is used)
 */
const isJSDom = () => {
  if (typeof matchMedia === "undefined") {
    return true;
  }

  const { width, height } = screen;
  const deviceAspectRatio = getAspectRatioString(width, height);

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

  const hasMatchMedia =
    matchAspectRatio &&
    matchWidthHeight &&
    !matchWidthHeightFail &&
    matchLight !== matchDark;

  return hasMatchMedia === false;
};

export const WebhookForm = forwardRef<
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

    /**
     * Add hidden field generated using js with simple jsdom detector.
     * This is used to protect form submission against very simple bots.
     */
    const handleSubmitAndAddHiddenJsField = (
      event: React.FormEvent<HTMLFormElement>
    ) => {
      const hiddenInput = document.createElement("input");
      hiddenInput.type = "hidden";
      hiddenInput.name = formBotFieldName;
      // Non-numeric values are utilized for logging purposes.
      hiddenInput.value = isJSDom() ? "jsdom" : Date.now().toString(16);
      event.currentTarget.appendChild(hiddenInput);
    };

    return (
      <fetcher.Form
        {...rest}
        method="post"
        data-state={state}
        ref={ref}
        onSubmit={handleSubmitAndAddHiddenJsField}
      >
        <input type="hidden" name={formIdFieldName} value={instanceId} />
        {children}
      </fetcher.Form>
    );
  }
);

WebhookForm.displayName = "WebhookForm";

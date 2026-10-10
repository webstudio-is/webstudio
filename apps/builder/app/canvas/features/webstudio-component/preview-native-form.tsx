import {
  forwardRef,
  useEffect,
  useRef,
  type ComponentProps,
  type ElementRef,
} from "react";
import { useStore } from "@nanostores/react";
import { mergeRefs } from "@react-aria/utils";
import { selectorIdAttribute } from "@webstudio-is/react-sdk";
import { NativeForm } from "@webstudio-is/sdk-components-react/components";
import type { submitManagedForm } from "@webstudio-is/sdk-components-react";
import type { ManagedFormResponse } from "@webstudio-is/sdk/runtime";
import { $selectedPageHash } from "~/shared/nano-states/pages";
import { $currentSystem } from "~/shared/system";
import { publish } from "~/shared/pubsub";
import { readPreviewFormValues } from "~/shared/preview-form-values";
import { submitPreviewForm } from "~/shared/preview-form-bridge";
import { switchPageAndUpdateSystem } from "~/canvas/interceptor";
import { navigatePreviewFormSuccess } from "./form-success-redirect";
import { getPreviewCurrentUrl } from "./preview-current-url";

export const submitManagedFormFromPreview = (
  managedFormId: string,
  values: Parameters<typeof submitManagedForm>[0]["values"],
  signal: AbortSignal
) => {
  const currentUrl = getPreviewCurrentUrl(
    $currentSystem.get(),
    $selectedPageHash.get().hash
  );
  // The authenticated parent waits for durable saves before posting the draft.
  return submitPreviewForm({
    values,
    managedFormId,
    path: currentUrl.pathname + currentUrl.search,
    signal,
  });
};

export const PreviewNativeForm = forwardRef<
  ElementRef<typeof NativeForm>,
  ComponentProps<typeof NativeForm>
>((props, ref) => {
  const system = useStore($currentSystem);
  const { hash } = useStore($selectedPageHash);
  const formRef = useRef<HTMLFormElement>(null);
  const onStateChangeRef = useRef(props.onStateChange);
  onStateChangeRef.current = props.onStateChange;
  const formSelector = (props as Record<string, unknown>)[selectorIdAttribute];
  useEffect(() => () => onStateChangeRef.current?.("initial"), []);
  const formId = props["data-ws-managed-form-id"];
  useEffect(() => {
    const form = formRef.current;
    if (!form || !formId) {
      return;
    }
    let active = true;
    const send = () =>
      queueMicrotask(() => {
        if (active) {
          publish({
            type: "previewFormValues",
            payload: {
              selector: String(formSelector),
              values: readPreviewFormValues(form),
            },
          });
        }
      });
    form.addEventListener("input", send);
    form.addEventListener("change", send);
    const observer = new MutationObserver(send);
    observer.observe(form, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        "value",
        "checked",
        "selected",
        "disabled",
        "name",
        "type",
      ],
    });
    send();
    return () => {
      active = false;
      observer.disconnect();
      form.removeEventListener("input", send);
      form.removeEventListener("change", send);
      publish({
        type: "previewFormValues",
        payload: { selector: String(formSelector), values: null },
      });
    };
  }, [formId, formSelector]);
  return (
    <NativeForm
      {...props}
      ref={mergeRefs(ref, formRef)}
      navigationToken={getPreviewCurrentUrl(system, hash).href}
    />
  );
});

export const getPreviewNativeFormProps = (formId: string) => {
  const getPreviewUrl = () =>
    getPreviewCurrentUrl($currentSystem.get(), $selectedPageHash.get().hash);
  return {
    "data-ws-managed-form-id": formId,
    getRedirectBaseUrl: () => getPreviewUrl().href,
    onManagedSubmit: (
      values: Parameters<typeof submitManagedForm>[0]["values"],
      signal: AbortSignal
    ): Promise<ManagedFormResponse> =>
      submitManagedFormFromPreview(formId, values, signal),
    onSuccessRedirect: (destination: string) =>
      navigatePreviewFormSuccess(
        destination,
        getPreviewUrl().href,
        (path) => switchPageAndUpdateSystem(path, { includeFallback: false }),
        (href) => window.location.assign(href)
      ),
  };
};

import { useEffect, useRef, useState, type RefObject } from "react";
import { type DataSource } from "@webstudio-is/sdk";
import { createResourceValueFromFormData } from "@webstudio-is/project-build/runtime";
import {
  computeResourceRequest,
  loadResourcePreview,
} from "~/shared/resources";
import { useResourceScope } from "../../resource-scope";

/** Owns the preview request for HTTP-like resource editors. */
export const useResourcePreviewController = ({
  variable,
  formRef,
  getFormData,
}: {
  variable?: DataSource;
  formRef: RefObject<HTMLFormElement>;
  getFormData?: (form: HTMLFormElement | null) => FormData | undefined;
}) => {
  const resourceScope = useResourceScope({ variable });
  const releaseRef = useRef<(() => void) | undefined>(undefined);
  const revisionRef = useRef(0);
  const [request, setRequest] = useState<unknown>();
  const [showSavedRequest, setShowSavedRequest] = useState(true);
  const [pending, setPending] = useState(false);

  const cancel = () => {
    revisionRef.current += 1;
    releaseRef.current?.();
    releaseRef.current = undefined;
    setPending(false);
  };
  useEffect(
    () => () => {
      revisionRef.current += 1;
      releaseRef.current?.();
    },
    []
  );

  const onChange = () => {
    cancel();
    setRequest(undefined);
    setShowSavedRequest(false);
  };
  const reload = async () => {
    cancel();
    const revision = revisionRef.current;
    setRequest(undefined);
    setShowSavedRequest(false);
    const formData = getFormData
      ? getFormData(formRef.current)
      : new FormData(formRef.current ?? undefined);
    if (formData === undefined) {
      return;
    }
    setPending(true);
    try {
      const resource = createResourceValueFromFormData({
        id: variable?.id ?? "new",
        formData,
      });
      const resourceRequest = await computeResourceRequest(
        resource,
        resourceScope.variableValues
      );
      if (revision !== revisionRef.current) {
        return;
      }
      releaseRef.current = loadResourcePreview(resourceRequest);
      setRequest(resourceRequest);
    } catch {
      if (revision === revisionRef.current) {
        console.error("Unable to load resource preview");
      }
    } finally {
      if (revision === revisionRef.current) {
        setPending(false);
      }
    }
  };
  return {
    request,
    showSavedRequest,
    pending,
    onChange,
    reload,
  };
};

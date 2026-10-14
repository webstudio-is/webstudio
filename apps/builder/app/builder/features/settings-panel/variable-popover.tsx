import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import { FloatingPanel } from "@webstudio-is/design-system";
import type { DataSource } from "@webstudio-is/sdk";
import { $variableToOpen } from "./variable-navigation";
import { VariableEditorDialog } from "./variable-editors/dialog";

const areAllFormErrorsVisible = (form: null | HTMLFormElement) => {
  if (form === null) {
    return true;
  }
  // check all errors in form fields are visible
  for (const element of form.elements) {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ) {
      // field is invalid and the error is not visible
      if (
        element.validity.valid === false &&
        // rely on data-color=error convention in webstudio design system
        element.getAttribute("data-color") !== "error"
      ) {
        return false;
      }
    }
  }
  return true;
};

export const VariablePopoverTrigger = ({
  variable,
  children,
  onOpenChange,
}: {
  variable?: DataSource;
  children: ReactNode;
  onOpenChange?: (isOpen: boolean) => void;
}) => {
  const [isOpen, setOpen] = useState(false);
  const variableToOpen = useStore($variableToOpen);
  const formRef = useRef<HTMLFormElement>(null);
  const saveFailedRef = useRef(false);
  const variableId = variable?.id;

  useEffect(() => {
    if (variableId === undefined || variableToOpen?.id !== variableId) {
      return;
    }
    setOpen(true);
    onOpenChange?.(true);
    $variableToOpen.set(undefined);
  }, [onOpenChange, variableId, variableToOpen]);

  return (
    <FloatingPanel
      maximizable
      resize="both"
      placement="center"
      width={740}
      height={480}
      open={isOpen}
      onOpenChange={(newOpen) => {
        if (newOpen) {
          setOpen(true);
          onOpenChange?.(true);
          return;
        }
        // attempt to save form on close
        if (areAllFormErrorsVisible(formRef.current)) {
          saveFailedRef.current = false;
          formRef.current?.requestSubmit();
          if (saveFailedRef.current) {
            return;
          }
          setOpen(false);
          onOpenChange?.(false);
        } else {
          formRef.current?.checkValidity();
          // prevent closing when not all errors are shown to user
        }
      }}
      title={undefined}
      content={
        <div
          data-variable-editor-dialog
          style={{ display: "contents" }}
          onPointerDown={(event) => {
            if (event.button === 2) {
              event.stopPropagation();
            }
          }}
          onContextMenu={(event) => event.stopPropagation()}
        >
          <VariableEditorDialog
            formRef={formRef}
            variable={variable}
            isOpen={isOpen}
            onSave={(saved) => {
              saveFailedRef.current = !saved;
            }}
            onClose={() => {
              setOpen(false);
              onOpenChange?.(false);
            }}
          />
        </div>
      }
    >
      {children}
    </FloatingPanel>
  );
};

VariablePopoverTrigger.displayName = "VariablePopoverTrigger";

export { __testing__ } from "./variable-editors/dialog";

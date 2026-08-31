import interactionResponse from "await-interaction-response";
import {
  type ReactNode,
  type ComponentProps,
  forwardRef,
  Children,
  useEffect,
  useRef,
  useContext,
  useCallback,
  useState,
} from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ReactSdkContext,
  getClosestInstance,
  type Hook,
} from "@webstudio-is/react-sdk/runtime";
import {
  getLinkActivation,
  NavigationOverlayContext,
  useNavigationOverlay,
} from "./navigation-overlay";

// wrap in forwardRef because Root is functional component without ref
export const Dialog = forwardRef<
  HTMLDivElement,
  Omit<ComponentProps<typeof DialogPrimitive.Root>, "defaultOpen">
>((props, _ref) => {
  const currentOpen = props.open ?? false;
  const [open, setOpen] = useState(currentOpen);
  // synchronize external value with local one when changed
  useEffect(() => setOpen(currentOpen), [currentOpen]);

  const onOpenChangeHandler = useCallback(async (open: boolean) => {
    await interactionResponse();
    setOpen(open);
  }, []);
  const close = useCallback(() => {
    void onOpenChangeHandler(false);
  }, [onOpenChangeHandler]);

  return (
    <NavigationOverlayContext.Provider value={close}>
      <DialogPrimitive.Root
        {...props}
        onOpenChange={onOpenChangeHandler}
        open={open}
      />
    </NavigationOverlayContext.Provider>
  );
});

/**
 * We're not exposing the 'asChild' property for the Trigger.
 * Instead, we're enforcing 'asChild=true' for the Trigger and making it style-less.
 * This avoids situations where the Trigger inadvertently passes all styles to its child,
 * which would prevent us from displaying styles properly in the builder.
 */
export const DialogTrigger = forwardRef<
  HTMLButtonElement,
  { children: ReactNode }
>(({ children, ...props }, ref) => {
  const firstChild = Children.toArray(children)[0];

  return (
    <DialogPrimitive.Trigger ref={ref} asChild={true} {...props}>
      {firstChild ?? <button>Add button or link</button>}
    </DialogPrimitive.Trigger>
  );
});

export const DialogOverlay = forwardRef<
  HTMLDivElement,
  ComponentProps<typeof DialogPrimitive.Overlay>
>((props, ref) => {
  return (
    <DialogPrimitive.DialogPortal>
      <DialogPrimitive.Overlay ref={ref} {...props} />
    </DialogPrimitive.DialogPortal>
  );
});

export const DialogContent = forwardRef<
  HTMLDivElement,
  ComponentProps<typeof DialogPrimitive.Content>
>(({ onClickCapture, onCloseAutoFocus, ...props }, ref) => {
  // Hash navigation keeps the page alive, so restoring focus to the trigger
  // would pull focus away from the newly selected section.
  const preventAutoFocusOnClose = useRef(false);
  const { renderer } = useContext(ReactSdkContext);
  const close = useNavigationOverlay();

  return (
    <DialogPrimitive.Content
      ref={ref}
      {...props}
      onClickCapture={(event) => {
        onClickCapture?.(event);
        // Preview mirrors the published site; Canvas stays open for editing.
        if (renderer !== "canvas" && getLinkActivation(event)) {
          preventAutoFocusOnClose.current = true;
          close?.();
        }
      }}
      onCloseAutoFocus={(event) => {
        onCloseAutoFocus?.(event);
        if (preventAutoFocusOnClose.current) {
          event.preventDefault();
        }
      }}
    />
  );
});

export const DialogClose = DialogPrimitive.Close;

type Tag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
const defaultTag = "h1";
export const DialogTitle = forwardRef<
  HTMLHeadingElement,
  ComponentProps<typeof DialogPrimitive.DialogTitle> & { tag?: Tag }
>(({ tag: Tag = defaultTag, children, ...props }, ref) => (
  <DialogPrimitive.DialogTitle asChild>
    <Tag ref={ref} {...props}>
      {children}
    </Tag>
  </DialogPrimitive.DialogTitle>
));

export const DialogDescription = DialogPrimitive.Description;

/* BUILDER HOOKS */

const namespace = "@webstudio-is/sdk-components-react-radix";

// For each DialogOverlay component within the selection,
// we identify its closest parent Dialog component
// and update its open prop bound to variable.
export const hooksDialog: Hook = {
  onNavigatorUnselect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `${namespace}:DialogOverlay`) {
        const dialog = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:Dialog`
        );
        if (dialog) {
          context.setMemoryProp(dialog, "open", undefined);
        }
      }
    }
  },
  onNavigatorSelect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `${namespace}:DialogOverlay`) {
        const dialog = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:Dialog`
        );
        if (dialog) {
          context.setMemoryProp(dialog, "open", true);
        }
      }
    }
  },
};

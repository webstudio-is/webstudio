import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
  Children,
  type ComponentProps,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ReactSdkContext,
  getClosestInstance,
  type Hook,
} from "@webstudio-is/react-sdk/runtime";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import interactionResponse from "await-interaction-response";

/**
 * Naive heuristic to determine if a click event will cause navigate
 */
const willNavigate = (event: MouseEvent) => {
  const { target } = event;

  if (target instanceof HTMLAnchorElement === false) {
    return false;
  }

  if (target.hasAttribute("href") === false) {
    return false;
  }

  if (target.href === "#") {
    return false;
  }

  if (target.hasAttribute("target") && target.target === "_blank") {
    return false;
  }

  if (event.ctrlKey || event.metaKey) {
    return false;
  }

  return true;
};

// wrap in forwardRef because Root is functional component without ref
export const Dialog = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof DialogPrimitive.Root>, "defaultOpen">
>((props, _ref) => {
  const { renderer } = useContext(ReactSdkContext);

  const [open, onOpenChange] = useControllableState({
    prop: props.open,
    defaultProp: false,
    onChange: props.onOpenChange,
  });

  const onOpenChangeHandler = useCallback(
    async (open: boolean) => {
      await interactionResponse();
      onOpenChange(open);
    },
    [onOpenChange]
  );

  /**
   * Close the dialog when a navigable link within it is clicked.
   */
  useEffect(() => {
    if (renderer !== undefined) {
      return;
    }

    if (open === false) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const { target } = event;

      if (willNavigate(event) === false) {
        return;
      }

      if (target instanceof HTMLAnchorElement === false) {
        return false;
      }

      if (target.closest('[role="dialog"]')) {
        onOpenChangeHandler?.(false);
      }
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [open, onOpenChangeHandler, renderer]);

  return (
    <DialogPrimitive.Root
      {...props}
      onOpenChange={onOpenChangeHandler}
      open={open}
    />
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
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>((props, ref) => {
  return (
    <DialogPrimitive.DialogPortal>
      <DialogPrimitive.Overlay ref={ref} {...props} />
    </DialogPrimitive.DialogPortal>
  );
});

export const DialogContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>((props, ref) => {
  const preventAutoFocusOnClose = useRef(false);
  const { renderer } = useContext(ReactSdkContext);

  /**
   * Prevent focusing on the trigger after a navigable link in a dialog is clicked and closes the dialog.
   */
  useEffect(() => {
    if (renderer !== undefined) {
      return;
    }

    preventAutoFocusOnClose.current = false;

    const handleClick = (event: MouseEvent) => {
      const { target } = event;

      if (willNavigate(event) === false) {
        return;
      }

      if (target instanceof HTMLAnchorElement === false) {
        return false;
      }

      if (target.closest('[role="dialog"]')) {
        preventAutoFocusOnClose.current = true;
      }
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [renderer]);

  return (
    <DialogPrimitive.Content
      ref={ref}
      {...props}
      onCloseAutoFocus={(event) => {
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

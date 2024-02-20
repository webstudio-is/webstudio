import {
  componentAttribute,
  idAttribute,
  type WebstudioComponentSystemProps,
} from "@webstudio-is/react-sdk";
import { forwardRef, type ElementRef, type ReactNode } from "react";

type Props = {
  children?: ReactNode;
} & WebstudioComponentSystemProps;

export const MarketplaceStore = forwardRef<ElementRef<"div">, Props>(
  (props, ref) => {
    return (
      <div
        {...props}
        ref={ref}
        style={{ display: props.children ? "contents" : "block" }}
        onClick={() => {
          window.parent.postMessage(
            {
              type: "insert",
              namespace: props[componentAttribute],
              payload: props[idAttribute],
            },
            "*"
          );
        }}
      />
    );
  }
);

MarketplaceStore.displayName = "MarketplaceStore";

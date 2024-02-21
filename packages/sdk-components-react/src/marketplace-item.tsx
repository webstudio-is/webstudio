import {
  componentAttribute,
  idAttribute,
  type WebstudioComponentSystemProps,
} from "@webstudio-is/react-sdk";
import { forwardRef, type ElementRef, type ReactNode } from "react";

type Action = {
  type: "insert";
  namespace: string;
  payload: string;
};

const publish = ({ type, namespace, payload }: Action) => {
  window.parent.postMessage(
    {
      type,
      namespace,
      payload,
    },
    "*"
  );
};

type Props = {
  children?: ReactNode;
} & WebstudioComponentSystemProps;

export const MarketplaceItem = forwardRef<ElementRef<"div">, Props>(
  (props, ref) => {
    return (
      <div
        {...props}
        ref={ref}
        style={{ display: props.children ? "contents" : "block" }}
        onClick={() => {
          publish({
            type: "insert",
            namespace: props[componentAttribute],
            payload: props[idAttribute],
          });
        }}
      />
    );
  }
);

MarketplaceItem.displayName = "MarketplaceItem";

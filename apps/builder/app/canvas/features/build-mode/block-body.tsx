import type {
  AnyComponent,
  WebstudioComponentSystemProps,
} from "@webstudio-is/react-sdk";
import * as React from "react";
import { useStore } from "@nanostores/react";
import { $isPreviewMode } from "~/shared/nano-states";

export const BlockBody = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode } & WebstudioComponentSystemProps
>(({ children, ...props }, ref) => {
  const isPreviewMode = useStore($isPreviewMode);
  const isEmpty = React.Children.count(children) === 0;
  if (isPreviewMode && isEmpty) {
    return <></>;
  }
  return (
    <div
      ref={ref}
      style={
        isEmpty ? { minHeight: "1lh", width: "100%" } : { display: "contents" }
      }
      {...props}
    >
      {children}
    </div>
  );
}) as AnyComponent;

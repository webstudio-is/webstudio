import type {
  AnyComponent,
  WebstudioComponentSystemProps,
} from "@webstudio-is/react-sdk";

import * as React from "react";

export const EditableBlock = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode } & WebstudioComponentSystemProps
>(({ children, ...props }, ref) => {
  const childArray = React.Children.toArray(children).filter((child) =>
    React.isValidElement(child)
  );

  const editableBlockStyle =
    childArray.length === 1 ? {} : { display: "contents" };

  return (
    <div ref={ref} style={editableBlockStyle} {...props}>
      {childArray}
    </div>
  );
}) as AnyComponent;

import React, { forwardRef, type ElementRef, type ComponentProps } from "react";
import { InputIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Input } from "./input";

export default {
  Icon: InputIcon,
  Component: Input,
  canAcceptChild: () => false,
  isContentEditable: false,
  isInlineOnly: false,
  label: "Input",
} as WsComponentMeta<typeof Input>;

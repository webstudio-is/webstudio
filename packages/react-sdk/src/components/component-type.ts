import type { Style } from "../css";

export type WsComponentMeta<ComponentType> = {
  Component: ComponentType;
  Icon: ComponentType;
  defaultStyle: Style;
  canAcceptChild: () => boolean;
  isContentEditable: boolean;
  isInlineOnly: boolean;
  label: string;
  children: Array<string>;
};

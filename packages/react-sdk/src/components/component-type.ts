import type { Style } from "../css";

export type WsComponentMeta<ComponentType> = {
  Component: ComponentType;
  Icon: ComponentType;
  defaultStyle: Style;
  canAcceptChild: () => boolean;
  // Should children of the component be editable?
  // Should only be possible for components like paragraph, heading etc.
  isContentEditable: boolean;
  // Components that render inside text editor only.
  isInlineOnly: boolean;
  // Should be listed in the components list.
  isListed: boolean;
  label: string;
  children: Array<string>;
};

import { customComponents as baseCustomComponents } from "@webstudio-is/react-sdk";
import { wrapLinkComponent } from "./link";

export const customComponents = {
  ...baseCustomComponents,
  Link: wrapLinkComponent(baseCustomComponents.Link),
  RichTextLink: wrapLinkComponent(baseCustomComponents.RichTextLink),
};

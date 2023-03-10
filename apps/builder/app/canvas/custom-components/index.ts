import { customComponents as baseCustomComponents } from "@webstudio-is/react-sdk";
import { wrapLinkComponent } from "./link";

export const customComponents = {
  ...baseCustomComponents,
  Link: wrapLinkComponent(baseCustomComponents.Link),
  LinkBlock: wrapLinkComponent(baseCustomComponents.LinkBlock),
  RichTextLink: wrapLinkComponent(baseCustomComponents.RichTextLink),
};

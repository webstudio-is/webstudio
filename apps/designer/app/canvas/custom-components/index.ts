import { customComponents } from "@webstudio-is/react-sdk";
import { wrapLinkComponent } from "./link";

export default {
  ...customComponents,
  Link: wrapLinkComponent(customComponents.Link),
  RichTextLink: wrapLinkComponent(customComponents.RichTextLink),
};

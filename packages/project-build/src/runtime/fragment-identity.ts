import type { WebstudioFragment } from "@webstudio-is/sdk";

export const ambiguousFormClipboardMessage =
  "This copied Form uses an older format that cannot identify its component. Copy it again in the updated Builder, then paste.";

export const hasAmbiguousFormInstance = (
  fragment: Pick<WebstudioFragment, "instances">
) => fragment.instances.some((instance) => instance.component === "Form");

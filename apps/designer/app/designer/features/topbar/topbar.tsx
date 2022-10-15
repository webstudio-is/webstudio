import type { Publish } from "~/shared/pubsub";
import { darkTheme, Flex, type CSS } from "@webstudio-is/design-system";
import type { Config } from "~/config";
import { PreviewButton } from "./preview";
import { ShareButton } from "./share";
import { PublishButton } from "./publish";
import { SyncStatus } from "./sync-status";
import { Menu } from "./menu";
import { Breakpoints } from "../breakpoints";
import type { Project } from "@webstudio-is/project";

type TopbarProps = {
  config: Config;
  css: CSS;
  project: Project;
  publish: Publish;
  previewUrl: string;
};
export const Topbar = ({
  config,
  css,
  project,
  publish,
  previewUrl,
}: TopbarProps) => {
  return (
    <Flex
      className={darkTheme}
      as="header"
      align="center"
      justify="between"
      css={{
        bc: "$loContrast",
        height: "$sizes$7",
        "[data-theme=dark] &": {
          boxShadow: "inset 0 -1px 0 0 $colors$panelOutline",
        },
        // @todo: uhh, setting this on any focused child element? lets see what's the use case and why its necessary to override vs. not having it in the first place
        "& :focus": {
          boxShadow: "none",
        },
        "& > *": {
          height: "100%",
        },
        "& button": {
          borderRadius: "0",
        },
        ...css,
      }}
    >
      <Menu config={config} publish={publish} />
      <Breakpoints publish={publish} />
      <Flex
        align="center"
        css={{
          "& > *": {
            height: "inherit",
            width: "auto",
            padding: "0 $2",
          },
        }}
      >
        <SyncStatus />
        <PreviewButton publish={publish} />
        <ShareButton url={previewUrl} />
        <PublishButton project={project} />
      </Flex>
    </Flex>
  );
};

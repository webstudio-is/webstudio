import type { Publish } from "~/shared/pubsub";
import { darkTheme, Flex, type CSS } from "@webstudio-is/design-system";
import { PreviewButton } from "./preview";
import { ShareButton } from "./share";
import { PublishButton } from "./publish";
import { SyncStatus } from "./sync-status";
import { Menu } from "./menu";
import { Breakpoints } from "../breakpoints";
import type { Project } from "@webstudio-is/project";
import { theme } from "@webstudio-is/design-system";

type TopbarProps = {
  css: CSS;
  project: Project;
  publish: Publish;
  previewUrl: string;
};
export const Topbar = ({ css, project, publish, previewUrl }: TopbarProps) => {
  return (
    <Flex
      className={darkTheme}
      as="header"
      align="center"
      justify="between"
      css={{
        bc: theme.colors.loContrast,
        height: theme.spacing[17],
        "[data-theme=dark] &": {
          boxShadow: `inset 0 -1px 0 0 ${theme.colors.panelOutline}`,
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
      <Menu publish={publish} />
      <Breakpoints />
      <Flex
        align="center"
        css={{
          "& > *": {
            height: "inherit",
            width: "auto",
            padding: `0 ${theme.spacing[5]}`,
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

import type { Project, Publish } from "@webstudio-is/sdk";
import { Flex, type CSS } from "~/shared/design-system";
import type { Config } from "~/config";
import { PreviewButton } from "./preview";
import { ShareButton } from "./share";
import { PublishButton } from "./publish";
import { SyncStatus } from "./sync-status";
import { Menu } from "./menu";
import { Breakpoints } from "../breakpoints";

type TopbarProps = {
  config: Config;
  css: CSS;
  project: Project;
  publish: Publish;
};

export const Topbar = ({ config, css, project, publish }: TopbarProps) => {
  return (
    <Flex
      as="header"
      align="center"
      justify="between"
      css={{
        p: "$1",
        bc: "$loContrast",
        borderBottom: "1px solid $slate8",
        ...css,
      }}
    >
      <Menu config={config} publish={publish} />
      <Breakpoints publish={publish} />
      <Flex gap="1" align="center">
        <SyncStatus />
        <PreviewButton publish={publish} />
        <ShareButton path={config.previewPath} project={project} />
        <PublishButton project={project} />
      </Flex>
    </Flex>
  );
};

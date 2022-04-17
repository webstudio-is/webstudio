import type { Project } from "@webstudio-is/sdk";
import { Flex, type CSS } from "~/shared/design-system";
import type { Config } from "~/config";
import { Preview } from "./preview";
import { Share } from "./share";
import { Publish } from "./publish";
import { SyncStatus } from "./sync-status";
import { Menu } from "./menu";
import { type Publish as PublishOnCanvas } from "../../shared/canvas-iframe";

type TopbarProps = {
  config: Config;
  css: CSS;
  project: Project;
  publish: PublishOnCanvas;
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
      <Preview publish={publish} />
      <Flex gap="1" align="center">
        <SyncStatus />
        <Share path={config.previewPath} project={project} />
        <Publish project={project} />
      </Flex>
    </Flex>
  );
};

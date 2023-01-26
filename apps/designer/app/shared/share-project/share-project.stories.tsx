import type { ComponentStory } from "@storybook/react";
import { Panel } from "@webstudio-is/design-system";
import { ShareProject } from "./share-project2";

export default {
  component: ShareProject,
};

const links = [
  {
    url: "https://www.google.com",
    name: "Google",
  },
];

export const Share: ComponentStory<typeof ShareProject> = () => {
  return (
    <Panel css={{ width: "max-content" }}>
      <ShareProject links={links} />
    </Panel>
  );
};

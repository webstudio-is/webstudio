import type { ComponentStory } from "@storybook/react";
import { Panel } from "@webstudio-is/design-system";
import { useState } from "react";
import { ShareProject } from "./share-project2";

export default {
  component: ShareProject,
};

const initialLinks = [
  {
    url: "https://url1.com",
    name: "View Only",
    permission: "view" as const,
  },
  {
    url: "https://url2.com",
    name: "View and Edit",
    permission: "edit" as const,
  },
  {
    url: "https://url3.com",
    name: "Build",
    permission: "build" as const,
  },
];

export const Share: ComponentStory<typeof ShareProject> = () => {
  const [links, setLinks] = useState(initialLinks);
  return (
    <Panel css={{ width: "max-content" }}>
      <ShareProject
        links={links}
        onChange={(updatedLink) => {
          setLinks(
            links.map((link) =>
              link.url === updatedLink.url ? updatedLink : link
            )
          );
        }}
      />
    </Panel>
  );
};

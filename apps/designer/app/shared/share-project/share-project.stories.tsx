import { v4 as uuid } from "uuid";
import type { ComponentStory } from "@storybook/react";
import { Button } from "@webstudio-is/design-system";
import { useState } from "react";
import { type LinkOptions, ShareProject } from "./share-project2";

export default {
  component: ShareProject,
};

const initialLinks: Array<LinkOptions> = [
  {
    url: `https://google.com/${uuid()}`,
    name: "View Only",
    permission: "view",
  },
  {
    url: `https://google.com/${uuid()}`,
    name: "View and Edit",
    permission: "edit",
  },
  {
    url: `https://google.com/${uuid()}`,
    name: "Build",
    permission: "build",
  },
];

const useShareProject = (initialLinks: Array<LinkOptions> = []) => {
  const [links, setLinks] = useState(initialLinks);

  const onChange = (updatedLink: LinkOptions) => {
    setLinks(
      links.map((link) => (link.url === updatedLink.url ? updatedLink : link))
    );
  };
  const onDelete = (deletedLink: LinkOptions) => {
    setLinks(links.filter((link) => link.url !== deletedLink.url));
  };
  const onCreate = () => {
    setLinks([
      ...links,
      {
        url: `https://google.com/${uuid()}`,
        name: "Custom Link",
        permission: "view",
      },
    ]);
  };
  return { links, onChange, onDelete, onCreate };
};

export const Empty: ComponentStory<typeof ShareProject> = () => {
  const props = useShareProject();
  return (
    <ShareProject {...props} isOpen>
      <Button>Share</Button>
    </ShareProject>
  );
};

export const WithLinks: ComponentStory<typeof ShareProject> = () => {
  const props = useShareProject(initialLinks);
  return (
    <ShareProject {...props} isOpen>
      <Button>Share</Button>
    </ShareProject>
  );
};

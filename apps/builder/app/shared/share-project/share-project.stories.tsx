import { v4 as uuid } from "uuid";
import type { ComponentStory } from "@storybook/react";
import {
  Button,
  FloatingPanelPopover,
  FloatingPanelPopoverContent,
  FloatingPanelPopoverTrigger,
} from "@webstudio-is/design-system";
import { useEffect, useState } from "react";
import { type LinkOptions, ShareProject } from "./share-project";

export default {
  component: ShareProject,
};

const initialLinks: Array<LinkOptions> = [
  {
    token: uuid(),
    name: "View Only",
    relation: "viewers",
  },
  {
    token: uuid(),
    name: "View and Edit",
    relation: "editors",
  },
  {
    token: uuid(),
    name: "Build",
    relation: "builders",
  },
];

const INITIAL_LINKS: LinkOptions[] = [];

const useShareProject = (
  initialLinks: Array<LinkOptions> = INITIAL_LINKS,
  async = false
) => {
  const [links, setLinks] = useState(async ? [] : initialLinks);

  const onChange = (updatedLink: LinkOptions) => {
    setLinks(
      links.map((link) =>
        link.token === updatedLink.token ? updatedLink : link
      )
    );
  };
  const onDelete = (deletedLink: LinkOptions) => {
    setLinks(links.filter((link) => link.token !== deletedLink.token));
  };
  const onCreate = () => {
    setLinks([
      ...links,
      {
        token: uuid(),
        name: "Custom Link",
        relation: "viewers",
      },
    ]);
  };

  useEffect(() => {
    if (async) {
      setTimeout(() => {
        setLinks(initialLinks);
      }, 1000);
      return;
    }

    setLinks(initialLinks);
  }, [async, initialLinks]);

  return { links, onChange, onDelete, onCreate };
};

export const Empty: ComponentStory<typeof ShareProject> = () => {
  const props = useShareProject();
  return (
    <FloatingPanelPopover modal open>
      <FloatingPanelPopoverTrigger asChild>
        <Button>Share</Button>
      </FloatingPanelPopoverTrigger>

      <FloatingPanelPopoverContent>
        <ShareProject
          {...props}
          hasProPlan={false}
          isPending={false}
          builderUrl={({ authToken, mode }) =>
            `https://blabla.com/${authToken}/${mode}`
          }
        ></ShareProject>
      </FloatingPanelPopoverContent>
    </FloatingPanelPopover>
  );
};

export const WithLinks: ComponentStory<typeof ShareProject> = () => {
  const props = useShareProject(initialLinks);
  return (
    <FloatingPanelPopover modal open>
      <FloatingPanelPopoverTrigger asChild>
        <Button>Share</Button>
      </FloatingPanelPopoverTrigger>

      <FloatingPanelPopoverContent>
        <ShareProject
          {...props}
          hasProPlan={false}
          isPending={false}
          builderUrl={({ authToken, mode }) =>
            `https://blabla.com/${authToken}/${mode}`
          }
        ></ShareProject>
      </FloatingPanelPopoverContent>
    </FloatingPanelPopover>
  );
};

export const WithAsyncLinks: ComponentStory<typeof ShareProject> = () => {
  const props = useShareProject(initialLinks, true);
  return (
    <FloatingPanelPopover modal open>
      <FloatingPanelPopoverTrigger asChild>
        <Button>Share</Button>
      </FloatingPanelPopoverTrigger>

      <FloatingPanelPopoverContent>
        <ShareProject
          {...props}
          hasProPlan={false}
          isPending={false}
          builderUrl={({ authToken, mode }) =>
            `https://blabla.com/${authToken}/${mode}`
          }
        ></ShareProject>
      </FloatingPanelPopoverContent>
    </FloatingPanelPopover>
  );
};

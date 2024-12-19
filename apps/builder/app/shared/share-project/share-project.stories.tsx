import type { StoryFn } from "@storybook/react";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@webstudio-is/design-system";
import { useEffect, useState } from "react";
import { type LinkOptions, ShareProject } from "./share-project";

export default {
  component: ShareProject,
};

const initialLinks: Array<LinkOptions> = [
  {
    token: crypto.randomUUID(),
    name: "View Only",
    relation: "viewers",
    canClone: false,
    canCopy: false,
    canPublish: false,
  },
  {
    token: crypto.randomUUID(),
    name: "View and Edit",
    relation: "editors",
    canClone: false,
    canCopy: false,
    canPublish: false,
  },
  {
    token: crypto.randomUUID(),
    name: "Build",
    relation: "builders",
    canClone: false,
    canCopy: false,
    canPublish: false,
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
        token: crypto.randomUUID(),
        name: "Custom Link",
        relation: "viewers",
        canClone: false,
        canCopy: false,
        canPublish: false,
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

export const Empty: StoryFn<typeof ShareProject> = () => {
  const props = useShareProject();
  return (
    <Popover modal open>
      <PopoverTrigger asChild>
        <Button>Share</Button>
      </PopoverTrigger>

      <PopoverContent>
        <ShareProject
          {...props}
          hasProPlan={false}
          isPending={false}
          builderUrl={({ authToken, mode }) =>
            `https://blabla.com/${authToken}/${mode}`
          }
        ></ShareProject>
      </PopoverContent>
    </Popover>
  );
};

export const WithLinks: StoryFn<typeof ShareProject> = () => {
  const props = useShareProject(initialLinks);
  return (
    <Popover modal open>
      <PopoverTrigger asChild>
        <Button>Share</Button>
      </PopoverTrigger>

      <PopoverContent>
        <ShareProject
          {...props}
          hasProPlan={false}
          isPending={false}
          builderUrl={({ authToken, mode }) =>
            `https://blabla.com/${authToken}/${mode}`
          }
        ></ShareProject>
      </PopoverContent>
    </Popover>
  );
};

export const WithAsyncLinks: StoryFn<typeof ShareProject> = () => {
  const props = useShareProject(initialLinks, true);
  return (
    <Popover modal open>
      <PopoverTrigger asChild>
        <Button>Share</Button>
      </PopoverTrigger>

      <PopoverContent>
        <ShareProject
          {...props}
          hasProPlan={false}
          isPending={false}
          builderUrl={({ authToken, mode }) =>
            `https://blabla.com/${authToken}/${mode}`
          }
        ></ShareProject>
      </PopoverContent>
    </Popover>
  );
};

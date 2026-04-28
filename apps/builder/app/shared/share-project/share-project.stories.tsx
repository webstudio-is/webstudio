import {
  Button,
  Flex,
  Popover,
  PopoverContent,
  PopoverTrigger,
  StorySection,
} from "@webstudio-is/design-system";
import { useEffect, useState } from "react";
import { nanoid } from "nanoid";
import {
  type LinkOptions,
  ShareProject as ShareProjectComponent,
} from "./share-project";

export default {
  title: "Share Project",
  component: ShareProjectComponent,
};

const initialLinks: Array<LinkOptions> = [
  {
    token: nanoid(),
    name: "View Only",
    relation: "viewers",
    canClone: false,
    canCopy: false,
    canPublish: false,
  },
  {
    token: nanoid(),
    name: "View and Edit",
    relation: "editors",
    canClone: false,
    canCopy: false,
    canPublish: false,
  },
  {
    token: nanoid(),
    name: "Build",
    relation: "builders",
    canClone: false,
    canCopy: false,
    canPublish: false,
  },
];

const INITIAL_LINKS: LinkOptions[] = [];

const useShareProject = (
  links: Array<LinkOptions> = INITIAL_LINKS,
  async = false
) => {
  const [currentLinks, setLinks] = useState(async ? [] : links);

  const onChange = (updatedLink: LinkOptions) => {
    setLinks(
      currentLinks.map((link) =>
        link.token === updatedLink.token ? updatedLink : link
      )
    );
  };
  const onDelete = (deletedLink: LinkOptions) => {
    setLinks(currentLinks.filter((link) => link.token !== deletedLink.token));
  };
  const onCreate = () => {
    setLinks([
      ...currentLinks,
      {
        token: nanoid(),
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
        setLinks(links);
      }, 1000);
      return;
    }

    setLinks(links);
  }, [async, links]);

  return { links: currentLinks, onChange, onDelete, onCreate };
};

const builderUrl = ({ authToken, mode }: { authToken: string; mode: string }) =>
  `https://blabla.com/${authToken}/${mode}`;

const ShareProjectPopover = ({
  label,
  linkOptions,
  async,
}: {
  label: string;
  linkOptions?: Array<LinkOptions>;
  async?: boolean;
}) => {
  const props = useShareProject(linkOptions, async);
  return (
    <Popover modal open>
      <PopoverTrigger asChild>
        <Button>{label}</Button>
      </PopoverTrigger>
      <PopoverContent>
        <ShareProjectComponent
          {...props}
          allowAdditionalPermissions={false}
          isFreePlan={true}
          isPending={false}
          builderUrl={builderUrl}
        />
      </PopoverContent>
    </Popover>
  );
};

export const ShareProject = () => (
  <StorySection title="Share Project">
    <Flex gap="9" css={{ padding: 100 }}>
      <ShareProjectPopover label="Empty" />
      <ShareProjectPopover label="With Links" linkOptions={initialLinks} />
    </Flex>
  </StorySection>
);

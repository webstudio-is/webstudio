import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { builderUrl } from "~/shared/router-utils";
import { trpcClient } from "../trpc/trpc-client";
import {
  MARKETPLACE_SHARE_LINK,
  ShareProject,
  type LinkOptions,
} from "./share-project";

const useShareProjectContainer = (projectId: string) => {
  const {
    data,
    load,
    state: loadState,
  } = trpcClient.authorizationToken.findMany.useQuery();
  const { send: createToken, state: createState } =
    trpcClient.authorizationToken.create.useMutation();
  const { send: removeToken, state: removeState } =
    trpcClient.authorizationToken.remove.useMutation();
  const { send: updateToken, state: updateState } =
    trpcClient.authorizationToken.update.useMutation();
  const [links, setLinks] = useState(data ?? []);
  const deletingLinks = useRef(new Set<string>());

  useEffect(() => {
    load({ projectId }, (data) => {
      // prevent user from editing the auto-generated market place share token
      const filterLinks = data.filter(
        (link) => link.name !== MARKETPLACE_SHARE_LINK
      );

      setLinks(filterLinks ?? []);
    });
  }, [load, projectId]);

  const handleChangeDebounced = useDebouncedCallback((link: LinkOptions) => {
    // Link is about to get deleted, no need to update.
    if (deletingLinks.current.has(link.token)) {
      return;
    }
    const updatedLink = {
      projectId: projectId,
      ...link,
    };
    const updatedLinks = links.map((currentLink) => {
      if (currentLink.token === updatedLink.token) {
        return { ...currentLink, ...updatedLink };
      }
      return currentLink;
    });
    // Optimistically set the links, otherwise checkbox will not move until we fetch an updated list.
    setLinks(updatedLinks);
    updateToken(updatedLink);
  }, 100);

  const handleDelete = (link: LinkOptions) => {
    deletingLinks.current.add(link.token);

    const updatedLinks = links.filter((currentLink) => {
      return currentLink.token !== link.token;
    });

    setLinks(updatedLinks);

    removeToken({ projectId: projectId, token: link.token });
  };

  const handleCreate = () => {
    createToken(
      {
        projectId: projectId,
        relation: "viewers",
        name: "Custom link",
      },
      () => {
        load({ projectId }, (data) => {
          const filterLinks = data.filter(
            (link) => link.name !== MARKETPLACE_SHARE_LINK
          );
          setLinks(filterLinks ?? []);
        });
      }
    );
  };

  const isPending =
    loadState !== "idle" ||
    createState !== "idle" ||
    removeState !== "idle" ||
    updateState !== "idle";

  return {
    links,
    handleChangeDebounced,
    handleDelete,
    handleCreate,
    isPending,
  };
};

type ShareButtonProps = {
  projectId: string;
  hasProPlan: boolean;
};

/**
 * we place the logic inside Popover so that the fetcher does not exist outside of it.
 * Then remix will not call `trpc.findMany.useQuery` if Popover is closed
 */
export const ShareProjectContainer = ({
  projectId,
  hasProPlan,
}: ShareButtonProps) => {
  const {
    links,
    handleChangeDebounced,
    handleDelete,
    handleCreate,
    isPending,
  } = useShareProjectContainer(projectId);

  return (
    <ShareProject
      hasProPlan={hasProPlan}
      links={links}
      onChange={handleChangeDebounced}
      onDelete={handleDelete}
      onCreate={handleCreate}
      isPending={isPending}
      builderUrl={({ authToken, mode }) =>
        builderUrl({
          projectId,
          origin: window.location.origin,
          authToken,
          mode,
        })
      }
    />
  );
};

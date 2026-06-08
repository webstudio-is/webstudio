import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { builderUrl } from "~/shared/router-utils";
import { trpcClient } from "../trpc/trpc-client";
import { ShareProject, type LinkOptions } from "./share-project";
import { useStore } from "@nanostores/react";
import { $permissions, $purchases } from "../nano-states";

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
  const [isChangingLink, setIsChangingLink] = useState(false);
  const deletingLinks = useRef(new Set<string>());

  useEffect(() => {
    load({ projectId }, (data) => {
      setLinks(data ?? []);
    });
  }, [load, projectId]);

  const handleChangeDebounced = useDebouncedCallback((link: LinkOptions) => {
    // Link is about to get deleted, no need to update.
    if (deletingLinks.current.has(link.token)) {
      setIsChangingLink(false);
      return;
    }
    const updatedLink = {
      projectId: projectId,
      ...link,
    };
    setLinks((links) => {
      return links.map((currentLink) => {
        if (currentLink.token === updatedLink.token) {
          return { ...currentLink, ...updatedLink };
        }
        return currentLink;
      });
    });
    updateToken(updatedLink, () => {
      load({ projectId }, (data) => {
        setLinks(data ?? []);
        setIsChangingLink(false);
      });
    });
  }, 100);

  const handleChange = (link: LinkOptions) => {
    setIsChangingLink(true);
    handleChangeDebounced(link);
  };

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
          setLinks(data ?? []);
        });
      }
    );
  };

  const isPending =
    loadState !== "idle" ||
    createState !== "idle" ||
    removeState !== "idle" ||
    updateState !== "idle" ||
    isChangingLink;

  return {
    links,
    handleChange,
    handleDelete,
    handleCreate,
    isPending,
  };
};

type ShareButtonProps = {
  projectId: string;
};

/**
 * we place the logic inside Popover so that the fetcher does not exist outside of it.
 * Then remix will not call `trpc.findMany.useQuery` if Popover is closed
 */
export const ShareProjectContainer = ({ projectId }: ShareButtonProps) => {
  const { allowAdditionalPermissions } = useStore($permissions);
  const purchases = useStore($purchases);
  const { links, handleChange, handleDelete, handleCreate, isPending } =
    useShareProjectContainer(projectId);

  return (
    <ShareProject
      allowAdditionalPermissions={allowAdditionalPermissions}
      isFreePlan={purchases.length === 0}
      links={links}
      onChange={handleChange}
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

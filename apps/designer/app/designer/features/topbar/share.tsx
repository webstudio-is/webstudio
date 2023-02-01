import {
  Button,
  FloatingPanelPopover,
  FloatingPanelPopoverContent,
  FloatingPanelPopoverTitle,
  FloatingPanelPopoverTrigger,
  theme,
} from "@webstudio-is/design-system";
import { ShareProject, LinkOptions } from "~/shared/share-project";
import { createTrpcRemixProxy } from "~/shared/remix/trpc-remix-proxy";
import type { AuthorizationTokensRouter } from "@webstudio-is/authorization-token";
import { authorizationTokenPath, designerUrl } from "~/shared/router-utils";
import { useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Project } from "@webstudio-is/prisma-client";

const trpc = createTrpcRemixProxy<AuthorizationTokensRouter>(
  authorizationTokenPath
);

export type ShareButtonProps = {
  projectId: Project["id"];
};

const useShareProjectContainer = (projectId: Project["id"]) => {
  const { data: links, load } = trpc.findMany.useQuery();
  const { send: createToken } = trpc.create.useMutation();
  const { send: removeToken } = trpc.remove.useMutation();
  const { send: updateToken } = trpc.update.useMutation();

  useEffect(() => {
    if (projectId === undefined) {
      return;
    }

    load({ projectId });
  }, [load, projectId]);

  const handleChangeDebounced = useDebouncedCallback((link: LinkOptions) => {
    if (projectId === undefined) {
      return;
    }
    updateToken({
      projectId: projectId,
      token: link.token,
      relation: link.relation,
      name: link.name,
    });
  }, 100);

  const handleDelete = (link: LinkOptions) => {
    if (projectId === undefined) {
      return;
    }

    removeToken({ projectId: projectId, token: link.token });
  };

  const handleCreate = () => {
    if (projectId === undefined) {
      return;
    }

    createToken({
      projectId: projectId,
      relation: "viewers",
      name: "Custom link",
    });
  };

  return {
    links,
    handleChangeDebounced,
    handleDelete,
    handleCreate,
  };
};

/**
 * we place the logic inside Popover so that the fetcher does not exist outside of it.
 * Then remix will not call `trpc.findMany.useQuery` if Popover is closed
 */
export const ShareProjectContainer = ({ projectId }: ShareButtonProps) => {
  const {
    links,
    // handleChange,
    handleChangeDebounced,
    handleDelete,
    handleCreate,
  } = useShareProjectContainer(projectId);

  return (
    <ShareProject
      links={links}
      onChange={handleChangeDebounced}
      onDelete={handleDelete}
      onCreate={handleCreate}
      designerUrl={({ authToken, mode }) =>
        designerUrl({
          projectId,
          origin: window.location.origin,
          authToken,
          mode,
        })
      }
    />
  );
};

export const ShareButton = ({ projectId }: ShareButtonProps) => {
  return (
    <FloatingPanelPopover modal>
      <FloatingPanelPopoverTrigger asChild>
        <Button>Share</Button>
      </FloatingPanelPopoverTrigger>

      <FloatingPanelPopoverContent css={{ zIndex: theme.zIndices[1] }}>
        <ShareProjectContainer projectId={projectId} />
        <FloatingPanelPopoverTitle>Share</FloatingPanelPopoverTitle>
      </FloatingPanelPopoverContent>
    </FloatingPanelPopover>
  );
};

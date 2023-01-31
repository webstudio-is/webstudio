import {
  Button,
  FloatingPanelPopover,
  FloatingPanelPopoverContent,
  FloatingPanelPopoverTitle,
  FloatingPanelPopoverTrigger,
  theme,
  css,
} from "@webstudio-is/design-system";
import { useProject } from "../../shared/nano-states";
import {
  ShareProject,
  LinkOptions,
  type ShareProjectProps,
} from "~/shared/share-project";
import { createTrpcRemixProxy } from "~/shared/remix/trpc-remix-proxy";
import type { AuthorizationTokensRouter } from "@webstudio-is/authorization-token";
import { authorizationTokenPath } from "~/shared/router-utils";
import { useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";

const trpc = createTrpcRemixProxy<AuthorizationTokensRouter>(
  authorizationTokenPath
);

export type ShareButtonProps = {
  designerUrl: ShareProjectProps["designerUrl"];
};

const useShareProjectContainer = () => {
  const { data: links, load } = trpc.findMany.useQuery();
  const { send: createToken } = trpc.create.useMutation();
  const { send: removeToken } = trpc.remove.useMutation();
  const { send: updateToken } = trpc.update.useMutation();

  const [project] = useProject();
  const projectId = project?.id;

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
const ShareProjectContainer = ({ designerUrl }: ShareButtonProps) => {
  const {
    links,
    // handleChange,
    handleChangeDebounced,
    handleDelete,
    handleCreate,
  } = useShareProjectContainer();

  return (
    <ShareProject
      links={links}
      onChange={handleChangeDebounced}
      onDelete={handleDelete}
      onCreate={handleCreate}
      designerUrl={designerUrl}
    />
  );
};

const classZIndex = css({ zIndex: theme.zIndices[1] });

export const ShareButton = ({ designerUrl }: ShareButtonProps) => {
  return (
    <FloatingPanelPopover modal>
      <FloatingPanelPopoverTrigger asChild>
        <Button>Share</Button>
      </FloatingPanelPopoverTrigger>

      <FloatingPanelPopoverContent className={classZIndex()}>
        <ShareProjectContainer designerUrl={designerUrl} />
        <FloatingPanelPopoverTitle>Share</FloatingPanelPopoverTitle>
      </FloatingPanelPopoverContent>
    </FloatingPanelPopover>
  );
};

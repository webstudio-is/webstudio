import { useCallback, useEffect } from "react";
import { useUnmount } from "react-use";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { usePublish, $publisher } from "~/shared/pubsub";
import { useBuilderStore } from "~/shared/sync";
import { CanvasIframe, useReadCanvasRect } from "./features/workspace";
import { $pages, subscribeResources } from "~/shared/nano-states";
import { getBuildUrl } from "~/shared/router-utils";
import { useCopyPaste } from "~/shared/copy-paste";
import { useSyncPageUrl } from "~/shared/pages";
import { subscribeCommands } from "~/builder/shared/commands";
import { CanvasTools } from "./features/workspace/canvas-tools";
import {
  links,
  useInitializeStores,
  type BuilderProps,
} from "./builder-shared";

export { links, type BuilderProps };

export const Builder = (props: BuilderProps) => {
  const { project } = props;
  useInitializeStores(props);

  useEffect(subscribeCommands, []);
  useEffect(subscribeResources, []);

  useUnmount(() => {
    $pages.set(undefined);
  });

  useSyncPageUrl();

  const [publish, publishRef] = usePublish();
  useEffect(() => {
    $publisher.set({ publish });
  }, [publish]);

  useBuilderStore(publish);
  const { onRef: onRefReadCanvas } = useReadCanvasRect();
  // We need to initialize this in both canvas and builder,
  // because the events will fire in either one, depending on where the focus is
  useCopyPaste();
  const iframeRefCallback = useCallback(
    (element: HTMLIFrameElement) => {
      publishRef.current = element;
      onRefReadCanvas(element);
    },
    [publishRef, onRefReadCanvas]
  );

  const canvasUrl = getBuildUrl({
    project,
  });

  return (
    <TooltipProvider>
      <CanvasIframe
        ref={iframeRefCallback}
        src={canvasUrl}
        title={project.title}
        css={{
          height: "100vh",
          width: "100vw",
          backgroundColor: "#fff",
        }}
      />
      <CanvasTools />
    </TooltipProvider>
  );
};

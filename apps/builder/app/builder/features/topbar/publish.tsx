import { useEffect, useState } from "react";
import { useFetcher } from "@remix-run/react";
import { ExternalLinkIcon } from "@webstudio-is/icons";
import {
  Text,
  Button,
  Flex,
  Label,
  Link,
  DeprecatedTextField,
  useId,
  Tooltip,
  FloatingPanelPopover,
  FloatingPanelAnchor,
  FloatingPanelPopoverTrigger,
  FloatingPanelPopoverContent,
  FloatingPanelPopoverTitle,
} from "@webstudio-is/design-system";
import { useIsPublishDialogOpen } from "../../shared/nano-states";
import type { Project } from "@webstudio-is/project";
import { getPublishedUrl, restPublishPath } from "~/shared/router-utils";
import { theme } from "@webstudio-is/design-system";
import { useAuthPermit } from "~/shared/nano-states";
type PublishButtonProps = { project: Project };

const Content = ({ project }: PublishButtonProps) => {
  const id = useId();
  const fetcher = useFetcher();
  const [url, setUrl] = useState<string>();
  const domain = fetcher.data?.domain || project.domain;

  useEffect(() => {
    setUrl(getPublishedUrl(domain));
  }, [domain]);

  return (
    <Flex
      direction="column"
      css={{
        padding: theme.spacing[9],
      }}
    >
      <fetcher.Form method="post" action={restPublishPath()}>
        <Flex direction="column" gap="2">
          {url !== undefined && (
            <Link
              href={url}
              target="_blank"
              css={{
                display: "flex",
                gap: theme.spacing[0],
              }}
            >
              <Text truncate>{new URL(getPublishedUrl(domain)).host}</Text>
              <ExternalLinkIcon />
            </Link>
          )}
          <Flex gap="2" align="center">
            <input type="hidden" name="projectId" value={project.id} />
            <Label htmlFor={id}>Domain:</Label>
            <DeprecatedTextField id={id} name="domain" defaultValue={domain} />
          </Flex>
          {fetcher.data?.errors !== undefined && (
            <Text color="destructive">{fetcher.data?.errors}</Text>
          )}
          <Flex css={{ paddingTop: theme.spacing["2"] }}>
            <Button
              state={fetcher.state !== "idle" ? "pending" : "auto"}
              type="submit"
              css={{ flexGrow: 1 }}
            >
              {fetcher.state !== "idle" ? "Publishing" : "Publish"}
            </Button>
          </Flex>
        </Flex>
      </fetcher.Form>
    </Flex>
  );
};

export const PublishButton = ({ project }: PublishButtonProps) => {
  const [isOpen, setIsOpen] = useIsPublishDialogOpen();
  const [authPermit] = useAuthPermit();

  const isPublishDisabled = authPermit !== "own";
  const tooltipContent = isPublishDisabled
    ? "Only owner can publish projects"
    : undefined;

  return (
    <FloatingPanelPopover modal open={isOpen} onOpenChange={setIsOpen}>
      <FloatingPanelAnchor>
        <Tooltip side="bottom" content={tooltipContent}>
          <FloatingPanelPopoverTrigger asChild>
            <Button disabled={isPublishDisabled} color="positive">
              Publish
            </Button>
          </FloatingPanelPopoverTrigger>
        </Tooltip>
      </FloatingPanelAnchor>

      <FloatingPanelPopoverContent css={{ zIndex: theme.zIndices[1] }}>
        <Content project={project} />
        <FloatingPanelPopoverTitle>Publish</FloatingPanelPopoverTitle>
      </FloatingPanelPopoverContent>
    </FloatingPanelPopover>
  );
};

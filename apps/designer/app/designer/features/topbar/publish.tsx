import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { RocketIcon, ExternalLinkIcon } from "@webstudio-is/icons";
import {
  Button,
  Flex,
  Popover,
  PopoverContent,
  PopoverTrigger,
  TextField,
  __DEPRECATED__Text,
  Label,
  Link,
  useId,
} from "@webstudio-is/design-system";
import { useIsPublishDialogOpen } from "../../shared/nano-states";
import env from "~/shared/env";
import * as db from "~/shared/db";

type PublishButtonProps = { project: db.project.Project };

const getHost = () => {
  if (env.PUBLISHER_ENDPOINT && env.PUBLISHER_HOST) {
    return env.PUBLISHER_HOST;
  }
  // We use location.host to get the hostname and port in development mode and to not break local testing.
  return env.DESIGNER_HOST || location.host;
};

const Content = ({ project }: PublishButtonProps) => {
  const id = useId();
  const fetcher = useFetcher();
  const [url, setUrl] = useState<string>();
  const domain = fetcher.data?.domain || project.domain;

  useEffect(() => {
    if (typeof location !== "object" || !domain) {
      return;
    }
    setUrl(`${location.protocol}//${domain}.${getHost()}`);
  }, [domain]);

  return (
    <PopoverContent
      css={{ padding: "$3" }}
      onFocusOutside={(event) => {
        // Used to prevent closing when opened from the main dropdown menu
        event.preventDefault();
      }}
    >
      <fetcher.Form method="post" action="/rest/publish">
        <Flex direction="column" gap="2">
          {url !== undefined && (
            <Link
              href={url}
              target="_blank"
              css={{
                display: "flex",
                gap: "$0",
              }}
            >
              <__DEPRECATED__Text
                css={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {`${domain}.${getHost()}`}{" "}
              </__DEPRECATED__Text>
              <ExternalLinkIcon />
            </Link>
          )}
          <Flex gap="2" align="center">
            <input type="hidden" name="projectId" value={project.id} />
            <Label htmlFor={id}>Domain:</Label>
            <TextField id={id} name="domain" defaultValue={domain} />
          </Flex>
          {fetcher.data?.errors !== undefined && (
            <__DEPRECATED__Text variant="red">
              {fetcher.data?.errors}
            </__DEPRECATED__Text>
          )}
          {fetcher.state === "idle" ? (
            <Button variant="blue" type="submit">
              Publish
            </Button>
          ) : (
            <Button disabled>Publishing…</Button>
          )}
        </Flex>
      </fetcher.Form>
    </PopoverContent>
  );
};

export const PublishButton = ({ project }: PublishButtonProps) => {
  const [isOpen, setIsOpen] = useIsPublishDialogOpen();
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild aria-label="Publish">
        <Button ghost css={{ display: "flex", gap: "$1" }}>
          <RocketIcon />
          <__DEPRECATED__Text size="1">Publish</__DEPRECATED__Text>
        </Button>
      </PopoverTrigger>
      <Content project={project} />
    </Popover>
  );
};

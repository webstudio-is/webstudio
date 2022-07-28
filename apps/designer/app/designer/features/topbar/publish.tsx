import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { useId } from "@radix-ui/react-id";
import { RocketIcon, ExternalLinkIcon } from "@webstudio-is/icons";
import { type Project } from "@webstudio-is/prisma-client";
import {
  Button,
  Flex,
  Popover,
  PopoverContent,
  PopoverTrigger,
  TextField,
  Text,
  Label,
  Link,
} from "~/shared/design-system";
import { useIsPublishDialogOpen } from "../../shared/nano-states";
import env from "~/shared/env";

type PublishButtonProps = { project: Project };

const host = () => {
  if (env.EDGE_DEPLOYMENT && env.EDGE_DOMAIN !== "") {
    return env.EDGE_DOMAIN;
  }
  if (typeof location === "object") {
    if (location.host.includes("webstudio.is")) return "wstd.io";
    else return location.host;
  }
  return "";
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
    setUrl(`${location.protocol}//${domain}.${host()}`);
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
              <Text
                css={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {`${domain}.${host()}`}{" "}
              </Text>
              <ExternalLinkIcon />
            </Link>
          )}
          <Flex gap="2" align="center">
            <input type="hidden" name="projectId" value={project.id} />
            <Label htmlFor={id}>Domain:</Label>
            <TextField id={id} name="domain" defaultValue={domain} />
          </Flex>
          {fetcher.data?.errors !== undefined && (
            <Text variant="red">{fetcher.data?.errors}</Text>
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
          <Text size="1">Publish</Text>
        </Button>
      </PopoverTrigger>
      <Content project={project} />
    </Popover>
  );
};

import { useState, useEffect } from "react";
import { useFetcher } from "remix";
import { useId } from "@radix-ui/react-id";
import { RocketIcon, ExternalLinkIcon } from "~/shared/icons";
import type { Project } from "~/shared/db";
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
import { useIsPublishDialogOpen } from "../nano-values";

type PublishProps = { project: Project };

const Content = ({ project }: PublishProps) => {
  const id = useId();
  const fetcher = useFetcher();
  const [url, setUrl] = useState<string>();
  const domain = fetcher.data?.domain || project.domain;

  useEffect(() => {
    if (typeof location !== "object" || !domain) {
      return;
    }
    setUrl(`${location.protocol}//${domain}.${location.host}`);
  }, [project.domain, fetcher.data?.domain]);

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
                {`${domain}.${location.host}`}{" "}
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

export const Publish = ({ project }: PublishProps) => {
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

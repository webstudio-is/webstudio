import { useFetcher } from "@remix-run/react";
import {
  Button,
  Flex,
  Label,
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverPortal,
  PopoverTrigger,
  TextArea,
  TextField,
} from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import { type FormEvent, useState } from "react";
import { createValueContainer, useValue } from "react-nano-state";
import { restTokensPath } from "~/shared/router-utils";
import { CollapsibleSection } from "../inspector";
import { groups } from "./groups";
import type {
  DesignToken,
  DesignTokensGroup,
  GroupName,
  TokenName,
} from "./schema";

const initialTokenGroups = groups.reduce(
  (acc: DesignTokensGroup, { group }) => {
    acc[group] = {};
    return acc;
  },
  {}
);

const tokenGroupsContainer =
  createValueContainer<DesignTokensGroup>(initialTokenGroups);

const TokenEditor = ({
  group,
  name,
}: {
  group: GroupName;
  name?: TokenName;
}) => {
  const [open, setOpen] = useState(false);
  const isNew = name === undefined;
  const fetcher = useFetcher<any>();
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    //fetcher.submit(event.target as HTMLFormElement);
  };
  const isSubmitting = fetcher.state !== "idle";

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        asChild
        aria-label={isNew ? "Create Token" : "Edit Token"}
      >
        <Button
          ghost
          onClick={(event) => {
            event.preventDefault();
            setOpen(true);
          }}
        >
          <PlusIcon />
        </Button>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent align="end" css={{ zIndex: "$1" }}>
          <form onSubmit={handleSubmit} method="post" action={restTokensPath()}>
            <Flex direction="column" gap="2" css={{ padding: "$spacing$7" }}>
              <Label htmlFor="name">Name</Label>
              <TextField id="name" name="$name" />
              <Label htmlFor="value">Value</Label>
              <TextField id="value" name="$value" />
              <Label htmlFor="description">Description</Label>
              <TextArea id="description" name="$description" />
              {isNew && (
                <Button
                  type="submit"
                  variant="blue"
                  state={isSubmitting ? "waiting" : undefined}
                >
                  Create
                </Button>
              )}
            </Flex>
          </form>
          <PopoverHeader title={isNew ? "New Token" : name} />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};

const TokenItem = ({ token }: { token: DesignToken }) => {
  return <div>{token.$value}</div>;
};

export const DesignTokensManager = () => {
  const [tokenGroups] = useValue(tokenGroupsContainer);

  return (
    <>
      {Object.keys(tokenGroups).map((group) => {
        const tokens = tokenGroups[group];
        return (
          <CollapsibleSection
            label={group}
            key={group}
            rightSlot={<TokenEditor group={group} />}
          >
            <>
              {Object.keys(tokens).map((name) => {
                return <TokenItem token={tokens[name]} key={name} />;
              })}
            </>
          </CollapsibleSection>
        );
      })}
    </>
  );
};

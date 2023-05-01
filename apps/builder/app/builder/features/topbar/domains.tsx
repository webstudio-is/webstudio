import {
  Flex,
  Button,
  InputField,
  Label,
  theme,
  SectionTitle,
  Separator,
  Text,
  SectionTitleButton,
  Tooltip,
} from "@webstudio-is/design-system";
import type { DomainRouter } from "@webstudio-is/domain/index.server";
import { validateDomain } from "@webstudio-is/domain";
import type { Project } from "@webstudio-is/project";
import { useEffect, useState } from "react";
import { createTrpcRemixProxy } from "~/shared/remix/trpc-remix-proxy";
import { builderDomainsPath } from "~/shared/router-utils";
import { CollapsibleSectionBase } from "~/builder/shared/collapsible-section";

import { AlertIcon, PlusIcon } from "@webstudio-is/icons";

const trpc = createTrpcRemixProxy<DomainRouter>(builderDomainsPath);

type DomainsProps = {
  projectId: Project["id"];
};

const AddDomain = ({ projectId }: DomainsProps) => {
  const { send: start, data: startData, state } = trpc.start.useMutation();
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (startData?.success === false) {
      setError(startData.error);
      return;
    }
    // reset input
    setDomain("");
  }, [startData]);

  return (
    <>
      <InputField
        placeholder="Domain"
        value={domain}
        onChange={(event) => {
          setError(undefined);
          setDomain(event.target.value);
        }}
        color={error !== undefined ? "error" : undefined}
      />
      {error !== undefined && (
        <Label
          css={{
            overflowWrap: "anywhere",
            color: theme.colors.foregroundDestructive,
          }}
        >
          <div>{error}</div>
        </Label>
      )}

      <Button
        disabled={state !== "idle"}
        color="neutral"
        css={{ width: "100%", flexShrink: 0 }}
        onClick={() => {
          // validateDomain
          const validationResult = validateDomain(domain);
          if (validationResult.success === false) {
            setError(validationResult.error);
            return;
          }

          start({ domain, projectId });
        }}
      >
        Add Domain
      </Button>
    </>
  );
};

const DomainItem = (props: {
  projectDomain: {
    domain: {
      domain: string;
    };
    txtRecord: string;
    verified: boolean;
  };
}) => {
  const [open, setOpen] = useState(false);
  return (
    <CollapsibleSectionBase
      label={props.projectDomain.domain.domain}
      fullWidth
      isOpen={open}
      onOpenChange={setOpen}
      trigger={
        <SectionTitle
          suffix={
            <Flex
              onClick={() => setOpen(!open)}
              align={"center"}
              justify={"center"}
              css={{
                cursor: "pointer",
                color: theme.colors.foregroundDestructive,
                width: theme.spacing[12],
                height: theme.spacing[12],
              }}
            >
              <Tooltip
                content={"Domain not verified, expand section to see details"}
              >
                <AlertIcon />
              </Tooltip>
            </Flex>
          }
        >
          <Label>{props.projectDomain.domain.domain}</Label>
        </SectionTitle>
      }
    >
      <Flex
        css={{
          mx: theme.spacing[9],
        }}
        gap={2}
        direction={"column"}
      >
        <Text>
          To proceed with domain setup please add cname dns entry{" "}
          <strong>{"blabla.customers.wstd.io"}</strong> to your domain provider.
          <br />
          Add txt entry blabla{" "}
          <strong>{props.projectDomain.domain.domain}</strong> then click verify
        </Text>

        <Button
          color="neutral"
          css={{ width: "100%", flexShrink: 0 }}
          onClick={() => {}}
        >
          Verify
        </Button>
      </Flex>
    </CollapsibleSectionBase>
  );
};

export const Domains = ({ projectId }: DomainsProps) => {
  const { data: domainsResult, load } = trpc.findMany.useQuery();
  // const { send: start } = trpc.start.useMutation();
  // const { send: create } = trpc.create.useMutation();

  useEffect(() => {
    load({ projectId });
  }, [load, projectId]);

  if (domainsResult?.success === false) {
    return (
      <Flex
        css={{
          // Prevent errors inside to expand dialog size
          width: "min-content",
          minWidth: "100%",
        }}
        gap={2}
        direction={"column"}
      >
        <Label
          css={{
            overflowWrap: "anywhere",
            color: theme.colors.foregroundDestructive,
          }}
        >
          <div>{domainsResult.error}</div>
        </Label>
      </Flex>
    );
  }

  const domains = domainsResult?.data ?? [];

  return (
    <>
      <Separator />

      <Flex
        css={{
          // Prevent errors inside to expand dialog size
          width: "min-content",
          minWidth: "100%",
        }}
        direction={"column"}
      >
        {domains.map((projectDomain) => (
          <DomainItem
            key={projectDomain.domain.domain}
            projectDomain={projectDomain}
          />
        ))}
      </Flex>

      <Flex
        css={{
          // Prevent errors inside to expand dialog size
          width: "min-content",
          minWidth: "100%",
          padding: theme.spacing[9],
        }}
        gap={2}
        direction={"column"}
      >
        <AddDomain projectId={projectId} />
      </Flex>
    </>
  );
};

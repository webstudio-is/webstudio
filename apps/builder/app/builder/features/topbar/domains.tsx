import {
  Flex,
  Button,
  InputField,
  Label,
  theme,
  SectionTitle,
  Separator,
  Text,
  Tooltip,
  Box,
} from "@webstudio-is/design-system";
import type { DomainRouter } from "@webstudio-is/domain/index.server";
import { validateDomain } from "@webstudio-is/domain";
import type { Project } from "@webstudio-is/project";
import { useEffect, useState } from "react";
import { createTrpcRemixProxy } from "~/shared/remix/trpc-remix-proxy";
import { builderDomainsPath } from "~/shared/router-utils";
import { CollapsibleSectionBase } from "~/builder/shared/collapsible-section";

import { AlertIcon, CheckboxCheckedIcon } from "@webstudio-is/icons";

const trpc = createTrpcRemixProxy<DomainRouter>(builderDomainsPath);

type DomainsProps = {
  projectId: Project["id"];
  onBeforeCreate: (domain: string) => void;
};

const AddDomain = ({ projectId, onBeforeCreate: onCreate }: DomainsProps) => {
  const { send: create, data: startData, state } = trpc.create.useMutation();
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (startData === undefined) {
      return;
    }

    if (startData?.success === false) {
      setError(startData.error);
      return;
    }

    setDomain("");
  }, [startData]);

  return (
    <>
      <InputField
        placeholder="Domain"
        value={domain}
        disabled={state !== "idle"}
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

          // We don't mind if create fails
          onCreate(domain);

          create({ domain, projectId });
        }}
      >
        Add Domain
      </Button>
    </>
  );
};

const DomainItem = (props: {
  initiallyOpen: boolean;
  projectDomain: {
    projectId: Project["id"];
    domain: {
      domain: string;
      error: string | null;
      status: string;
    };
    txtRecord: string;
    verified: boolean;
  };
}) => {
  const {
    send: verify,
    state: verifyState,
    data: verifyData,
  } = trpc.verify.useMutation();
  const { send: remove, state: deleteState } = trpc.remove.useMutation();
  const [open, setOpen] = useState(props.initiallyOpen);
  const [error, setError] = useState<string>();

  const disabled = verifyState !== "idle" || deleteState !== "idle";

  console.log(verifyData, props.projectDomain);

  useEffect(() => {
    if (verifyData === undefined) {
      return;
    }

    if (verifyData?.success === false) {
      setError(verifyData.error);
      return;
    }

    setError("");
  }, [verifyData]);

  const state =
    props.projectDomain.verified === false
      ? "unverified"
      : props.projectDomain.domain.error !== null
      ? "verified_cname_error"
      : props.projectDomain.domain.status === "active"
      ? "verified_active"
      : "verified_pending";

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

                width: theme.spacing[12],
                height: theme.spacing[12],
              }}
            >
              {props.projectDomain.verified ? (
                props.projectDomain.domain.error === null ? (
                  <Tooltip content={"Domain is verified"}>
                    <Box css={{ color: theme.colors.green10 }}>
                      <CheckboxCheckedIcon />
                    </Box>
                  </Tooltip>
                ) : (
                  <Tooltip content={props.projectDomain.domain.error ?? ""}>
                    <Box css={{ color: theme.colors.foregroundDestructive }}>
                      <AlertIcon />
                    </Box>
                  </Tooltip>
                )
              ) : (
                <Tooltip
                  content={"Domain not verified, expand section to see details"}
                >
                  <Box css={{ color: theme.colors.foregroundDestructive }}>
                    <AlertIcon />
                  </Box>
                </Tooltip>
              )}
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
          overflowWrap: "anywhere",
        }}
        gap={2}
        direction={"column"}
      >
        {props.projectDomain.verified ? (
          <div>ddd</div>
        ) : (
          <Text>
            <Box>
              <strong>Follow these steps:</strong>
            </Box>
            <Box
              as={"ol"}
              css={{
                listStyleType: "decimal",
                paddingInlineStart: theme.spacing[9],
                "li:not(:last-child)": {
                  marginBottom: theme.spacing[7],
                },
              }}
            >
              <li>
                Create a CNAME record:
                <br />
                <code>
                  {props.projectDomain.domain.domain} CNAME
                  proxy-fallback.saasprovider.com
                </code>
              </li>
              <li>
                Add a TXT record:
                <br />
                <code>__webstudio_is TXT ${props.projectDomain.txtRecord}</code>
              </li>
            </Box>
            <Box>{`Finally, click "Verify."`}</Box>
          </Text>
        )}

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
          disabled={disabled}
          color="neutral"
          css={{ width: "100%", flexShrink: 0 }}
          onClick={() => {
            setError("");
            verify({
              domain: props.projectDomain.domain.domain,
              projectId: props.projectDomain.projectId,
            });
          }}
        >
          Verify
        </Button>
        <Button
          disabled={disabled}
          color="neutral"
          css={{ width: "100%", flexShrink: 0 }}
          onClick={() => {
            remove({
              domain: props.projectDomain.domain.domain,
              projectId: props.projectDomain.projectId,
            });
          }}
        >
          Delete
        </Button>
      </Flex>
    </CollapsibleSectionBase>
  );
};

export const Domains = ({ projectId }: DomainsProps) => {
  const { data: domainsResult, load } = trpc.findMany.useQuery();
  // const { send: start } = trpc.start.useMutation();
  // const { send: create } = trpc.create.useMutation();
  const [newDomainSet, setNewDomainSet] = useState(new Set<string>());

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
            initiallyOpen={newDomainSet.has(projectDomain.domain.domain)}
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
        <AddDomain
          key={domains.map(({ domain }) => domain).join(":")}
          projectId={projectId}
          onBeforeCreate={(domain) => {
            setNewDomainSet((prev) => {
              return new Set([...prev, domain]);
            });
          }}
        />
      </Flex>
    </>
  );
};

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  useId,
  Tooltip,
  FloatingPanelPopover,
  FloatingPanelAnchor,
  FloatingPanelPopoverTrigger,
  FloatingPanelPopoverContent,
  FloatingPanelPopoverTitle,
  IconButton,
  Grid,
  Flex,
  Label,
  Text,
  InputField,
  Separator,
  ScrollArea,
} from "@webstudio-is/design-system";
import { useIsPublishDialogOpen } from "../../shared/nano-states";
import { validateProjectDomain, type Project } from "@webstudio-is/project";
import { getPublishedUrl } from "~/shared/router-utils";
import { theme } from "@webstudio-is/design-system";
import { useAuthPermit } from "~/shared/nano-states";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { Domains } from "./domains";
import { CollapsibleDomainSection } from "./collapsible-domain-section";
import {
  CheckCircleIcon,
  ExternalLinkIcon,
  AlertIcon,
} from "@webstudio-is/icons";
import { createTrpcFetchProxy } from "~/shared/remix/trpc-remix-proxy";
import { builderDomainsPath } from "~/shared/router-utils";
import type { DomainRouter } from "@webstudio-is/domain/index.server";
import { AddDomain } from "./add-domain";

const trpc = createTrpcFetchProxy<DomainRouter>(builderDomainsPath);

type PublishButtonProps = { project: Project };

const ChangeProjectDomain = (props: PublishButtonProps) => {
  const id = useId();

  const {
    send: updateProjectDomain,
    state: updateProjectDomainState,
    error: updateProjectSystemError,
  } = trpc.updateProjectDomain.useMutation();

  const {
    load: loadProject,
    data: projectData,
    state: projectState,
    error: projectSystemError,
  } = trpc.project.useQuery();

  const [domain, setDomain] = useState(props.project.domain);
  const [error, setError] = useState<string>();

  let project = props.project;
  if (projectData?.success) {
    project = projectData.project;
  }

  const refreshProject = useCallback(
    () =>
      loadProject({ projectId: props.project.id }, (projectData) => {
        if (projectData?.success === false) {
          setError(projectData.error);
          return;
        }

        setDomain(projectData.project.domain);
      }),
    [loadProject, props.project.id]
  );

  useEffect(() => {
    refreshProject();
  }, [refreshProject]);

  const publishedUrl = new URL(getPublishedUrl(project.domain));

  const handleUpdateProjectDomain = () => {
    const validationResult = validateProjectDomain(domain);

    if (validationResult.success === false) {
      setError(validationResult.error);
      return;
    }

    if (updateProjectDomainState !== "idle") {
      return;
    }
    if (domain === project.domain) {
      return;
    }

    updateProjectDomain({ domain, projectId: project.id }, (data) => {
      if (data?.success === false) {
        setError(data.error);
        return;
      }

      refreshProject();
    });
  };

  if (projectSystemError !== undefined) {
    return (
      <Flex
        css={{
          m: theme.spacing[9],
          overflowWrap: "anywhere",
        }}
        gap={2}
        direction={"column"}
      >
        <Text color="destructive">{projectSystemError}</Text>
        <Text color="subtle">Please try again later</Text>
      </Flex>
    );
  }

  if (projectData === undefined) {
    return <div />;
  }

  return (
    <CollapsibleDomainSection
      title={publishedUrl.host}
      suffix={
        <Grid flow="column">
          <Tooltip content={error !== undefined ? error : "Everything is ok"}>
            <Flex
              align={"center"}
              justify={"center"}
              css={{
                cursor: "pointer",
                width: theme.spacing[12],
                height: theme.spacing[12],
                color:
                  error !== undefined
                    ? theme.colors.foregroundDestructive
                    : theme.colors.foregroundSuccessText,
              }}
            >
              {error !== undefined ? <AlertIcon /> : <CheckCircleIcon />}
            </Flex>
          </Tooltip>

          <Tooltip content={`Proceed to ${publishedUrl.href}`}>
            <IconButton
              tabIndex={-1}
              onClick={(event) => {
                window.open(publishedUrl.href, "_blank");
                event.preventDefault();
              }}
            >
              <ExternalLinkIcon />
            </IconButton>
          </Tooltip>
        </Grid>
      }
    >
      <Grid gap={3}>
        <Grid gap={1}>
          <Label htmlFor={id}>Domain:</Label>
          <InputField
            id={id}
            placeholder="Domain"
            value={domain}
            disabled={
              updateProjectDomainState !== "idle" || projectState !== "idle"
            }
            onChange={(event) => {
              setError(undefined);
              setDomain(event.target.value);
            }}
            onBlur={handleUpdateProjectDomain}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleUpdateProjectDomain();
              }

              if (event.key === "Escape") {
                if (project.domain !== domain) {
                  setDomain(project.domain);
                  event.preventDefault();
                }
              }
            }}
            color={
              error !== undefined || updateProjectSystemError !== undefined
                ? "error"
                : undefined
            }
          />
          {error !== undefined && <Text color="destructive">{error}</Text>}
          {updateProjectSystemError !== undefined && (
            <Text color="destructive">{updateProjectSystemError}</Text>
          )}
        </Grid>
      </Grid>
    </CollapsibleDomainSection>
  );
};

const Publish = ({ projectId }: { projectId: Project["id"] }) => {
  const {
    send: publish,
    state: publishState,
    data: publishData,
    error: publishSystemError,
  } = trpc.publish.useMutation();

  return (
    <Flex
      css={{
        paddingLeft: theme.spacing[9],
        paddingRight: theme.spacing[9],
        paddingBottom: theme.spacing[9],
        paddingTop: theme.spacing[5],
      }}
      gap={2}
      shrink={false}
      direction={"column"}
    >
      {publishSystemError !== undefined && (
        <Text color="destructive">{publishSystemError}</Text>
      )}

      {publishData?.success === false && (
        <Text color="destructive">{publishData.error}</Text>
      )}

      <Button
        color="positive"
        disabled={publishState !== "idle"}
        onClick={() => {
          publish({ projectId });
        }}
      >
        Publish
      </Button>
    </Flex>
  );
};

const Content = (props: PublishButtonProps) => {
  const [newDomains, setNewDomains] = useState(new Set<string>());
  const {
    data: domainsResult,
    load: refreshDomainResult,
    state: domainLoadingState,
  } = trpc.findMany.useQuery();

  useEffect(() => {
    refreshDomainResult({ projectId: props.project.id });
  }, [refreshDomainResult, props.project.id]);

  return (
    <>
      <ScrollArea>
        <ChangeProjectDomain project={props.project} />

        {isFeatureEnabled("domains") && (
          <>
            {domainsResult?.success === true && (
              <Domains
                newDomains={newDomains}
                domains={domainsResult.data}
                refreshDomainResult={refreshDomainResult}
                domainLoadingState={domainLoadingState}
              />
            )}
            {domainsResult?.success === false && (
              <Label
                css={{
                  overflowWrap: "anywhere",
                  color: theme.colors.foregroundDestructive,
                }}
              >
                <div>{domainsResult.error}</div>
              </Label>
            )}
          </>
        )}
      </ScrollArea>

      {isFeatureEnabled("domains") && (
        <>
          <Flex direction="column" justify="end" css={{ height: 0 }}>
            <Separator />
          </Flex>

          <AddDomain
            projectId={props.project.id}
            refreshDomainResult={refreshDomainResult}
            domainLoadingState={domainLoadingState}
            onCreate={(domain) => {
              setNewDomains((prev) => {
                return new Set([...prev, domain]);
              });
            }}
          />
        </>
      )}

      <Publish projectId={props.project.id} />
    </>
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

      <FloatingPanelPopoverContent
        css={{
          zIndex: theme.zIndices[1],
          width: theme.spacing[33],
          maxWidth: theme.spacing[33],
        }}
      >
        <FloatingPanelPopoverTitle>Publish</FloatingPanelPopoverTitle>
        <Content project={project} />
      </FloatingPanelPopoverContent>
    </FloatingPanelPopover>
  );
};

import {
  Button,
  Flex,
  InputField,
  Label,
  Separator,
  theme,
  Text,
} from "@webstudio-is/design-system";
import type { DomainRouter } from "@webstudio-is/domain/index.server";
import { validateDomain } from "@webstudio-is/domain";
import type { Project } from "@webstudio-is/project";
import { useId, useState } from "react";
import { createTrpcFetchProxy } from "~/shared/remix/trpc-remix-proxy";
import { builderDomainsPath } from "~/shared/router-utils";

const trpc = createTrpcFetchProxy<DomainRouter>(builderDomainsPath);

type DomainsAddProps = {
  projectId: Project["id"];
  onCreate: (domain: string) => void;
  refreshDomainResult: (
    input: { projectId: Project["id"] },
    onSuccess: () => void
  ) => void;
  domainLoadingState: "idle" | "submitting";
};

export const AddDomain = ({
  projectId,
  onCreate,
  refreshDomainResult,
  domainLoadingState,
}: DomainsAddProps) => {
  const id = useId();
  const {
    send: create,
    state,
    error: createSystemError,
  } = trpc.create.useMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string>();

  const handleCreate = () => {
    setError(undefined);

    const validationResult = validateDomain(domain);

    if (validationResult.success === false) {
      setError(validationResult.error);
      return;
    }

    create({ domain: validationResult.domain, projectId }, (data) => {
      if (data.success === false) {
        setError(data.error);
        return;
      }

      refreshDomainResult({ projectId }, () => {
        setDomain("");
        setIsOpen(false);
        onCreate(validationResult.domain);
      });
    });
  };

  return (
    <>
      <Flex
        css={{
          padding: theme.spacing[9],
          paddingTop: isOpen ? theme.spacing[5] : theme.spacing[9],
          paddingBottom: isOpen ? theme.spacing[9] : 0,
        }}
        gap={2}
        shrink={false}
        direction={"column"}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setDomain("");
            setIsOpen(false);
            event.preventDefault();
          }
        }}
      >
        {isOpen && (
          <>
            <Label htmlFor={id} sectionTitle>
              New Domain
            </Label>
            <InputField
              id={id}
              autoFocus
              placeholder="your-domain.com"
              value={domain}
              disabled={state !== "idle" || domainLoadingState !== "idle"}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleCreate();
                }
                if (event.key === "Escape") {
                  setDomain("");
                  setIsOpen(false);
                  event.preventDefault();
                }
              }}
              onChange={(event) => {
                setError(undefined);
                setDomain(event.target.value);
              }}
              color={error !== undefined ? "error" : undefined}
            />
            {error !== undefined && (
              <>
                <Text color="destructive">{error}</Text>
              </>
            )}
            {createSystemError !== undefined && (
              <>
                {/* Something happened with network, api etc */}
                <Text color="destructive">{createSystemError}</Text>
                <Text color="subtle">Please try again later</Text>
              </>
            )}
          </>
        )}

        <Button
          disabled={state !== "idle" || domainLoadingState !== "idle"}
          color={isOpen ? "primary" : "neutral"}
          css={{ width: "100%", flexShrink: 0 }}
          onClick={() => {
            if (isOpen === false) {
              setIsOpen(true);
              return;
            }

            handleCreate();
          }}
        >
          {isOpen ? "Add domain" : "Add a new domain"}
        </Button>
      </Flex>
      {isOpen && <Separator css={{ mb: theme.spacing[5] }} />}
    </>
  );
};

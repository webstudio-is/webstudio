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
  const [addState, setAddState] = useState<"initial" | "input">("initial");
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string>();

  const handleCreate = () => {
    setError(undefined);

    const validationResult = validateDomain(domain);

    if (validationResult.success === false) {
      setError(validationResult.error);
      return;
    }

    create({ domain, projectId }, (data) => {
      if (data.success === false) {
        setError(data.error);
        return;
      }

      refreshDomainResult({ projectId }, () => {
        setDomain("");
        setAddState("initial");
        onCreate(domain);
      });
    });
  };

  return (
    <>
      <Flex
        css={{
          padding: theme.spacing[9],
          paddingTop:
            addState === "initial" ? theme.spacing[9] : theme.spacing[5],
          paddingBottom: addState === "initial" ? 0 : theme.spacing[9],
        }}
        gap={2}
        shrink={false}
        direction={"column"}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setDomain("");
            setAddState("initial");
            event.preventDefault();
          }
        }}
      >
        {addState === "input" && (
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
                  setAddState("initial");
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
          color={addState === "initial" ? "neutral" : "primary"}
          css={{ width: "100%", flexShrink: 0 }}
          onClick={() => {
            if (addState === "initial") {
              setAddState("input");
              return;
            }

            handleCreate();
          }}
        >
          {addState === "initial" ? "Add a new domain" : "Add domain"}
        </Button>
      </Flex>
      {addState === "input" && <Separator css={{ mb: theme.spacing[5] }} />}
    </>
  );
};

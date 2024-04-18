import {
  Button,
  Flex,
  InputField,
  Label,
  Separator,
  theme,
  Text,
  Grid,
} from "@webstudio-is/design-system";
import { validateDomain } from "@webstudio-is/domain";
import type { Project } from "@webstudio-is/project";
import { useId, useState } from "react";
import { CustomCodeIcon } from "@webstudio-is/icons";
import { trpcClient } from "~/shared/trpc/trpc-client";

type DomainsAddProps = {
  projectId: Project["id"];
  onCreate: (domain: string) => void;
  onExportClick: () => void;
  refreshDomainResult: (
    input: { projectId: Project["id"] },
    onSuccess: () => void
  ) => void;
  domainState: "idle" | "submitting";
  isPublishing: boolean;
};

export const AddDomain = ({
  projectId,
  onCreate,
  refreshDomainResult,
  domainState,
  isPublishing,
  onExportClick,
}: DomainsAddProps) => {
  const id = useId();
  const {
    send: create,
    state: сreateState,
    error: сreateSystemError,
  } = trpcClient.domain.create.useMutation();
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
            <Label htmlFor={id} text="title">
              New Domain
            </Label>
            <InputField
              id={id}
              autoFocus
              placeholder="your-domain.com"
              value={domain}
              disabled={
                isPublishing || сreateState !== "idle" || domainState !== "idle"
              }
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
            {сreateSystemError !== undefined && (
              <>
                {/* Something happened with network, api etc */}
                <Text color="destructive">{сreateSystemError}</Text>
                <Text color="subtle">Please try again later</Text>
              </>
            )}
          </>
        )}

        <Grid gap={2} columns={2}>
          <Button
            disabled={
              isPublishing || сreateState !== "idle" || domainState !== "idle"
            }
            color={isOpen ? "primary" : "neutral"}
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

          <Button
            color={"dark"}
            prefix={<CustomCodeIcon />}
            onClick={onExportClick}
          >
            Export
          </Button>
        </Grid>
      </Flex>
      {isOpen && <Separator css={{ mb: theme.spacing[5] }} />}
    </>
  );
};

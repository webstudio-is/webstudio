import {
  Button,
  Flex,
  InputField,
  Label,
  Separator,
  theme,
  Text,
  Grid,
  toast,
} from "@webstudio-is/design-system";
import { validateDomain } from "@webstudio-is/domain";
import type { Project } from "@webstudio-is/project";
import { useId, useOptimistic, useRef, useState } from "react";
import { TerminalIcon } from "@webstudio-is/icons";
import { nativeClient } from "~/shared/trpc/trpc-client";

type DomainsAddProps = {
  projectId: Project["id"];
  onCreate: (domain: string) => void;
  onExportClick: () => void;
  refresh: () => Promise<void>;
};

export const AddDomain = ({
  projectId,
  onCreate,
  refresh,
  onExportClick,
}: DomainsAddProps) => {
  const id = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string>();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isPending, setIsPendingOptimistic] = useOptimistic(false);

  const handleCreateDomain = async (formData: FormData) => {
    // Will be automatically reset on action end
    setIsPendingOptimistic(true);

    const domain = formData.get("domain")?.toString() ?? "";
    const validationResult = validateDomain(domain);

    if (validationResult.success === false) {
      setError(validationResult.error);
      return;
    }

    const result = await nativeClient.domain.create.mutate({
      domain,
      projectId,
    });

    if (result.success === false) {
      toast.error(result.error);
      setError(result.error);
      return;
    }

    onCreate(domain);

    await refresh();

    setIsOpen(false);
  };

  return (
    <>
      <Flex
        gap={2}
        shrink={false}
        direction={"column"}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
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
              name="domain"
              autoFocus
              placeholder="your-domain.com"
              disabled={isPending}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  buttonRef.current
                    ?.closest("form")
                    ?.requestSubmit(buttonRef.current);
                }
                if (event.key === "Escape") {
                  setIsOpen(false);
                  event.preventDefault();
                }
              }}
              color={error !== undefined ? "error" : undefined}
            />
            {error !== undefined && (
              <>
                <Text color="destructive">{error}</Text>
              </>
            )}
          </>
        )}

        <Grid gap={2} columns={2}>
          <Button
            ref={buttonRef}
            formAction={handleCreateDomain}
            state={isPending ? "pending" : undefined}
            color={isOpen ? "primary" : "neutral"}
            onClick={(event) => {
              if (isOpen === false) {
                setIsOpen(true);
                event.preventDefault();
                return;
              }
            }}
          >
            {isOpen ? "Add domain" : "Add a new domain"}
          </Button>

          <Button
            color={"dark"}
            prefix={<TerminalIcon />}
            type="button"
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

import {
  Button,
  Flex,
  Grid,
  InputField,
  Label,
  Text,
  toast,
} from "@webstudio-is/design-system";
import { validateDomain } from "@webstudio-is/domain";
import type { Project } from "@webstudio-is/project";
import { useEffect, useId, useOptimistic, useRef, useState } from "react";
import { nativeClient } from "~/shared/trpc/trpc-client";
import { extractCname } from "./cname";

type DomainsAddProps = {
  projectId: Project["id"];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreate: (domain: string) => void;
  refresh: () => Promise<void>;
};

export const AddDomain = ({
  projectId,
  isOpen,
  onOpenChange,
  onCreate,
  refresh,
}: DomainsAddProps) => {
  const id = useId();
  const [error, setError] = useState<string>();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isPending, setIsPendingOptimistic] = useOptimistic(false);

  useEffect(() => {
    if (isOpen) {
      setError(undefined);
    }
  }, [isOpen]);

  const handleCreateDomain = async (formData: FormData) => {
    // Will be automatically reset on action end
    setIsPendingOptimistic(true);

    let domain = formData.get("domain")?.toString() ?? "";
    const validationResult = validateDomain(domain);

    if (validationResult.success === false) {
      setError(validationResult.error);
      return;
    }

    // detect provider only when root domain is specified
    if (extractCname(domain) === "@") {
      const registrar = await nativeClient.domain.findDomainRegistrar.query({
        domain,
      });
      // enforce www subdomain when no support for cname flattening
      // and root cname can conflict with MX or NS
      if (registrar.known && !registrar.cnameFlattening) {
        domain = `www.${domain}`;
      }
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

    onOpenChange(false);
  };

  if (isOpen === false) {
    return;
  }

  return (
    <Flex
      gap={2}
      shrink={false}
      direction="column"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onOpenChange(false);
          event.preventDefault();
        }
      }}
    >
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
            onOpenChange(false);
            event.preventDefault();
          }
        }}
        color={error !== undefined ? "error" : undefined}
      />
      {error !== undefined && <Text color="destructive">{error}</Text>}
      <Grid gap={2} columns={2}>
        <Button
          ref={buttonRef}
          formAction={handleCreateDomain}
          state={isPending ? "pending" : undefined}
          color="primary"
          disabled={isPending}
        >
          Add domain
        </Button>
        <Button
          type="button"
          color="neutral"
          disabled={isPending}
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
      </Grid>
    </Flex>
  );
};

undefined;

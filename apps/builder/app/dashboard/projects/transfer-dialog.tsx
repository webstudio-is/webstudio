import { useEffect, useRef, useState } from "react";
import { useRevalidator } from "@remix-run/react";
import {
  Button,
  Flex,
  Label,
  Text,
  SearchField,
  DialogActions,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
  DialogDescription,
  MenuCheckedIcon,
  ScrollAreaNative,
  theme,
  toast,
  css,
} from "@webstudio-is/design-system";
import { useStore } from "@nanostores/react";
import { $workspaces } from "~/shared/nano-states";
import { nativeClient } from "~/shared/trpc/trpc-client";

type TargetWorkspace = {
  id: string;
  name: string;
};

const workspaceItemStyle = css({
  all: "unset",
  boxSizing: "border-box",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing[3],
  width: "100%",
  height: theme.spacing[11],
  paddingInline: theme.spacing[5],
  borderRadius: theme.borderRadius[4],
  outline: "none",
  "&:hover, &:focus-visible": {
    background: theme.colors.backgroundHover,
  },
  "&[data-disabled]": {
    cursor: "default",
    opacity: 0.38,
    pointerEvents: "none",
  },
});

const SEARCH_DEBOUNCE_MS = 300;

export const TransferProjectDialog = ({
  isOpen,
  onOpenChange,
  projectId,
  title,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  title: string;
}) => {
  const workspaces = useStore($workspaces);
  const revalidator = useRevalidator();

  const [email, setEmail] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>();
  const [filteredWorkspaces, setFilteredWorkspaces] = useState<
    TargetWorkspace[]
  >([]);
  const [isFiltered, setIsFiltered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const requestCounterRef = useRef(0);

  // Group workspaces by ownership
  const ownedWorkspaces = workspaces.filter(
    (w) => w.workspaceRelation === "own"
  );
  const sharedWorkspaces = workspaces.filter(
    (w) => w.workspaceRelation !== "own"
  );

  const canTransferToWorkspace = (workspaceRelation: string) =>
    workspaceRelation === "own" || workspaceRelation === "administrators";

  const hasWorkspaces = isFiltered
    ? filteredWorkspaces.length > 0
    : workspaces.length > 0;

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen === false) {
      setEmail("");
      setSelectedWorkspaceId(undefined);
      setFilteredWorkspaces([]);
      setIsFiltered(false);
      setError(undefined);
      clearTimeout(debounceTimerRef.current);
    }
    return () => clearTimeout(debounceTimerRef.current);
  }, [isOpen]);

  const handleEmailChange = (searchEmail: string) => {
    setEmail(searchEmail);
    setError(undefined);

    if (searchEmail.trim() === "") {
      setIsFiltered(false);
      setSelectedWorkspaceId(undefined);
      clearTimeout(debounceTimerRef.current);
      return;
    }

    // Basic email validation
    if (searchEmail.includes("@") === false) {
      setIsFiltered(false);
      clearTimeout(debounceTimerRef.current);
      return;
    }

    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      const requestId = ++requestCounterRef.current;
      nativeClient.workspace.findSharedWorkspacesByOwnerEmail
        .query({ email: searchEmail.trim() })
        .then((result) => {
          // Ignore stale responses
          if (requestCounterRef.current !== requestId) {
            return;
          }
          if (result.success) {
            setFilteredWorkspaces(result.data);
            setIsFiltered(true);
            setSelectedWorkspaceId(undefined);
          }
        })
        .catch(() => {
          // Silently fail — keep showing all workspaces
        });
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleClearEmail = () => {
    setEmail("");
    setIsFiltered(false);
    setSelectedWorkspaceId(undefined);
    setError(undefined);
    clearTimeout(debounceTimerRef.current);
  };

  const handleSubmit = async () => {
    setError(undefined);
    setIsSubmitting(true);

    try {
      const trimmedEmail = email.trim();

      // Case 1: No email entered — move to the selected workspace (same-owner move)
      if (trimmedEmail === "" && selectedWorkspaceId !== undefined) {
        const result = await nativeClient.workspace.moveProject.mutate({
          projectId,
          targetWorkspaceId: selectedWorkspaceId,
        });
        if ("error" in result) {
          setError(result.error);
          return;
        }
        toast.info(`"${title}" moved successfully`);
        onOpenChange(false);
        revalidator.revalidate();
        return;
      }

      // Case 2: Email entered — transfer to another user
      if (trimmedEmail !== "") {
        const result = await nativeClient.workspace.transferProject.mutate({
          projectId,
          recipientEmail: trimmedEmail,
          targetWorkspaceId: selectedWorkspaceId,
        });
        if ("error" in result) {
          setError(result.error);
          return;
        }
        toast.info("Transfer request sent");
        onOpenChange(false);
        revalidator.revalidate();
        return;
      }

      setError("Select a workspace or enter an email address");
    } catch {
      setError("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderWorkspaceItem = (
    workspace: TargetWorkspace,
    disabled: boolean
  ) => {
    const isSelected = selectedWorkspaceId === workspace.id;

    return (
      <button
        key={workspace.id}
        type="button"
        className={workspaceItemStyle()}
        data-disabled={disabled ? "" : undefined}
        onClick={() => {
          if (disabled) {
            return;
          }
          setSelectedWorkspaceId(isSelected ? undefined : workspace.id);
        }}
      >
        <Text truncate variant="labels" css={{ flexGrow: 1 }}>
          {workspace.name}
        </Text>
        {isSelected && <MenuCheckedIcon />}
      </button>
    );
  };

  const hasEmail = email.trim() !== "";
  const hasWorkspace = selectedWorkspaceId !== undefined;
  const canSubmit = hasEmail || hasWorkspace;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <Flex
          direction="column"
          gap="3"
          css={{ padding: theme.panel.padding, width: theme.spacing[32] }}
        >
          <DialogDescription asChild>
            <Text as="p">
              Move &ldquo;{title}&rdquo; to another workspace, or transfer it to
              another user by entering their email.
            </Text>
          </DialogDescription>

          {hasWorkspaces && (
            <Flex direction="column" gap="1">
              <Label>
                {isFiltered
                  ? "Their workspaces you have access to"
                  : "Workspace"}
              </Label>
              <ScrollAreaNative
                aria-label="Workspace list"
                css={{
                  maxHeight: theme.spacing[28],
                  border: `1px solid ${theme.colors.borderMain}`,
                  borderRadius: theme.borderRadius[4],
                  paddingBlock: theme.spacing[3],
                }}
              >
                {isFiltered ? (
                  filteredWorkspaces.map((w) => renderWorkspaceItem(w, false))
                ) : (
                  <>
                    {ownedWorkspaces.length > 0 && (
                      <Flex direction="column">
                        <Text
                          variant="tiny"
                          color="subtle"
                          css={{
                            paddingInline: theme.spacing[5],
                            paddingBlock: theme.spacing[3],
                          }}
                        >
                          My workspaces
                        </Text>
                        {ownedWorkspaces.map((w) =>
                          renderWorkspaceItem(w, false)
                        )}
                      </Flex>
                    )}
                    {sharedWorkspaces.length > 0 && (
                      <Flex direction="column">
                        <Text
                          variant="tiny"
                          color="subtle"
                          css={{
                            paddingInline: theme.spacing[5],
                            paddingBlock: theme.spacing[3],
                          }}
                        >
                          Shared with me
                        </Text>
                        {sharedWorkspaces.map((w) =>
                          renderWorkspaceItem(
                            w,
                            canTransferToWorkspace(w.workspaceRelation) ===
                              false
                          )
                        )}
                      </Flex>
                    )}
                  </>
                )}
              </ScrollAreaNative>
            </Flex>
          )}

          {isFiltered && filteredWorkspaces.length === 0 && hasEmail && (
            <Text color="subtle" variant="labels">
              No shared workspaces found. The project will be transferred
              without a target workspace — the recipient will choose where to
              place it.
            </Text>
          )}

          <Flex direction="column" gap="1">
            <Label htmlFor="transfer-email">Recipient email (optional)</Label>
            <SearchField
              id="transfer-email"
              placeholder="user@example.com"
              value={email}
              onChange={(event) => handleEmailChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (canSubmit) {
                    handleSubmit();
                  }
                }
              }}
              onAbort={handleClearEmail}
            />
          </Flex>

          {error !== undefined && <Text color="destructive">{error}</Text>}
        </Flex>

        <DialogTitle>Transfer project</DialogTitle>
        <DialogActions>
          <Button
            disabled={canSubmit === false}
            state={isSubmitting ? "pending" : undefined}
            onClick={handleSubmit}
          >
            {hasEmail ? "Transfer" : "Move"}
          </Button>
          <DialogClose>
            <Button color="ghost">Cancel</Button>
          </DialogClose>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};

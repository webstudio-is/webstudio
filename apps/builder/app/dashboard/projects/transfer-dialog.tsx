import { useEffect, useRef, useState } from "react";
import { useRevalidator, useSearchParams } from "@remix-run/react";
import {
  Avatar,
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  MenuCheckedIcon,
  Separator,
  theme,
  toast,
} from "@webstudio-is/design-system";
import { ChevronDownIcon } from "@webstudio-is/icons";
import { useStore } from "@nanostores/react";
import { $workspaces } from "~/shared/nano-states";
import { nativeClient } from "~/shared/trpc/trpc-client";

type TargetWorkspace = {
  id: string;
  name: string;
};

const sortWorkspaces = <T extends { name: string }>(workspaces: Array<T>) =>
  [...workspaces].sort((a, b) => a.name.localeCompare(b.name));

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
  const [searchParams] = useSearchParams();

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

  // Group and sort workspaces by ownership
  const ownedWorkspaces = sortWorkspaces(
    workspaces.filter((w) => w.workspaceRelation === "own")
  );
  const sharedWorkspaces = sortWorkspaces(
    workspaces.filter((w) => w.workspaceRelation !== "own")
  );

  const canTransferToWorkspace = (workspaceRelation: string) =>
    workspaceRelation === "own" || workspaceRelation === "administrators";

  // Determine the current workspace from URL or fall back to default
  const getCurrentWorkspaceId = () => {
    const urlWorkspaceId = searchParams.get("workspaceId");
    if (urlWorkspaceId !== null) {
      return urlWorkspaceId;
    }
    // When no workspaceId in URL, the user is on the default workspace
    return ownedWorkspaces[0]?.id;
  };

  // The workspace to show in dropdown and filtered list items
  const allTargetWorkspaces = isFiltered
    ? sortWorkspaces(filteredWorkspaces)
    : [];

  const selectedWorkspace =
    workspaces.find((w) => w.id === selectedWorkspaceId) ??
    filteredWorkspaces.find((w) => w.id === selectedWorkspaceId);

  // Reset state when dialog opens — pre-select the current workspace
  useEffect(() => {
    if (isOpen) {
      setSelectedWorkspaceId(getCurrentWorkspaceId());
      return;
    }
    setEmail("");
    setSelectedWorkspaceId(undefined);
    setFilteredWorkspaces([]);
    setIsFiltered(false);
    setError(undefined);
    clearTimeout(debounceTimerRef.current);

    return () => clearTimeout(debounceTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleEmailChange = (searchEmail: string) => {
    setEmail(searchEmail);
    setError(undefined);

    if (searchEmail.trim() === "") {
      setIsFiltered(false);
      setSelectedWorkspaceId(getCurrentWorkspaceId());
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
    setSelectedWorkspaceId(getCurrentWorkspaceId());
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

  const hasEmail = email.trim() !== "";
  const hasWorkspace = selectedWorkspaceId !== undefined;
  const canSubmit = hasEmail || hasWorkspace;

  const workspaceDropdown = isFiltered ? (
    // When filtering by email, show flat list of shared workspaces
    allTargetWorkspaces.length > 0 ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            color="ghost"
            prefix={
              <Avatar
                size="small"
                fallback={(selectedWorkspace?.name ?? "W")
                  .charAt(0)
                  .toLocaleUpperCase()}
                alt={selectedWorkspace?.name ?? "Select workspace"}
                css={{ borderRadius: theme.borderRadius[4] }}
              />
            }
            suffix={<ChevronDownIcon />}
          >
            {selectedWorkspace?.name ?? "Select workspace"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={selectedWorkspaceId ?? ""}
            onValueChange={setSelectedWorkspaceId}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                Their workspaces you have access to
              </DropdownMenuLabel>
              {allTargetWorkspaces.map((workspace) => (
                <DropdownMenuRadioItem
                  key={workspace.id}
                  value={workspace.id}
                  icon={<MenuCheckedIcon />}
                >
                  {workspace.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : (
      <Text color="subtle" variant="labels">
        No shared workspaces found. The project will be transferred without a
        target workspace — the recipient will choose where to place it.
      </Text>
    )
  ) : (
    // Default view: grouped owned + shared workspaces
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          color="ghost"
          prefix={
            <Avatar
              size="small"
              fallback={(selectedWorkspace?.name ?? "W")
                .charAt(0)
                .toLocaleUpperCase()}
              alt={selectedWorkspace?.name ?? "Select workspace"}
              css={{ borderRadius: theme.borderRadius[4] }}
            />
          }
          suffix={<ChevronDownIcon />}
        >
          {selectedWorkspace?.name ?? "Select workspace"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={selectedWorkspaceId ?? ""}
          onValueChange={setSelectedWorkspaceId}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>My workspaces</DropdownMenuLabel>
            {ownedWorkspaces.map((workspace) => (
              <DropdownMenuRadioItem
                key={workspace.id}
                value={workspace.id}
                icon={<MenuCheckedIcon />}
              >
                {workspace.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuGroup>
          {sharedWorkspaces.length > 0 && (
            <DropdownMenuGroup>
              <DropdownMenuLabel>Shared with me</DropdownMenuLabel>
              {sharedWorkspaces.map((workspace) => (
                <DropdownMenuRadioItem
                  key={workspace.id}
                  value={workspace.id}
                  icon={<MenuCheckedIcon />}
                  disabled={
                    canTransferToWorkspace(workspace.workspaceRelation) ===
                    false
                  }
                >
                  {workspace.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuGroup>
          )}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <Flex
          direction="column"
          gap="3"
          css={{ paddingBlock: theme.panel.padding, width: theme.spacing[32] }}
        >
          <Flex
            direction="column"
            gap="3"
            css={{ paddingInline: theme.panel.padding }}
          >
            <DialogDescription asChild>
              <Text as="p">
                Move &ldquo;{title}&rdquo; to another workspace, or transfer it
                to another user by entering their email.
              </Text>
            </DialogDescription>

            <Flex direction="column" gap="1">
              <Label>
                {isFiltered
                  ? "Their workspaces you have access to"
                  : "Workspace"}
              </Label>
              {workspaceDropdown}
            </Flex>
          </Flex>

          <Separator />

          <Flex
            direction="column"
            gap="3"
            css={{ paddingInline: theme.panel.padding }}
          >
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

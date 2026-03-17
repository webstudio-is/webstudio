import { useEffect, useState } from "react";
import { useRevalidator } from "@remix-run/react";
import {
  Box,
  Flex,
  IconButton,
  List,
  ListItem,
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
  ScrollAreaNative,
  Text,
  Tooltip,
  css,
  theme,
  toast,
} from "@webstudio-is/design-system";
import {
  BellIcon,
  BellDotIcon,
  CheckMarkIcon,
  XIcon,
} from "@webstudio-is/icons";
import {
  type WorkspaceInvitePayload,
  WorkspaceInvitePayload as WorkspaceInvitePayloadSchema,
  notificationTypes,
  workspaceRelationLabels,
} from "@webstudio-is/project";
import { nativeClient } from "~/shared/trpc/trpc-client";

type WorkspaceInviteNotification = {
  type: "workspaceInvite";
  payload: WorkspaceInvitePayload;
  workspaceName?: string;
  projectTitle?: string;
};

type ProjectTransferNotification = {
  type: "projectTransfer";
  payload: { projectId: string; targetWorkspaceId?: string };
  workspaceName?: string;
  projectTitle?: string;
};

type GenericNotification = {
  type: Exclude<string, "workspaceInvite" | "projectTransfer">;
  payload: Record<string, unknown>;
  workspaceName?: string;
  projectTitle?: string;
};

export type NotificationItem = {
  id: string;
  status: string;
  createdAt: string;
  senderEmail: string;
  senderName: string;
} & (
  | WorkspaceInviteNotification
  | ProjectTransferNotification
  | GenericNotification
);

const knownNotificationTypes = new Set<string>(notificationTypes);

const notificationRowStyle = css({
  paddingBlock: theme.spacing[5],
  paddingInline: theme.spacing[7],
  "&:not(:last-child)": {
    borderBottom: `1px solid ${theme.colors.borderMain}`,
  },
});

const getDescription = (notification: NotificationItem) => {
  const senderLabel =
    notification.senderName || notification.senderEmail || "Someone";

  if (notification.type === "workspaceInvite") {
    const parsed = WorkspaceInvitePayloadSchema.safeParse(notification.payload);
    const workspaceLabel = notification.workspaceName ?? "a workspace";
    const roleLabel = parsed.success
      ? (workspaceRelationLabels[parsed.data.relation]?.toLowerCase() ??
        parsed.data.relation)
      : "member";

    return `${senderLabel} invited you to "${workspaceLabel}" as ${roleLabel}`;
  }

  if (notification.type === "projectTransfer") {
    const projectLabel = notification.projectTitle ?? "a project";
    return `${senderLabel} wants to transfer "${projectLabel}" to you`;
  }

  return "You have a new notification";
};

export const __testing__ = { getDescription };

const NotificationRow = ({
  notification,
  index,
  onAccept,
  onDecline,
  isLoading,
}: {
  notification: NotificationItem;
  index: number;
  onAccept: () => void;
  onDecline: () => void;
  isLoading: boolean;
}) => {
  return (
    <ListItem index={index} asChild>
      <Flex
        className={notificationRowStyle()}
        align="center"
        justify="between"
        gap="2"
      >
        <Text variant="labels" truncate css={{ flexGrow: 1 }}>
          {getDescription(notification)}
        </Text>
        <Flex gap="1" shrink={false}>
          <Tooltip content="Accept">
            <IconButton
              aria-label="Accept"
              onClick={onAccept}
              disabled={isLoading}
            >
              <CheckMarkIcon />
            </IconButton>
          </Tooltip>
          <Tooltip content="Decline">
            <IconButton
              aria-label="Decline"
              onClick={onDecline}
              disabled={isLoading}
            >
              <XIcon />
            </IconButton>
          </Tooltip>
        </Flex>
      </Flex>
    </ListItem>
  );
};

const loadCount = async (setPendingCount: (count: number) => void) => {
  try {
    const result = await nativeClient.notification.count.query();
    if (result.success) {
      setPendingCount(result.data);
    }
  } catch {
    // Silently fail — badge just won't show
  }
};

const loadNotifications = async (
  setNotifications: (items: NotificationItem[]) => void,
  setPendingCount: (count: number) => void
) => {
  try {
    const result = await nativeClient.notification.list.query();
    if (result.success) {
      const known = result.data.filter((n) =>
        knownNotificationTypes.has(n.type)
      );
      setNotifications(known as NotificationItem[]);
      setPendingCount(known.length);
    }
  } catch {
    // Silently fail
  }
};

export const NotificationPopover = ({
  defaultOpen = false,
  initialNotifications,
}: {
  defaultOpen?: boolean;
  initialNotifications?: NotificationItem[];
} = {}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    initialNotifications ?? []
  );
  const [pendingCount, setPendingCount] = useState(
    initialNotifications?.length ?? 0
  );
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const revalidator = useRevalidator();

  useEffect(() => {
    if (initialNotifications === undefined) {
      loadCount(setPendingCount);
    }
  }, [initialNotifications]);

  useEffect(() => {
    if (isOpen && initialNotifications === undefined) {
      loadNotifications(setNotifications, setPendingCount);
    }
  }, [isOpen, initialNotifications]);

  const handleAccept = async (notificationId: string) => {
    setLoadingIds((prev) => new Set(prev).add(notificationId));
    try {
      const result = await nativeClient.notification.accept.mutate({
        notificationId,
      });
      if (result.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        setPendingCount((prev) => Math.max(0, prev - 1));
        revalidator.revalidate();
        return;
      }
      if ("error" in result) {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to accept notification");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }
  };

  const handleDecline = async (notificationId: string) => {
    setLoadingIds((prev) => new Set(prev).add(notificationId));
    try {
      const result = await nativeClient.notification.decline.mutate({
        notificationId,
      });
      if (result.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        setPendingCount((prev) => Math.max(0, prev - 1));
        return;
      }
      if ("error" in result) {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to decline notification");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <IconButton color="ghost" aria-label="Notifications">
          {pendingCount > 0 ? <BellDotIcon /> : <BellIcon />}
        </IconButton>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4}>
        <PopoverTitle>All notifications</PopoverTitle>
        <ScrollAreaNative
          css={{
            maxHeight: theme.spacing[33],
            width: theme.spacing[34],
          }}
        >
          {notifications.length === 0 ? (
            <Flex
              align="center"
              justify="center"
              css={{ height: theme.spacing[21] }}
            >
              <Text color="subtle">No notifications</Text>
            </Flex>
          ) : (
            <List asChild>
              <Box>
                {notifications.map((notification, index) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    index={index}
                    onAccept={() => handleAccept(notification.id)}
                    onDecline={() => handleDecline(notification.id)}
                    isLoading={loadingIds.has(notification.id)}
                  />
                ))}
              </Box>
            </List>
          )}
        </ScrollAreaNative>
      </PopoverContent>
    </Popover>
  );
};

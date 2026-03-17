import { useEffect, useState } from "react";
import { useRevalidator } from "@remix-run/react";
import {
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
  workspaceRelationLabels,
} from "@webstudio-is/project";
import { nativeClient } from "~/shared/trpc/trpc-client";

type WorkspaceInviteNotification = {
  type: "workspace_invite";
  payload: WorkspaceInvitePayload;
  workspaceName?: string;
};

type GenericNotification = {
  type: string;
  payload: Record<string, unknown>;
  workspaceName?: string;
};

export type NotificationItem = {
  id: string;
  status: string;
  createdAt: string;
  senderEmail: string;
  senderName: string;
} & (WorkspaceInviteNotification | GenericNotification);

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

  if (notification.type === "workspace_invite") {
    const parsed = WorkspaceInvitePayloadSchema.safeParse(notification.payload);
    const workspaceLabel = notification.workspaceName ?? "a workspace";
    const roleLabel = parsed.success
      ? (workspaceRelationLabels[parsed.data.relation]?.toLowerCase() ??
        parsed.data.relation)
      : "member";

    return `${senderLabel} invited you to "${workspaceLabel}" as ${roleLabel}`;
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
      setNotifications(result.data);
      setPendingCount(result.data.length);
    }
  } catch {
    // Silently fail
  }
};

export const NotificationPopover = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loadingId, setLoadingId] = useState<string>();
  const revalidator = useRevalidator();

  useEffect(() => {
    loadCount(setPendingCount);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNotifications(setNotifications, setPendingCount);
    }
  }, [isOpen]);

  const handleAccept = async (notificationId: string) => {
    setLoadingId(notificationId);
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
      setLoadingId(undefined);
    }
  };

  const handleDecline = async (notificationId: string) => {
    setLoadingId(notificationId);
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
      setLoadingId(undefined);
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
            maxHeight: 320,
            width: theme.spacing[32],
            padding: theme.panel.padding,
          }}
        >
          {notifications.length === 0 ? (
            <Flex align="center" justify="center" css={{ height: 100 }}>
              <Text color="subtle">No notifications</Text>
            </Flex>
          ) : (
            <List>
              {notifications.map((notification, index) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  index={index}
                  onAccept={() => handleAccept(notification.id)}
                  onDecline={() => handleDecline(notification.id)}
                  isLoading={loadingId === notification.id}
                />
              ))}
            </List>
          )}
        </ScrollAreaNative>
      </PopoverContent>
    </Popover>
  );
};

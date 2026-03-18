import { useState } from "react";
import { useRevalidator } from "@remix-run/react";
import { useStore } from "@nanostores/react";
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
import { nativeClient } from "~/shared/trpc/trpc-client";
import { $notifications, refreshNotifications } from "./shared/subscription";
import type { Notifications } from "~/shared/polly/types";

export type NotificationItem = Notifications[number];

const notificationRowStyle = css({
  paddingBlock: theme.spacing[5],
  paddingInline: theme.spacing[7],
  "&:not(:last-child)": {
    borderBottom: `1px solid ${theme.colors.borderMain}`,
  },
});

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
          {notification.description}
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

export const NotificationPopover = ({
  defaultOpen = false,
  initialNotifications,
}: {
  defaultOpen?: boolean;
  initialNotifications?: NotificationItem[];
} = {}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const polledNotifications = useStore($notifications);
  const notifications = initialNotifications ?? polledNotifications;
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const revalidator = useRevalidator();

  const handleAccept = async (notificationId: string) => {
    setLoadingIds((prev) => new Set(prev).add(notificationId));
    try {
      const result = await nativeClient.notification.accept.mutate({
        notificationId,
      });
      if (result.success) {
        refreshNotifications();
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
        refreshNotifications();
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
          {notifications.length > 0 ? <BellDotIcon /> : <BellIcon />}
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

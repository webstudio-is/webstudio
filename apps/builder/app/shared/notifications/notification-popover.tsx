import { useState, type ReactElement } from "react";
import { useRevalidator } from "@remix-run/react";
import { useStore } from "@nanostores/react";
import {
  Box,
  Button,
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
  keyframes,
  theme,
  toast,
} from "@webstudio-is/design-system";
import { BellIcon, BellDotIcon, XIcon } from "@webstudio-is/icons";
import { nativeClient } from "~/shared/trpc/trpc-client";
import { $notifications, refreshNotifications } from "./subscription";
import type { Notifications } from "~/shared/polly/types";

export type NotificationItem = Notifications[number];

export type TriggerButtonProps = {
  "aria-label": string;
  children: ReactElement;
};

// "swing" animation from Animate.css (https://animate.style)
// Rotates around the top anchor to simulate a ringing bell.
const bounceBell = keyframes({
  "20%": { transform: "rotate3d(0, 0, 1, 15deg)" },
  "40%": { transform: "rotate3d(0, 0, 1, -10deg)" },
  "60%": { transform: "rotate3d(0, 0, 1, 5deg)" },
  "80%": { transform: "rotate3d(0, 0, 1, -5deg)" },
  "100%": { transform: "rotate3d(0, 0, 1, 0deg)" },
});

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
          <Button color="neutral" onClick={onAccept} disabled={isLoading}>
            Accept
          </Button>
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

export const NotificationPopover = (
  {
    defaultOpen = false,
    initialNotifications,
    renderTrigger,
  }: {
    defaultOpen?: boolean;
    initialNotifications?: NotificationItem[];
    renderTrigger: (props: TriggerButtonProps) => ReactElement;
  } = {
    renderTrigger: (props) => <IconButton color="ghost" {...props} />,
  }
) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const polledNotifications = useStore($notifications);
  const notifications = initialNotifications ?? polledNotifications;
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const revalidator = useRevalidator();

  const [hasSeen, setHasSeen] = useState(defaultOpen);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setHasSeen(true);
    }
  };

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
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {renderTrigger({
          "aria-label": "Notifications",
          children:
            notifications.length > 0 && !hasSeen ? (
              <BellDotIcon
                style={{
                  transformOrigin: "top center",
                  animation: `${bounceBell} 1s ease-in-out infinite`,
                }}
              />
            ) : notifications.length > 0 ? (
              <BellDotIcon />
            ) : (
              <BellIcon />
            ),
        })}
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

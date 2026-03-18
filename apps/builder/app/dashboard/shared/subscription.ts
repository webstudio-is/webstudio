/**
 * Dashboard-wide polling subscription.
 *
 * Creates a single `PollingManager` instance for the dashboard and
 * exposes a `$notifications` nanostore atom that the notification
 * popover (and any other consumer) can read.
 *
 * Lifecycle is tied to `startDashboardSubscription` / `stopDashboardSubscription`
 * which should be called from the dashboard root component's useEffect.
 */
import { atom } from "nanostores";
import { createPollingManager } from "~/shared/polly/polling-manager";
import type { Notifications, SubscriptionResponse } from "~/shared/polly/types";
import { nativeClient } from "~/shared/trpc/trpc-client";
import { notificationTypes } from "@webstudio-is/project";
import { toast } from "@webstudio-is/design-system";
import { showBrowserNotification } from "./browser-notification";
import type { Subscription } from "~/shared/polly/polling-manager";

const knownNotificationTypes = new Set<string>(notificationTypes);

export const $notifications = atom<Notifications>([]);

let subscription: Subscription | undefined;
let manager: ReturnType<typeof createPollingManager> | undefined;
let isFirstLoad = true;

const getManager = () => {
  if (manager === undefined) {
    manager = createPollingManager({
      fetcher: (topics) =>
        nativeClient.polly.poll.query({
          topics,
        }) as Promise<SubscriptionResponse>,
      onError: (error) => {
        console.warn("[subscription] poll failed", error);
      },
    });
  }
  return manager;
};

const handleNotifications = (incoming: Notifications) => {
  const known = incoming.filter((n) => knownNotificationTypes.has(n.type));
  const prev = $notifications.get();
  $notifications.set(known);

  // First callback after subscribing — populate the store but don't
  // fire a notification for pre-existing items.
  if (isFirstLoad) {
    isFirstLoad = false;
    return;
  }

  // Detect genuinely new notifications (ids we haven't seen before).
  const prevIds = new Set(prev.map((n) => n.id));
  const hasNew = known.some((n) => prevIds.has(n.id) === false);

  if (hasNew) {
    toast.info("You have new notifications");
    // Best-effort browser notification (may be silenced by the OS).
    showBrowserNotification("Webstudio", {
      body: "You have new notifications",
    });
  }
};

/**
 * Populate the store from server-loaded data so the notification
 * indicator renders immediately without waiting for the first poll.
 */
export const seedNotifications = (initial: Notifications) => {
  const known = initial.filter((n) => knownNotificationTypes.has(n.type));
  $notifications.set(known);
};

export const startDashboardSubscription = () => {
  if (subscription !== undefined) {
    return;
  }
  isFirstLoad = true;
  subscription = getManager().subscribe("notifications", handleNotifications);
};

export const stopDashboardSubscription = () => {
  subscription?.unsubscribe();
  subscription = undefined;
  isFirstLoad = true;
};

/**
 * Force an immediate refresh — useful after accept/decline mutations
 * so the popover updates without waiting for the next poll cycle.
 */
export const refreshNotifications = () => getManager().refresh();

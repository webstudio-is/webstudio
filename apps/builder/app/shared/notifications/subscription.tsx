/**
 * Unified polling subscription for both the dashboard and the builder.
 *
 * This module is a singleton — there is exactly one polling pipeline for the
 * entire app. Call `startSubscription()` once when the root mounts and
 * `stopSubscription()` when it unmounts (or on navigation away).
 * Calling `startSubscription()` while already running is a no-op.
 */
import { atom } from "nanostores";
import { createCrossTabPollingManager } from "~/shared/polly/cross-tab-manager";
import type { Notifications, SubscriptionResponse } from "~/shared/polly/types";
import { nativeClient } from "~/shared/trpc/trpc-client";
import { notificationTypes } from "@webstudio-is/project";
import { toast, Link } from "@webstudio-is/design-system";
import { showBrowserNotification } from "./browser-notification";
import {
  SEAT_SUSPENDED_TOAST_ID,
  getSeatSuspendedMessage,
} from "./seat-suspended";
import { publicStaticEnv } from "~/env/env.static";

const knownNotificationTypes = new Set<string>(notificationTypes);

export const $notifications = atom<Notifications>([]);
export const $shouldRevalidateProjects = atom(0);

let manager: ReturnType<typeof createCrossTabPollingManager> | undefined;

export const refreshNotifications = () => manager?.refresh();

/**
 * Populate the store from server-loaded data so the notification
 * indicator renders immediately without waiting for the first poll.
 */
export const seedNotifications = (initial: Notifications) => {
  const known = initial.filter((n) => knownNotificationTypes.has(n.type));
  $notifications.set(known);
};

export const startSubscription = () => {
  if (manager !== undefined) {
    return;
  }

  let isFirstLoad = true;

  manager = createCrossTabPollingManager({
    fetcher: (topics) =>
      nativeClient.polly.poll.query({
        topics,
      }) as Promise<SubscriptionResponse>,
    onError: (error) => {
      console.warn("[subscription] poll failed", error);
    },
  });

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

  manager.subscribe("notifications", handleNotifications);
  manager.subscribe("projectCount", () => {
    // Bump the counter so React listeners know to revalidate.
    $shouldRevalidateProjects.set($shouldRevalidateProjects.get() + 1);
  });
  manager.subscribe("seatSuspended", (seatSuspended) => {
    if (seatSuspended !== false) {
      toast.error(getSeatSuspendedMessage(seatSuspended), {
        id: SEAT_SUSPENDED_TOAST_ID,
        duration: Number.POSITIVE_INFINITY,
      });
    }
  });

  const NEW_VERSION_TOAST_ID = "new-builder-version";
  manager.subscribe("builderVersion", (serverVersion) => {
    if (serverVersion !== publicStaticEnv.VERSION) {
      toast.info(
        <>
          A new version of Webstudio is available. Reload to get the latest —
          see what&apos;s new at{" "}
          <Link
            href="https://wstd.us/changelog"
            target="_blank"
            rel="noopener noreferrer"
          >
            wstd.us/changelog
          </Link>
        </>,
        { id: NEW_VERSION_TOAST_ID, duration: Number.POSITIVE_INFINITY }
      );
    }
  });
};

export const stopSubscription = () => {
  manager?.destroy();
  manager = undefined;
};

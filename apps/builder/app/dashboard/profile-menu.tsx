import { forwardRef } from "react";
import { ChevronDownIcon, UpgradeIcon } from "@webstudio-is/icons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  Avatar,
  theme,
  Button,
  ProBadge,
  DropdownMenuSeparator,
  Text,
} from "@webstudio-is/design-system";
import { useNavigate } from "@remix-run/react";
import { logoutPath, userPlanSubscriptionPath } from "~/shared/router-utils";
import type { User } from "~/shared/db/user.server";
import type { UserPlanFeatures } from "~/shared/db/user-plan-features.server";

const getAvatarLetter = (title?: string) => {
  return (title || "X").charAt(0).toLocaleUpperCase();
};

const defaultUserName = "James Bond";

const ProfileButton = forwardRef<
  HTMLButtonElement,
  {
    name: string;
    image?: string;
    badge?: string;
  }
>(({ image, name, badge, ...rest }, forwardedRef) => {
  return (
    <Button
      color="ghost"
      aria-label="Profile Menu"
      {...rest}
      ref={forwardedRef}
      prefix={
        <Avatar src={image} fallback={getAvatarLetter(name)} alt={name} />
      }
      suffix={<ChevronDownIcon size={12} />}
      css={{
        // Exception for avatar. May need to introduce a 32px controls size later.
        height: theme.spacing[13],
      }}
    >
      {badge && <ProBadge>{badge}</ProBadge>}
    </Button>
  );
});

export const ProfileMenu = ({
  user,
  userPlanFeatures,
}: {
  user: User;
  userPlanFeatures: UserPlanFeatures;
}) => {
  const navigate = useNavigate();
  const nameOrEmail = user.username ?? user.email ?? defaultUserName;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ProfileButton
          image={user.image || undefined}
          name={nameOrEmail}
          badge={
            userPlanFeatures.hasProPlan ? userPlanFeatures.planName : undefined
          }
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>
          {user.username ?? defaultUserName}
          <Text>{user.email}</Text>
        </DropdownMenuLabel>
        {userPlanFeatures.hasSubscription && (
          <DropdownMenuItem
            onSelect={() => navigate(userPlanSubscriptionPath())}
          >
            Manage Subscription
          </DropdownMenuItem>
        )}
        {userPlanFeatures.hasProPlan === false && (
          <DropdownMenuItem
            onSelect={() => {
              window.open("https://webstudio.is/pricing");
            }}
            css={{
              gap: theme.spacing[3],
            }}
          >
            <UpgradeIcon />
            <div>Upgrade to Pro</div>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate(logoutPath())}>
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

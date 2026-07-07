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
  Flex,
} from "@webstudio-is/design-system";
import { useNavigate } from "@remix-run/react";
import { useStore } from "@nanostores/react";
import { logoutPath, planSubscriptionPath } from "~/shared/router-utils";
import type { User } from "~/shared/db/user.server";
import { $purchases } from "~/shared/nano-states";

const getAvatarLetter = (title?: string) => {
  return (title || "X").charAt(0).toLocaleUpperCase();
};

const defaultUserName = "James Bond";

const ProfileButton = forwardRef<
  HTMLButtonElement,
  {
    name: string;
    image?: string;
    hasPurchases?: boolean;
  }
>(({ image, name, hasPurchases, ...rest }, forwardedRef) => {
  return (
    <Flex gap="2" align="center">
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
        {name && (
          <Text variant="labels" truncate>
            {name}
          </Text>
        )}
      </Button>
      {hasPurchases === false && (
        <ProBadge css={{ flexShrink: 0 }}>Free</ProBadge>
      )}
    </Flex>
  );
});

export const ProfileMenu = ({ user }: { user: User }) => {
  const navigate = useNavigate();
  const nameOrEmail = user.username ?? user.email ?? defaultUserName;
  const purchases = useStore($purchases);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ProfileButton
          image={user.image || undefined}
          name={nameOrEmail}
          hasPurchases={purchases.length > 0}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" width="regular">
        <DropdownMenuLabel>
          {user.username ?? defaultUserName}
          <Text>{user.email}</Text>
        </DropdownMenuLabel>
        {purchases.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Plans</DropdownMenuLabel>
          </>
        )}
        {purchases.map((purchase, index) =>
          purchase.subscriptionId ? (
            <DropdownMenuItem
              key={purchase.subscriptionId}
              onSelect={() => {
                window.location.href = planSubscriptionPath(
                  purchase.subscriptionId
                );
              }}
            >
              {purchase.planName}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuLabel key={index}>
              {purchase.planName}
            </DropdownMenuLabel>
          )
        )}
        {purchases.length === 0 && (
          <DropdownMenuItem
            onSelect={() => {
              window.open("https://webstudio.is/pricing");
            }}
            css={{ gap: theme.spacing[3] }}
          >
            <UpgradeIcon />
            <div>Upgrade</div>
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

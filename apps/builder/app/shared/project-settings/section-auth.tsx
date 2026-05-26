import { useEffect, useId, useState } from "react";
import {
  Flex,
  Grid,
  Link,
  ProBadge,
  Text,
  TextArea,
  Tooltip,
  buttonStyle,
  rawTheme,
  theme,
} from "@webstudio-is/design-system";
import { InfoCircleIcon } from "@webstudio-is/icons";
import { useStore } from "@nanostores/react";
import type { ProjectMeta } from "@webstudio-is/sdk";
import { parseWsAuth } from "@webstudio-is/wsauth";
import { $permissions } from "~/shared/nano-states";
import { $pages } from "~/shared/sync/data-stores";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { sectionSpacing } from "./utils";

const defaultAuthSettings = "";

const saveSetting = <Name extends keyof ProjectMeta>(
  name: Name,
  value: ProjectMeta[Name]
) => {
  serverSyncStore.createTransaction([$pages], (pages) => {
    if (pages === undefined) {
      return;
    }
    if (pages.meta === undefined) {
      pages.meta = {};
    }
    pages.meta[name] = value;
  });
};

export const SectionAuth = () => {
  const { allowAuth } = useStore($permissions);
  const authId = useId();
  const pages = useStore($pages);
  const [auth, setAuth] = useState(() => {
    return $pages.get()?.meta?.auth ?? defaultAuthSettings;
  });

  useEffect(() => {
    const nextAuth = pages?.meta?.auth;
    setAuth(nextAuth ?? defaultAuthSettings);
  }, [pages?.meta?.auth]);

  const parseResult = parseWsAuth(auth);
  const errors = parseResult.errors;

  return (
    <Grid gap={2}>
      <Flex align="center" gap={1} css={sectionSpacing}>
        <Text variant="titles">Authentication</Text>
        {allowAuth === false && <ProBadge>PRO</ProBadge>}
        <Tooltip
          content={
            <>
              <Text>
                Authentication asks visitors for HTTP Basic Auth credentials
                before protected pages load.
              </Text>
              <br />
              <Text>
                Add one rule per line: route, a space, then login:password.
              </Text>
              <br />
              <Text>
                # Marketing pages
                <br />
                /preview demo:secret
                <br />
                /docs/:slug editor:manual
                <br />
                /team/* staff:private
              </Text>
              <br />
              <Text>
                Lines starting with # are comments. Routes use the same syntax
                as page paths, including :params and * wildcards.
              </Text>
              {allowAuth === false && (
                <>
                  <br />
                  <Text>
                    Page authentication is a Pro feature. You can publish to
                    staging for free; upgrade to Pro to publish to custom
                    domains.
                  </Text>
                  <Link
                    className={buttonStyle({ color: "gradient" })}
                    css={{ marginTop: theme.spacing[5], width: "100%" }}
                    color="contrast"
                    underline="none"
                    target="_blank"
                    href="https://webstudio.is/pricing"
                  >
                    Upgrade
                  </Link>
                </>
              )}
            </>
          }
          variant="wrapped"
        >
          <InfoCircleIcon
            color={rawTheme.colors.foregroundSubtle}
            tabIndex={-1}
          />
        </Tooltip>
      </Flex>

      <Grid gap={2} css={sectionSpacing}>
        <TextArea
          id={authId}
          aria-label="Authentication rules"
          color={errors.length > 0 ? "error" : undefined}
          placeholder={"/private admin:secret\n/docs/* team:secret"}
          rows={10}
          value={auth}
          onChange={(value) => {
            setAuth(value);
            if (parseWsAuth(value).errors.length === 0) {
              saveSetting("auth", value.trim() === "" ? undefined : value);
            }
          }}
        />

        {errors.length > 0 && (
          <Grid gap={1}>
            {errors.map((error) => (
              <Text key={`${error.line}:${error.message}`} color="destructive">
                Line {error.line}: {error.message}
              </Text>
            ))}
          </Grid>
        )}
      </Grid>
    </Grid>
  );
};

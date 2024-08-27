import { Text, Grid } from "@webstudio-is/design-system";
import { useEffect, useState } from "react";

export type LogoutPageProps = {
  logoutUrls: string[];
  onFinish: () => void;
};

export const LogoutPage = (props: LogoutPageProps) => {
  const [logoutState, setLogoutState] = useState({
    retries: 3,
    logoutUrls: props.logoutUrls,
  });

  useEffect(() => {
    Promise.allSettled(
      logoutState.logoutUrls.map((url) =>
        fetch(url, {
          credentials: "include",
          redirect: "manual",
          headers: { "content-type": "application/json" },
        })
      )
    ).then((results) => {
      const failedUrls: string[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];

        console.info("Logout result", result);

        if (result.status === "rejected") {
          failedUrls.push(logoutState.logoutUrls[i]);
          continue;
        }

        if (
          result.value.type === "opaqueredirect" &&
          result.value.status === 0
        ) {
          continue;
        }

        if (result.value.status >= 200 && result.value.status < 400) {
          continue;
        }

        failedUrls.push(logoutState.logoutUrls[i]);
      }

      if (failedUrls.length === 0) {
        // props.onFinish();
        return;
      }

      if (logoutState.retries === 0) {
        console.error("Failed to logout", failedUrls);
        // props.onFinish();
        return;
      }

      setLogoutState({
        retries: logoutState.retries - 1,
        logoutUrls: failedUrls,
      });
    });
  }, [logoutState, props]);

  return (
    <Grid
      gap={2}
      css={{
        position: "fixed",
        inset: 0,
        alignContent: "center",
        justifyItems: "center",
      }}
    >
      <Text variant={"bigTitle"}>Logging out ...</Text>
    </Grid>
  );
};

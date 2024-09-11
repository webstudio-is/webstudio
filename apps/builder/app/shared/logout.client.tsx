import { Text, Grid } from "@webstudio-is/design-system";
import { useEffect, useState } from "react";

export type LogoutPageProps = {
  logoutUrls: string[];
  onFinish: () => void;
};

const MAX_RETRIES = 3;

export const LogoutPage = (props: LogoutPageProps) => {
  const [logoutState, setLogoutState] = useState({
    retries: MAX_RETRIES,
    logoutUrls: props.logoutUrls,
  });

  useEffect(() => {
    if (logoutState.retries === 0) {
      return;
    }

    Promise.allSettled(
      logoutState.logoutUrls.map(async (url) => {
        await new Promise((resolve) =>
          setTimeout(resolve, (MAX_RETRIES - logoutState.retries) * 1000)
        );

        const response = await fetch(url, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
        });

        if (response.ok) {
          return response;
        }

        console.error(`Logout failed for URL: ${url}`, response);
        throw new Error(`Logout failed for URL: ${url}`);
      })
    ).then((results) => {
      const failedUrls: string[] = [];

      results.forEach((result, index) => {
        if (result.status === "rejected") {
          failedUrls.push(logoutState.logoutUrls[index]);
        }
      });

      if (failedUrls.length === 0) {
        props.onFinish();
        return;
      }

      setLogoutState({
        retries: logoutState.retries - 1,
        logoutUrls: failedUrls,
      });
    });
  }, [logoutState, props]);

  let message = "Logging out ...";

  if (logoutState.retries === 0) {
    // Show error message
    message = "Logout failed.";
    throw new Error("Logout failed.");
  }

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
      <Text variant={"bigTitle"}>{message}</Text>
    </Grid>
  );
};

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
      logoutState.logoutUrls.map(async (url) => {
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

      if (logoutState.retries === 0) {
        console.error(
          "Logout failed for the following URLs:",
          failedUrls.join(", ")
        );
        props.onFinish();
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

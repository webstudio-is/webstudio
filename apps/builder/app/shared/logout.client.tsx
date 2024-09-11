import { Text, Grid } from "@webstudio-is/design-system";
import { useEffect, useRef, useState } from "react";
import { useEffectEvent } from "./hook-utils/effect-event";
import { fetch } from "~/shared/fetch.client";
import { z } from "zod";
import { restLogoutPath } from "./router-utils";

export type LogoutProps = {
  logoutUrls: string[];
  onFinish: (failedProjects?: string[]) => void;
};

const MAX_RETRIES = 3;

const Logout = (props: LogoutProps) => {
  const [logoutState, setLogoutState] = useState({
    retries: MAX_RETRIES,
    logoutUrls: props.logoutUrls,
  });

  useEffect(() => {
    if (logoutState.retries === 0) {
      if (logoutState.retries === 0) {
        // Show error message
        props.onFinish(logoutState.logoutUrls);
      }

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

export type LogoutPageProps = {
  logoutUrls: string[];
};

const LogoutResponse = z.object({
  redirectTo: z.string(),
});

export const LogoutPage = (props: LogoutPageProps) => {
  const refForm = useRef<HTMLFormElement>(null);

  const handleLogout = useEffectEvent(async (formData: FormData) => {
    const response = await fetch(restLogoutPath(), {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData.entries())),
      headers: { "content-type": "application/json" },
      redirect: "manual",
    });

    if (false === response.ok) {
      throw {
        message: "Logout failed. Please try again later.",
        description: `Logout request failed with status ${response.status}: ${await response.text()}`,
      };
    }

    const data = await response.json();
    const parsedData = LogoutResponse.safeParse(data);

    if (false === parsedData.success) {
      throw {
        message: "Logout failed. Please try again later",
        description: "Logout request failed: Unsupported endpoint response",
      };
    }

    if (formData.get("error") !== null) {
      const value = formData.get("error")!.toString();

      const failedProjects = (JSON.parse(value) as string[])
        .map((project) => `- ${new URL(project).origin}`)
        .join("\n");

      throw {
        message: "Logout failed. Please try again later",
        description: `Something went wrong during the projects logout. Please try again later.\nProjects failed to logout:\n${failedProjects}`,
      };
    }

    window.location.href = parsedData.data.redirectTo;
    return;
  });

  const handleFinish = useEffectEvent((failedProjects?: string[]) => {
    if (failedProjects !== undefined) {
      const elt = document.createElement("button");
      elt.type = "submit";
      elt.name = "error";
      elt.value = JSON.stringify(failedProjects);
      elt.style.display = "none";
      refForm.current?.appendChild(elt);
      refForm.current?.requestSubmit(elt);
      return;
    }

    refForm.current?.requestSubmit();
  });

  return (
    <form ref={refForm} action={handleLogout}>
      <Logout logoutUrls={props.logoutUrls} onFinish={handleFinish} />
    </form>
  );
};

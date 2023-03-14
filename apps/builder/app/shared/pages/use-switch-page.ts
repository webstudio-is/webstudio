import { useNavigate } from "@remix-run/react";
import type { Page } from "@webstudio-is/project-build";
import { useProject } from "~/builder/shared/nano-states";
import { builderPath } from "~/shared/router-utils";
import { useAuthToken } from "~/shared/nano-states";
import { useSubscribe } from "~/shared/pubsub";

export const useSwitchPage = () => {
  const [project] = useProject();
  const [authToken] = useAuthToken();
  const navigate = useNavigate();

  return (pageId: "home" | Page["id"]) => {
    if (project === undefined) {
      return;
    }
    navigate(
      builderPath({
        projectId: project.id,
        pageId: pageId === "home" ? undefined : pageId,
        authToken,
      })
    );
  };
};

export const useSubscribeSwitchPage = () => {
  const switchPage = useSwitchPage();
  useSubscribe("switchPage", ({ pageId }) => switchPage(pageId));
};

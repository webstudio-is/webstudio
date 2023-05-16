import { useNavigate } from "@remix-run/react";
import type { Page } from "@webstudio-is/project-build";
import {
  authTokenStore,
  pagesStore,
  projectStore,
  selectedInstanceSelectorStore,
} from "~/shared/nano-states";
import { builderPath } from "~/shared/router-utils";
import { useSubscribe } from "~/shared/pubsub";

export const useSwitchPage = () => {
  const navigate = useNavigate();

  /**
   * If no `pageId` provided, switches to default page (home)
   */
  return (pageId?: Page["id"]) => {
    const project = projectStore.get();
    const pages = pagesStore.get();

    if (project === undefined || pages === undefined) {
      return;
    }

    selectedInstanceSelectorStore.set(undefined);

    navigate(
      builderPath({
        projectId: project.id,
        pageId: pageId === pages.homePage.id ? undefined : pageId,
        authToken: authTokenStore.get(),
      })
    );
  };
};

export const useSubscribeSwitchPage = () => {
  const switchPage = useSwitchPage();
  useSubscribe("switchPage", ({ pageId }) => switchPage(pageId));
};

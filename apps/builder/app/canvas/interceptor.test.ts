import { afterEach, expect, test } from "vitest";
import type { Pages } from "@webstudio-is/sdk";
import { $builderMode } from "~/shared/nano-states/misc";
import { selectPage } from "~/shared/nano-states/pages";
import { $pages } from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import { $currentSystem, $systemDataByPage } from "~/shared/system";
import { subscribeInterceptedEvents } from "./interceptor";

registerContainers();

afterEach(() => {
  document.body.replaceChildren();
  $builderMode.set("design");
  $systemDataByPage.set(new Map());
});

test("preview GET form preserves repeated selected query values", () => {
  const pages: Pages = {
    homePageId: "home",
    rootFolderId: "folder",
    folders: new Map([
      ["folder", { id: "folder", name: "Root", slug: "", children: ["home"] }],
    ]),
    pages: new Map([
      [
        "home",
        {
          id: "home",
          name: "Home",
          title: "Home",
          path: "",
          rootInstanceId: "root",
          meta: {},
        },
      ],
    ]),
  };
  $pages.set(pages);
  selectPage("home");
  $builderMode.set("preview");
  const unsubscribe = subscribeInterceptedEvents();
  try {
    const form = document.createElement("form");
    form.method = "get";
    form.action = "/?source=newsletter&tag=old";
    const select = document.createElement("select");
    select.name = "tag";
    select.multiple = true;
    for (const [value, label] of [
      ["", "Empty"],
      ["red,blue", "First"],
      ["red,blue", "Second"],
    ]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = true;
      select.appendChild(option);
    }
    form.appendChild(select);
    document.body.appendChild(form);
    form.dispatchEvent(
      new SubmitEvent("submit", { bubbles: true, cancelable: true })
    );
    expect($currentSystem.get().search).toEqual({
      source: "newsletter",
      tag: "red,blue",
    });
    expect($currentSystem.get().searchAll).toEqual({
      source: ["newsletter"],
      tag: ["", "red,blue", "red,blue"],
    });
    for (const option of select.options) {
      option.selected = false;
    }
    const button = document.createElement("button");
    button.type = "submit";
    button.name = "intent";
    button.value = "search";
    form.appendChild(button);
    form.dispatchEvent(
      new SubmitEvent("submit", {
        bubbles: true,
        cancelable: true,
        submitter: button,
      })
    );
    expect($currentSystem.get().search).toEqual({
      source: "newsletter",
      intent: "search",
    });
    expect($currentSystem.get().searchAll).toEqual({
      source: ["newsletter"],
      intent: ["search"],
    });
  } finally {
    unsubscribe();
  }
});

import { getPagePath, type System } from "@webstudio-is/sdk";
import {
  compilePathnamePattern,
  matchPathnamePattern,
  tokenizePathnamePattern,
} from "~/builder/shared/url-pattern";
import { $selectedPage, selectPage } from "~/shared/awareness";
import {
  $dataSourceVariables,
  $isPreviewMode,
  $pages,
  $selectedPageHash,
  updateSystem,
} from "~/shared/nano-states";
import { savePathInHistory } from "~/shared/pages";

const isAbsoluteUrl = (href: string) => {
  try {
    new URL(href);
    return true;
  } catch {
    return false;
  }
};

const getSelectedPagePathname = () => {
  const page = $selectedPage.get();
  const dataSourceVariables = $dataSourceVariables.get();
  if (page) {
    const system = dataSourceVariables.get(page.systemDataSourceId) as
      | undefined
      | System;
    const tokens = tokenizePathnamePattern(page.path);
    return compilePathnamePattern(tokens, system?.params ?? {});
  }
};

const switchPageAndUpdateSystem = (href: string, formData?: FormData) => {
  const pages = $pages.get();
  if (pages === undefined) {
    return;
  }
  // preserve pathname when not specified in href/action
  if (href === "" || href.startsWith("?") || href.startsWith("#")) {
    const pathname = getSelectedPagePathname();
    if (pathname) {
      href = pathname + href;
    }
  }
  const pageHref = new URL(href, "https://any-valid.url");
  for (const page of [pages.homePage, ...pages.pages]) {
    const pagePath = getPagePath(page.id, pages);
    const params = matchPathnamePattern(pagePath, pageHref.pathname);
    if (params) {
      // populate search params with form data values if available
      if (formData) {
        for (const [key, value] of formData.entries()) {
          pageHref.searchParams.set(key, value.toString());
        }
      }
      const search = Object.fromEntries(pageHref.searchParams);
      $selectedPageHash.set(pageHref.hash);
      selectPage(page.id);
      updateSystem(page, { params, search });
      savePathInHistory(page.id, pageHref.pathname);
      break;
    }
  }
};

export const subscribeInterceptedEvents = () => {
  const handleClick = (event: MouseEvent) => {
    // Prevent forwarding the click event on an input element when the associated label has a "for" attribute
    if (
      event.target instanceof Element &&
      event.target.closest("label[for]") &&
      !$isPreviewMode.get()
    ) {
      event.preventDefault();
    }

    if (
      event.target instanceof HTMLElement ||
      event.target instanceof SVGElement
    ) {
      const a = event.target.closest("a");
      if (a) {
        event.preventDefault();
        if ($isPreviewMode.get()) {
          // use attribute instead of a.href to get raw unresolved value
          const href = a.getAttribute("href") ?? "";
          if (isAbsoluteUrl(href)) {
            window.open(href, "_blank");
          } else {
            switchPageAndUpdateSystem(href);
          }
        }
      }
      // prevent invoking submit with buttons in canvas mode
      // because form with prevented submit still invokes validation
      if (event.target.closest("button") && $isPreviewMode.get() === false) {
        event.preventDefault();
      }
    }
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (false === event.target instanceof HTMLElement) {
      return;
    }

    if (event.target.closest("select") && $isPreviewMode.get() === false) {
      event.preventDefault();
    }
  };

  const handleSubmit = (event: SubmitEvent) => {
    if ($isPreviewMode.get()) {
      const form =
        event.target instanceof HTMLFormElement ? event.target : undefined;
      if (form === undefined) {
        return;
      }
      // use attribute instead of form.action to get raw unresolved value
      // https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-fs-action
      const action = form.getAttribute("action") ?? "";
      // lower case just for safety
      const method = form.method.toLowerCase();
      if (method === "get" && isAbsoluteUrl(action) === false) {
        switchPageAndUpdateSystem(action, new FormData(form));
      }
    }
    // prevent submitting the form when clicking a button type submit
    event.preventDefault();
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if ($isPreviewMode.get()) {
      return;
    }
    // prevent typing in inputs only in canvas mode
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      event.preventDefault();
    }
  };

  // Note: Event handlers behave unexpectedly when used inside a dialog component.
  // In Dialogs, React intercepts and processes events before they reach our handlers.
  // To ensure consistent behavior across all components, we're using event capturing.
  // This allows us to intercept events before React gets a chance to handle them.
  document.documentElement.addEventListener("click", handleClick, {
    capture: true,
  });
  document.documentElement.addEventListener("submit", handleSubmit, {
    capture: true,
  });

  document.documentElement.addEventListener("keydown", handleKeydown);

  document.documentElement.addEventListener("pointerdown", handlePointerDown);

  return () => {
    document.documentElement.removeEventListener(
      "pointerdown",
      handlePointerDown
    );
    document.documentElement.removeEventListener("click", handleClick, {
      capture: true,
    });
    document.documentElement.removeEventListener("submit", handleSubmit, {
      capture: true,
    });
    document.documentElement.removeEventListener("keydown", handleKeydown);
  };
};

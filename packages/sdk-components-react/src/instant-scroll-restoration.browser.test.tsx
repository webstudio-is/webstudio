import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { InstantScrollRestoration } from "./instant-scroll-restoration";

test.each([false, true])(
  "server restoration scrolls instantly with an inline style: %s",
  (hasInlineStyle) => {
    const html = document.documentElement;
    const previousStyle = html.getAttribute("style");
    html.removeAttribute("style");
    const stylesheet = document.createElement("style");
    stylesheet.textContent = "html { scroll-behavior: smooth; }";
    document.head.append(stylesheet);
    if (hasInlineStyle) {
      html.style.setProperty("scroll-behavior", "smooth", "important");
    }
    expect(html.hasAttribute("style")).toBe(hasInlineStyle);
    const markup = renderToStaticMarkup(
      <InstantScrollRestoration nonce="test-nonce">
        <script
          nonce="test-nonce"
          dangerouslySetInnerHTML={{ __html: "window.scrollTo(0, 2400)" }}
        />
      </InstantScrollRestoration>
    );
    const template = document.createElement("template");
    template.innerHTML = markup;
    expect(
      Array.from(template.content.querySelectorAll("script")).map((script) =>
        script.getAttribute("nonce")
      )
    ).toEqual(["test-nonce", "test-nonce", "test-nonce"]);
    const behaviors: string[] = [];
    vi.spyOn(window, "scrollTo").mockImplementation(() => {
      behaviors.push(getComputedStyle(html).scrollBehavior);
    });
    try {
      for (const source of Array.from(
        template.content.querySelectorAll("script")
      )) {
        const script = document.createElement("script");
        script.textContent = source.textContent;
        document.body.append(script);
        script.remove();
      }
      expect(behaviors).toEqual(["auto"]);
      expect(getComputedStyle(html).scrollBehavior).toBe("smooth");
      expect(html.getAttribute("style")).toBe(
        hasInlineStyle ? "scroll-behavior: smooth !important;" : null
      );
      if (hasInlineStyle) {
        expect(html.style.getPropertyPriority("scroll-behavior")).toBe(
          "important"
        );
      }
    } finally {
      vi.restoreAllMocks();
      stylesheet.remove();
      if (previousStyle === null) {
        html.removeAttribute("style");
      } else {
        html.setAttribute("style", previousStyle);
      }
    }
  }
);

import { expect, test, vi } from "vitest";
import { navigatePreviewFormSuccess } from "./form-success-redirect";

test("internal Preview success redirects switch pages", () => {
  const navigateInternal = vi.fn();
  const navigateExternal = vi.fn();
  navigatePreviewFormSuccess(
    "/thanks?sent=1#done",
    "https://builder.example/contact",
    navigateInternal,
    navigateExternal
  );
  expect(navigateInternal).toHaveBeenCalledWith("/thanks?sent=1#done");
  expect(navigateExternal).not.toHaveBeenCalled();
});

test("relative Preview success redirect uses the Preview page path", () => {
  const navigateInternal = vi.fn();
  const navigateExternal = vi.fn();
  navigatePreviewFormSuccess(
    "https://webstudio.local/thanks",
    "https://webstudio.local/contact",
    navigateInternal,
    navigateExternal
  );
  expect(navigateInternal).toHaveBeenCalledExactlyOnceWith("/thanks");
  expect(navigateExternal).not.toHaveBeenCalled();
});

test.each([
  "https://other.example/thanks",
  "mailto:team@example.com",
  "tel:+15550123",
])(
  "external Preview success redirect %s uses current-frame navigation",
  (target) => {
    const navigateInternal = vi.fn();
    const navigateExternal = vi.fn();
    navigatePreviewFormSuccess(
      target,
      "https://builder.example/contact",
      navigateInternal,
      navigateExternal
    );
    expect(navigateInternal).not.toHaveBeenCalled();
    expect(navigateExternal).toHaveBeenCalledWith(target);
  }
);

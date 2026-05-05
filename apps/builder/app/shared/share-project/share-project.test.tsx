import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { ShareLinkSecurityNotice, ShareProject } from "./share-project";

const shareProjectProps = {
  links: [],
  onChange: () => {},
  onDelete: () => {},
  onCreate: () => {},
  builderUrl: () => "https://example.com",
  isPending: false,
  allowAdditionalPermissions: false,
};

test("warns about sharing links over insecure channels", () => {
  const markup = renderToStaticMarkup(<ShareLinkSecurityNotice />);

  expect(markup).toContain("Sharing links over insecure channels");
  expect(markup).toContain("Team plan");
  expect(markup).toContain("https://webstudio.is/pricing");
  expect(markup).toContain("Upgrade");
});

test("shows security notice only on free plan", () => {
  expect(
    renderToStaticMarkup(<ShareProject {...shareProjectProps} isFreePlan />)
  ).toContain("Sharing links over insecure channels");

  expect(
    renderToStaticMarkup(
      <ShareProject {...shareProjectProps} isFreePlan={false} />
    )
  ).not.toContain("Sharing links over insecure channels");
});

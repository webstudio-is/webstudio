import { chromium, firefox } from "playwright";
import { expect, test } from "vitest";
import { coreMetas, generateCss } from "@webstudio-is/sdk";
import {
  createTemplateComponentFixture,
  css,
  renderData,
  ws,
  type TemplateStyleDecl,
} from "@webstudio-is/template";
import { meta as bodyMeta } from "./body.ws";

const Body = createTemplateComponentFixture("Body");

for (const browserType of [chromium, firefox]) {
  for (const legacyBody of [false, true]) {
    for (const atomic of [false, true]) {
      test(
        `${browserType.name()}, ${legacyBody ? "Body" : "Element"}, atomic=${atomic}: root layout contains horizontal scrolling without changing page layout`,
        { timeout: 15_000 },
        async () => {
          const browser = await browserType.launch();
          try {
            const page = await browser.newPage({
              viewport: { width: 390, height: 844 },
            });
            const renderPage = async (
              content: string,
              bodyStyle: TemplateStyleDecl[] = css`
                padding: 24px;
              `,
              rootStyle?: TemplateStyleDecl[]
            ) => {
              const { cssText, classes } = generateCss({
                ...renderData(
                  <ws.root
                    ws:id=":root"
                    {...(rootStyle ? { "ws:style": rootStyle } : {})}
                  >
                    {legacyBody ? (
                      <Body ws:id="body" ws:style={bodyStyle} />
                    ) : (
                      <ws.element
                        ws:tag="body"
                        ws:id="body"
                        ws:style={bodyStyle}
                      />
                    )}
                  </ws.root>
                ),
                componentMetas: new Map([
                  ...Object.entries(coreMetas),
                  ["Body", bodyMeta],
                ]),
                assetBaseUrl: "",
                atomic,
              });
              await page.setContent(
                `<!doctype html><html><head><style>${cssText}</style></head><body class="${classes.get("body")?.join(" ")}">${content}</body></html>`
              );
            };

            for (const width of [390, 1440]) {
              await page.setViewportSize({ width, height: 844 });
              // #6070: min-content from a max-width scroll container must not
              // enlarge the root grid's auto minimum. No overflow hiding on Body.
              await renderPage(
                '<section><div id="carousel" style="overflow-x:auto;max-width:80rem"><div style="width:1600px;height:100px"></div></div></section>'
              );
              expect(
                await page.evaluate(() => ({
                  document: document.documentElement.scrollWidth,
                  body: document.body.getBoundingClientRect().width,
                }))
              ).toEqual({ document: width, body: width });
              expect(
                await page.locator("#carousel").evaluate((carousel) => {
                  carousel.scrollLeft = 120;
                  return {
                    width: carousel.clientWidth,
                    content: carousel.scrollWidth,
                    scroll: carousel.scrollLeft,
                  };
                })
              ).toEqual({
                width: Math.min(width - 48, 1280),
                content: 1600,
                scroll: 120,
              });

              // Keep the root grid's viewport stretch and a footer pushed down
              // by a flex Body. Removing display:grid makes this page too short.
              await renderPage(
                '<header style="height:40px"></header><main style="flex:1"></main><footer style="height:40px"></footer>',
                css`
                  display: flex;
                  flex-direction: column;
                `
              );
              expect(
                await page.locator("body").evaluate((body) => body.clientHeight)
              ).toBe(844);
              expect(
                await page
                  .locator("footer")
                  .evaluate((footer) => footer.getBoundingClientRect().bottom)
              ).toBe(844);

              // A tall page still scrolls vertically, and sticky navigation keeps
              // using the viewport rather than an overflow-hidden Body.
              await renderPage(
                '<nav style="position:sticky;top:0;height:40px"></nav><main style="height:1600px"></main>'
              );
              await page.evaluate(() => window.scrollTo(0, 200));
              await expect
                .poll(() =>
                  page
                    .locator("nav")
                    .evaluate((nav) => nav.getBoundingClientRect().top)
                )
                .toBe(0);
              expect(await page.evaluate(() => window.scrollY)).toBe(200);
              expect(
                await page.locator("body").evaluate((body) => body.clientHeight)
              ).toBe(1688);

              // Existing explicit Body sizing overrides the preset, including
              // an intentional minimum width larger than the mobile viewport.
              await renderPage(
                "",
                css`
                  min-width: 720px;
                `
              );
              expect(
                await page
                  .locator("body")
                  .evaluate((body) => body.getBoundingClientRect().width)
              ).toBe(Math.max(width, 720));

              // Existing Global root overrides remain usable.
              await renderPage(
                '<main style="height:40px"></main>',
                css`
                  padding: 0;
                `,
                css`
                  display: block;
                `
              );
              expect(
                await page.locator("body").evaluate((body) => body.clientHeight)
              ).toBe(40);
            }
          } finally {
            await browser.close();
          }
        }
      );
    }
  }
}

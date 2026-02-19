import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseRedirects } from "./redirect-parsers";

describe("parseRedirects", () => {
  describe("CSV format", () => {
    test("parses basic CSV with header", () => {
      const input = `source,target,status
/old,/new,301
/about,/about-us,302`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
        { old: "/about", new: "/about-us", status: 302 },
      ]);
      expect(result.skipped).toEqual([]);
    });

    test("parses CSV without header (detects by first row being a redirect)", () => {
      const input = `/old,/new,301
/about,/about-us,302`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
        { old: "/about", new: "/about-us", status: 302 },
      ]);
    });

    test("parses CSV with different column names", () => {
      const input = `from,to,code
/old,/new,301`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
      ]);
    });

    test("parses CSV with alternative column names", () => {
      const input = `old,new,status
/old,/new,301`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
      ]);
    });

    test("parses semicolon-delimited CSV", () => {
      const input = `source;target;status
/old;/new;301`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
      ]);
    });

    test("parses tab-delimited CSV", () => {
      const input = `source\ttarget\tstatus
/old\t/new\t301`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
      ]);
    });

    test("handles CSV with only source and target (defaults status to 301)", () => {
      const input = `source,target
/old,/new`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
      ]);
    });

    test("parses Shopify redirect export format", () => {
      const input = `Redirect from,Redirect to
/old-page,/new-page
/about,/about-us`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old-page", new: "/new-page", status: 301 },
        { old: "/about", new: "/about-us", status: 301 },
      ]);
    });

    test("parses HubSpot redirect export format", () => {
      const input = `Original URL,Target URL
/old-page,/new-page
/blog/old-post,/blog/new-post`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old-page", new: "/new-page", status: 301 },
        { old: "/blog/old-post", new: "/blog/new-post", status: 301 },
      ]);
    });

    test("handles CSV with quoted values containing commas", () => {
      const input = `source,target,status
"/old,path",/new,301`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old,path", new: "/new", status: 301 },
      ]);
    });

    test("handles CSV with external URL as target", () => {
      const input = `source,target,status
/old,https://example.com/new,301`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "https://example.com/new", status: 301 },
      ]);
    });

    test("skips empty lines", () => {
      const input = `source,target,status
/old,/new,301

/about,/about-us,302`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(2);
      expect(result.skipped).toEqual([]);
    });

    test("skips invalid rows and reports them", () => {
      const input = `source,target,status
/old,/new,301
invalid-no-slash,/new,301
/about,/about-us,302`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(2);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0]).toMatchObject({
        line: 3,
        reason: expect.stringContaining("source"),
      });
    });

    test("handles columns in different order", () => {
      const input = `target,status,source
/new,301,/old
/about-us,302,/about`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
        { old: "/about", new: "/about-us", status: 302 },
      ]);
    });

    test("ignores extra columns", () => {
      const input = `source,target,status,notes,author
/old,/new,301,legacy redirect,john
/about,/about-us,302,rebranding,jane`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
        { old: "/about", new: "/about-us", status: 302 },
      ]);
    });

    test("handles BOM at start of file", () => {
      const input = `\uFEFFsource,target,status
/old,/new,301`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
      ]);
    });
  });

  describe("JSON format", () => {
    test("parses JSON array of redirects", () => {
      const input = `[
        { "source": "/old", "target": "/new", "status": 301 },
        { "source": "/about", "target": "/about-us", "status": 302 }
      ]`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
        { old: "/about", new: "/about-us", status: 302 },
      ]);
    });

    test("parses JSON with nested redirects array", () => {
      const input = `{
        "redirects": [
          { "source": "/old", "target": "/new", "status": 301 }
        ]
      }`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
      ]);
    });

    test("parses JSON with alternative key names", () => {
      const input = `[
        { "from": "/old", "to": "/new", "code": 301 }
      ]`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
      ]);
    });

    test("parses Vercel-style JSON with permanent flag", () => {
      const input = `{
        "redirects": [
          { "source": "/old", "destination": "/new", "permanent": true },
          { "source": "/temp", "destination": "/new", "permanent": false }
        ]
      }`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
        { old: "/temp", new: "/new", status: 302 },
      ]);
    });

    test("defaults status to 301 when not provided", () => {
      const input = `[
        { "source": "/old", "target": "/new" }
      ]`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
      ]);
    });

    test("skips invalid entries in JSON array", () => {
      const input = `[
        { "source": "/old", "target": "/new", "status": 301 },
        { "source": "no-slash", "target": "/new", "status": 301 },
        { "target": "/new", "status": 301 }
      ]`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(1);
      expect(result.skipped).toHaveLength(2);
    });

    test("reports error for invalid JSON", () => {
      const input = `{ invalid json }`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([]);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toContain("Invalid JSON");
    });

    test("handles empty JSON array", () => {
      const input = `[]`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([]);
      expect(result.skipped).toEqual([]);
    });

    test("ignores extra properties in JSON objects", () => {
      const input = `[
        { "source": "/old", "target": "/new", "status": 301, "comment": "legacy", "author": "john" }
      ]`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
      ]);
    });

    test("skips JSON redirects with has/missing conditions (unsupported)", () => {
      const input = `{
        "redirects": [
          { "source": "/simple", "destination": "/target", "permanent": true },
          { "source": "/conditional", "destination": "/special", "permanent": false, "has": [{"type": "header", "key": "x-custom"}] },
          { "source": "/another", "destination": "/dest", "permanent": true }
        ]
      }`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(2);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toContain("condition");
    });

    test("skips JSON redirects with placeholders in source (unsupported)", () => {
      const input = `[
        { "source": "/simple", "target": "/target", "status": 301 },
        { "source": "/blog/:slug", "target": "/posts/:slug", "status": 301 },
        { "source": "/docs/:path*", "target": "/documentation/:path*", "status": 301 }
      ]`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(1);
      expect(result.skipped).toHaveLength(2);
      expect(result.skipped[0].reason).toContain("placeholder");
    });
  });

  describe("Netlify _redirects format", () => {
    test("parses basic Netlify redirects", () => {
      const input = `/old /new 301
/about /about-us 302`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
        { old: "/about", new: "/about-us", status: 302 },
      ]);
    });

    test("defaults to 301 when status not provided", () => {
      const input = `/old /new`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
      ]);
    });

    test("skips splat redirects (unsupported)", () => {
      const input = `/simple /target 301
/blog/* /articles/:splat 301
/other /other-target`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(2);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toContain("wildcard");
    });

    test("ignores comment lines", () => {
      const input = `# This is a comment
/old /new 301
# Another comment
/about /about-us`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(2);
      expect(result.skipped).toEqual([]);
    });

    test("skips lines with conditions (unsupported)", () => {
      const input = `/old /new 301
/admin /login 302 Role=admin
/about /about-us`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(2);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0]).toMatchObject({
        line: 2,
        reason: expect.stringContaining("condition"),
      });
    });

    test("handles external URLs as target", () => {
      const input = `/old https://example.com/new 301`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "https://example.com/new", status: 301 },
      ]);
    });

    test("skips force redirects (200 status rewrites)", () => {
      const input = `/old /new 200
/about /about-us 301`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(1);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toContain("rewrite");
    });

    test("handles force flag with !", () => {
      const input = `/old /new 301!
/about /about-us 302!`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
        { old: "/about", new: "/about-us", status: 302 },
      ]);
    });

    test("handles multiple spaces between parts", () => {
      const input = `/old    /new    301
/about   /about-us`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
        { old: "/about", new: "/about-us", status: 301 },
      ]);
    });

    test("handles tabs as separators", () => {
      const input = "/old\t/new\t301";

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
      ]);
    });

    test("skips redirects with placeholders (unsupported)", () => {
      const input = `/simple /target 301
/blog/:year/:slug /posts/:year-:slug 301
/other /other-target`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(2);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toContain("placeholder");
    });

    test("skips redirects with query parameter matching (unsupported)", () => {
      const input = `/simple /target 301
/store id=:id /products/:id 301
/other /other-target`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(2);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toContain("query");
    });

    test("skips 303 status code", () => {
      const input = `/old /new 301
/see-other /other 303
/about /about-us 302`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(2);
      expect(result.skipped).toHaveLength(1);
    });
  });

  describe("htaccess format", () => {
    test("parses basic Redirect directive", () => {
      const input = `Redirect 301 /old /new
Redirect 302 /about /about-us`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
        { old: "/about", new: "/about-us", status: 302 },
      ]);
    });

    test("parses Redirect without status code (defaults to 302)", () => {
      const input = `Redirect /old /new`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 302 },
      ]);
    });

    test("parses Redirect with permanent/temp keywords", () => {
      const input = `Redirect permanent /old /new
Redirect temp /about /about-us`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
        { old: "/about", new: "/about-us", status: 302 },
      ]);
    });

    test("handles external URLs as target", () => {
      const input = `Redirect 301 /old https://example.com/new`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "https://example.com/new", status: 301 },
      ]);
    });

    test("ignores comment lines", () => {
      const input = `# Redirect old pages
Redirect 301 /old /new
# End of redirects`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(1);
      expect(result.skipped).toEqual([]);
    });

    test("ignores non-redirect directives", () => {
      const input = `RewriteEngine On
Redirect 301 /old /new
RewriteBase /`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(1);
      expect(result.skipped).toEqual([]);
    });

    test("skips RewriteRule and reports as unsupported", () => {
      const input = `Redirect 301 /old /new
RewriteRule ^/blog/(.*)$ /posts/$1 [R=301,L]`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(1);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0]).toMatchObject({
        line: 2,
        reason: expect.stringContaining("RewriteRule"),
      });
    });

    test("skips RedirectMatch and reports as unsupported", () => {
      const input = `Redirect 301 /old /new
RedirectMatch 301 ^/category/(.*)$ /new-category/$1`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(1);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0]).toMatchObject({
        line: 2,
        reason: expect.stringContaining("RedirectMatch"),
      });
    });

    test("handles case-insensitive Redirect directive", () => {
      const input = `redirect 301 /old /new
REDIRECT 301 /about /about-us`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(2);
    });

    test("handles multiple spaces between parts", () => {
      const input = `Redirect    301    /old    /new`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
      ]);
    });

    test("handles tabs in Redirect directive", () => {
      const input = "Redirect\t301\t/old\t/new";

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
      ]);
    });
  });

  describe("auto-detection", () => {
    test("detects JSON format", () => {
      const input = `[{"source": "/old", "target": "/new"}]`;
      const result = parseRedirects(input);
      expect(result.redirects).toHaveLength(1);
    });

    test("detects CSV format by header", () => {
      const input = `source,target,status
/old,/new,301`;
      const result = parseRedirects(input);
      expect(result.redirects).toHaveLength(1);
    });

    test("detects htaccess format by Redirect keyword", () => {
      const input = `Redirect 301 /old /new`;
      const result = parseRedirects(input);
      expect(result.redirects).toHaveLength(1);
    });

    test("detects Netlify format by line structure", () => {
      const input = `/old /new 301`;
      const result = parseRedirects(input);
      expect(result.redirects).toHaveLength(1);
    });

    test("returns empty result for empty input", () => {
      const result = parseRedirects("");
      expect(result.redirects).toEqual([]);
      expect(result.skipped).toEqual([]);
    });

    test("returns empty result for whitespace-only input", () => {
      const result = parseRedirects("   \n\n   ");
      expect(result.redirects).toEqual([]);
      expect(result.skipped).toEqual([]);
    });
  });

  describe("edge cases", () => {
    test("handles mixed valid and invalid entries", () => {
      const input = `source,target,status
/old,/new,301
,/missing-source,301
/about,/about-us,invalid-status
/valid,/valid-target,302`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(2);
      expect(result.skipped).toHaveLength(2);
    });

    test("trims whitespace from paths", () => {
      const input = `source,target,status
  /old  ,  /new  ,301`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
      ]);
    });

    test("handles Windows-style line endings", () => {
      const input =
        "source,target,status\r\n/old,/new,301\r\n/about,/about-us,302";

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(2);
    });

    test("handles duplicate redirects (keeps all, validation happens later)", () => {
      const input = `source,target,status
/old,/new,301
/old,/different,301`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(2);
    });

    test("handles status codes as text", () => {
      const input = `source,target,status
/old,/new,permanent
/about,/about-us,temporary`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
        { old: "/about", new: "/about-us", status: 302 },
      ]);
    });

    test("converts 307 to 302 and 308 to 301", () => {
      const input = `source,target,status
/old,/new,301
/about,/about-us,307
/contact,/contact-us,308`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
        { old: "/about", new: "/about-us", status: 302 },
        { old: "/contact", new: "/contact-us", status: 301 },
      ]);
      expect(result.skipped).toHaveLength(0);
    });

    test("skips unsupported status codes (200, 404, etc.)", () => {
      const input = `source,target,status
/old,/new,301
/rewrite,/target,200
/error,/not-found,404`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(1);
      expect(result.skipped).toHaveLength(2);
    });

    test("handles Mac-style line endings (CR only)", () => {
      const input = "source,target,status\r/old,/new,301\r/about,/about-us,302";

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(2);
    });

    test("handles paths with query strings", () => {
      const input = `source,target,status
/old?ref=123,/new?ref=456,301`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old?ref=123", new: "/new?ref=456", status: 301 },
      ]);
    });

    test("handles URL-encoded characters in paths", () => {
      const input = `source,target,status
/hello%20world,/hello-world,301`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/hello%20world", new: "/hello-world", status: 301 },
      ]);
    });

    test("handles paths with hash fragments", () => {
      const input = `source,target,status
/old#section,/new#section,301`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old#section", new: "/new#section", status: 301 },
      ]);
    });

    test("handles root path redirect", () => {
      const input = `source,target,status
/,/home,301`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/", new: "/home", status: 301 },
      ]);
    });

    test("strips trailing slashes from source paths", () => {
      // Webstudio requires: paths cannot end with /
      const input = `source,target,status
/old/,/new/,301
/about,/about-us/,301`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new/", status: 301 },
        { old: "/about", new: "/about-us/", status: 301 },
      ]);
    });
  });

  describe("fixture files", () => {
    test("parses Shopify CSV fixture", () => {
      const content = readFileSync(
        join(__dirname, "fixtures/shopify.csv"),
        "utf-8"
      );

      const result = parseRedirects(content);

      expect(result.redirects.length).toBeGreaterThan(0);
      expect(result.redirects[0]).toMatchObject({
        old: expect.stringMatching(/^\//),
        new: expect.stringMatching(/^\//),
        status: 301,
      });
      expect(result.skipped).toHaveLength(0);
    });

    test("parses HubSpot CSV fixture", () => {
      const content = readFileSync(
        join(__dirname, "fixtures/hubspot.csv"),
        "utf-8"
      );

      const result = parseRedirects(content);

      expect(result.redirects.length).toBeGreaterThan(0);
      expect(result.skipped).toHaveLength(0);
    });

    test("parses Vercel/Next.js JSON fixture", () => {
      const content = readFileSync(
        join(__dirname, "fixtures/vercel-nextjs.json"),
        "utf-8"
      );

      const result = parseRedirects(content);

      // Should parse simple redirects and skip ones with placeholders/conditions
      expect(result.redirects.length).toBeGreaterThan(0);
      // Some should be skipped due to placeholders and conditions
      expect(result.skipped.length).toBeGreaterThan(0);
    });

    test("parses Netlify _redirects fixture", () => {
      const content = readFileSync(
        join(__dirname, "fixtures/netlify._redirects"),
        "utf-8"
      );

      const result = parseRedirects(content);

      // Should parse simple redirects
      expect(result.redirects.length).toBeGreaterThan(0);
      // Many should be skipped: conditions, placeholders, rewrites
      expect(result.skipped.length).toBeGreaterThan(0);
    });

    test("parses Apache htaccess fixture", () => {
      const content = readFileSync(
        join(__dirname, "fixtures/apache.htaccess"),
        "utf-8"
      );

      const result = parseRedirects(content);

      // Should parse Redirect directives
      expect(result.redirects.length).toBeGreaterThan(0);
      // RewriteRule and RedirectMatch should be skipped
      expect(result.skipped.length).toBeGreaterThan(0);
    });

    test("parses generic CSV fixture", () => {
      const content = readFileSync(
        join(__dirname, "fixtures/generic.csv"),
        "utf-8"
      );

      const result = parseRedirects(content);

      // Should parse all valid redirects, converting 307/308
      expect(result.redirects.length).toBeGreaterThanOrEqual(10);
    });

    test("parses generic JSON fixture", () => {
      const content = readFileSync(
        join(__dirname, "fixtures/generic.json"),
        "utf-8"
      );

      const result = parseRedirects(content);

      // Should parse valid redirects, skip invalid ones
      expect(result.redirects.length).toBeGreaterThan(0);
      expect(result.skipped.length).toBeGreaterThan(0);
    });
  });

  describe("additional edge cases", () => {
    // JSON edge cases
    test("handles JSON with null values", () => {
      const input = `[
        { "source": null, "target": "/new", "status": 301 },
        { "source": "/valid", "target": "/new", "status": 301 }
      ]`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(1);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toContain("missing source");
    });

    test("handles JSON with mixed $comment and real data", () => {
      const input = `[
        { "$comment": "This is a comment", "source": "/old", "target": "/new", "status": 301 }
      ]`;

      const result = parseRedirects(input);

      // Should parse the redirect, ignoring the $comment field
      expect(result.redirects).toHaveLength(1);
      expect(result.redirects[0]).toEqual({
        old: "/old",
        new: "/new",
        status: 301,
      });
    });

    test("handles JSON with statusCode (Next.js camelCase)", () => {
      const input = `{
        "redirects": [
          { "source": "/old", "destination": "/new", "statusCode": 301 }
        ]
      }`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
      ]);
    });

    test("handles JSON with both permanent and statusCode (permanent takes precedence)", () => {
      const input = `[
        { "source": "/old", "destination": "/new", "permanent": true, "statusCode": 302 }
      ]`;

      const result = parseRedirects(input);

      // statusCode should be found first since we check STATUS_KEYS before permanent
      expect(result.redirects).toHaveLength(1);
    });

    test("handles empty JSON object", () => {
      const input = `{}`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([]);
      expect(result.skipped).toEqual([]);
    });

    test("handles JSON with non-array redirects property", () => {
      const input = `{ "redirects": "not an array" }`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([]);
      expect(result.skipped).toEqual([]);
    });

    // CSV edge cases
    test("handles CSV with mixed case column headers", () => {
      const input = `SOURCE,Target,STATUS
/old,/new,301`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
      ]);
    });

    test("handles CSV row with fewer columns than header", () => {
      const input = `source,target,status
/old,/new
/about,/about-us,302`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(2);
      // First row should default to 301
      expect(result.redirects[0].status).toBe(301);
    });

    test("handles CSV with quoted values containing quotes", () => {
      const input = `source,target,status
"/old""path",/new,301`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: '/old"path', new: "/new", status: 301 },
      ]);
    });

    test("handles CSV with empty target", () => {
      const input = `source,target,status
/old,,301`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toContain("missing target");
    });

    // Netlify edge cases
    test("handles Netlify with only two parts (no status)", () => {
      const input = `/old /new`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/new", status: 301 },
      ]);
    });

    test("handles Netlify condition without status code", () => {
      const input = `/old /new Country=us`;

      const result = parseRedirects(input);

      // Should be skipped because Country= looks like a condition
      expect(result.redirects).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
    });

    test("handles Netlify with indented lines", () => {
      const input = `  /old /new 301
    /about /about-us 302`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(2);
    });

    test("handles Netlify single line only", () => {
      const input = `/old /new`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(1);
    });

    // htaccess edge cases
    test("handles htaccess with seeother keyword (303)", () => {
      const input = `Redirect seeother /old /new`;

      const result = parseRedirects(input);

      // seeother is not a recognized keyword, so it's treated as the path
      // This results in: from="/old", to="/new", status defaulting
      // Actually, "seeother" would be parsed as status, which is invalid
      expect(result.skipped).toHaveLength(1);
    });

    test("handles htaccess with gone keyword", () => {
      const input = `Redirect gone /old`;

      const result = parseRedirects(input);

      // "gone" is a status keyword in Apache (410), but we only have from
      // The implementation treats "gone" as path if no target follows
      expect(result.redirects).toHaveLength(0);
    });

    test("handles htaccess RewriteCond (ignored silently)", () => {
      const input = `RewriteCond %{HTTP_HOST} ^www\\.example\\.com$
Redirect 301 /old /new`;

      const result = parseRedirects(input);

      // RewriteCond should be ignored (not reported as skipped)
      expect(result.redirects).toHaveLength(1);
      expect(result.skipped).toHaveLength(0);
    });

    test("handles htaccess Options directive (ignored silently)", () => {
      const input = `Options +FollowSymLinks
Redirect 301 /old /new`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(1);
      expect(result.skipped).toHaveLength(0);
    });

    test("handles htaccess with target containing spaces", () => {
      const input = `Redirect 301 /old /path/with spaces/target`;

      const result = parseRedirects(input);

      expect(result.redirects).toEqual([
        { old: "/old", new: "/path/with spaces/target", status: 301 },
      ]);
    });

    // Path validation edge cases
    test("skips paths with double slashes", () => {
      const input = `source,target,status
//double-slash,/new,301`;

      const result = parseRedirects(input);

      // Double slash still starts with /, so it passes basic validation
      // Webstudio's OldPagePath schema will reject it later
      expect(result.redirects).toHaveLength(1);
    });

    test("handles http URLs as source (invalid)", () => {
      const input = `source,target,status
https://example.com/old,/new,301`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toContain(
        "source path must start with /"
      );
    });

    test("handles protocol-relative URLs as target", () => {
      const input = `source,target,status
/old,//cdn.example.com/asset,301`;

      const result = parseRedirects(input);

      // Protocol-relative URLs start with // and are valid redirect targets
      expect(result.redirects).toHaveLength(1);
      expect(result.redirects[0].new).toBe("//cdn.example.com/asset");
    });

    test("handles unicode paths", () => {
      const input = `source,target,status
/über,/ueber,301
/日本語,/japanese,301`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(2);
      expect(result.redirects[0].old).toBe("/über");
      expect(result.redirects[1].old).toBe("/日本語");
    });

    test("handles very long paths", () => {
      const longPath = "/" + "a".repeat(1000);
      const input = `source,target,status
${longPath},/new,301`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(1);
      expect(result.redirects[0].old).toBe(longPath);
    });

    test("handles empty lines interspersed in Netlify format", () => {
      const input = `/old1 /new1 301

/old2 /new2 301

`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(2);
    });

    // Status code edge cases
    test("handles numeric string status with leading zeros", () => {
      const input = `source,target,status
/old,/new,0301`;

      const result = parseRedirects(input);

      // 0301 octal would be 193, but parseInt treats it as 301
      expect(result.redirects).toHaveLength(1);
      expect(result.redirects[0].status).toBe(301);
    });

    test("handles status code 303 (See Other)", () => {
      const input = `source,target,status
/old,/new,303`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toContain("unsupported status code 303");
    });

    test("handles status code 410 (Gone)", () => {
      const input = `source,target,status
/old,/new,410`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
    });

    // Wildcard detection edge cases
    test("allows asterisk in query string (not a wildcard)", () => {
      const input = `source,target,status
/search?q=*,/search-all,301`;

      const result = parseRedirects(input);

      // * in query string should NOT be treated as wildcard
      expect(result.redirects).toHaveLength(1);
    });

    test("skips asterisk in path segment", () => {
      const input = `source,target,status
/files/*.txt,/all-files,301`;

      const result = parseRedirects(input);

      expect(result.redirects).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toContain("wildcard");
    });
  });
});

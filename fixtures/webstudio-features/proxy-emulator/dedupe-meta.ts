import { HTMLRewriter } from "@miniflare/html-rewriter";
import { Plugin } from "vite";

export const dedupeMeta: Plugin = {
  name: "html-rewriter-middleware",
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (
        req.headers["sec-fetch-dest"] !== "document" ||
        req.headers["sec-fetch-mode"] !== "navigate"
      ) {
        next();
        return;
      }

      // Capture the original response
      const originalWrite = res.write;
      const originalEnd = res.end;

      const buffers: Buffer[] = [];

      res.write = (chunk) => {
        buffers.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      };

      res.end = (chunk) => {
        if (chunk) {
          buffers.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }

        const body = Buffer.concat(buffers).toString("utf8");
        const response = new Response(body);

        const metasSet = new Set<string>();
        let hasTitle = false;
        let hasCanonicalLink = false;

        const rewriter = new HTMLRewriter()
          .on("meta", {
            element(element) {
              const propertyOrName =
                element.getAttribute("property") ||
                element.getAttribute("name");

              if (propertyOrName === null) {
                return;
              }

              if (propertyOrName === "viewport") {
                // Allow "viewport" property deduplication
                return;
              }

              if (metasSet.has(propertyOrName)) {
                console.info(
                  `Duplicate meta with name|property = ${propertyOrName} removed`
                );
                element.remove();
                return;
              }

              metasSet.add(propertyOrName);
            },
          })
          .on("title", {
            element(element) {
              if (hasTitle) {
                console.info(`Duplicate title removed`);
                element.remove();
                return;
              }

              hasTitle = true;
            },
          })
          .on('link[rel="canonical"]', {
            element(element) {
              if (hasCanonicalLink) {
                console.info(`Duplicate link rel canonical removed`);
                element.remove();
                return;
              }

              hasCanonicalLink = true;
            },
          });
        rewriter
          // @ts-ignore
          .transform(response)
          .text()
          .then((cleanedHtml) => {
            // Send the modified response
            res.setHeader("Content-Length", Buffer.byteLength(cleanedHtml));
            originalWrite.call(res, cleanedHtml, "utf-8");
            originalEnd.call(res, "", "utf-8");
          });

        return res;
      };

      next();
    });
  },
};

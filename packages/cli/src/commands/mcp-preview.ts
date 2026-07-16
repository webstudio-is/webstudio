import { createPreviewController } from "../preview-server";
import {
  captureScreenshotWithBrowserInstall,
  createScreenshotCaptureSession,
} from "../screenshot";
import { inspectGeneratedBuildMetrics } from "../generated-build-metrics";
import {
  preparePreviewProject,
  previewDefaultTemplate,
  type PreviewSource,
  validatePreviewServerOptions,
} from "./preview";

type McpPreviewController = Pick<
  ReturnType<typeof createPreviewController>,
  "startAndWait" | "status" | "resolveUrl"
> &
  Partial<Pick<ReturnType<typeof createPreviewController>, "stop">>;

type McpPreviewInput = {
  host?: string;
  port?: number;
  source?: PreviewSource;
  imageDomains?: string[];
};

type CaptureScreenshotInput = Parameters<
  typeof captureScreenshotWithBrowserInstall
>[0];

type McpScreenshotInput = {
  url?: string;
  baseUrl?: string;
  path?: string;
  output?: string;
  host?: string;
  port?: number;
  imageDomains?: string[];
  viewport: { width: number; height: number };
  fullPage?: boolean;
  includeImageMetrics?: boolean;
  includeResourceMetrics?: boolean;
  includeContrastMetrics?: boolean;
  browser?: CaptureScreenshotInput["browser"];
  browserPath?: string;
  waitUntil?: CaptureScreenshotInput["waitUntil"];
  waitForSelector?: string;
  waitForTimeout?: number;
  timeout?: number;
  source?: PreviewSource;
  format?: "png" | "jpeg" | "webp";
  quality?: number;
  scale?: number;
};

type McpToolProgress = {
  report: (message: string) => void;
};

const prepareDefaultPreviewProject = (
  source: PreviewSource = "local",
  prepareSessionDataFile?: () => Promise<void>
) =>
  preparePreviewProject({
    assets: true,
    template: [...previewDefaultTemplate],
    generate: true,
    source,
    syncIfMissing: true,
    silent: true,
    prepareSessionDataFile,
  });

export const createMcpPreviewHandlers = ({
  preview,
  isStale = () => true,
  markFresh = () => undefined,
  preparePreview = prepareDefaultPreviewProject,
  prepareSessionDataFile,
  captureScreenshot = captureScreenshotWithBrowserInstall,
  createCaptureSession,
}: {
  preview: McpPreviewController;
  isStale?: () => boolean;
  markFresh?: () => void;
  preparePreview?: typeof prepareDefaultPreviewProject;
  prepareSessionDataFile?: () => Promise<void>;
  captureScreenshot?: typeof captureScreenshotWithBrowserInstall;
  createCaptureSession?: typeof createScreenshotCaptureSession;
}) => {
  let captureSession:
    | ReturnType<typeof createScreenshotCaptureSession>
    | undefined;
  const closeCaptureSession = async () => {
    try {
      await captureSession?.close();
    } finally {
      captureSession = undefined;
    }
  };
  const rejectBuilderUrl = (value: string) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return;
    }
    const isProjectHost =
      url.hostname.startsWith("p-") &&
      (url.hostname.endsWith(".wstd.dev") ||
        url.hostname.endsWith(".apps.webstudio.is"));
    if (
      isProjectHost &&
      url.searchParams.has("authToken") &&
      url.searchParams.has("mode")
    ) {
      throw Object.assign(
        new Error(
          "This is an authenticated Builder/share URL, not a generated-site preview. Use the share URL with webstudio init --link, then capture a generated route with screenshot { path }, or pass an intentional standalone site URL without Builder authentication parameters."
        ),
        { code: "BUILDER_URL_IS_NOT_SITE_PREVIEW" }
      );
    }
  };
  const resolveScreenshotUrl = async (
    input: McpScreenshotInput,
    progress?: McpToolProgress
  ) => {
    if (input.url !== undefined) {
      rejectBuilderUrl(input.url);
      return input.url;
    }
    if (input.path === undefined) {
      throw new Error("MCP screenshot requires url or path.");
    }
    if (input.baseUrl !== undefined) {
      rejectBuilderUrl(input.baseUrl);
      return new URL(input.path, input.baseUrl).toString();
    }
    const hasExplicitPreviewTarget =
      input.host !== undefined || input.port !== undefined;
    if (
      preview.status().running === false ||
      isStale() ||
      hasExplicitPreviewTarget
    ) {
      await closeCaptureSession();
      validatePreviewServerOptions({
        host: input.host ?? "127.0.0.1",
        port: input.port ?? 5173,
        imageDomains: input.imageDomains,
      });
      progress?.report("tool screenshot preparing generated preview project");
      const previewProject = await preparePreview(
        input.source,
        prepareSessionDataFile
      );
      progress?.report("tool screenshot starting production preview server");
      await preview.startAndWait({
        cwd: previewProject.cwd,
        buildCacheKey: previewProject.buildCacheKey,
        host: input.host,
        port: input.port,
        imageDomains: input.imageDomains,
        restart: true,
      });
      markFresh();
    }
    return preview.resolveUrl(input.path);
  };
  const getCaptureOptions = (input: McpScreenshotInput, url: string) => ({
    url,
    output: input.output,
    width: input.viewport.width,
    height: input.viewport.height,
    fullPage: input.fullPage,
    includeImageMetrics: input.includeImageMetrics,
    includeResourceMetrics: input.includeResourceMetrics,
    includeContrastMetrics: input.includeContrastMetrics,
    browser: input.browser ?? "auto",
    browserPath: input.browserPath,
    waitUntil: input.waitUntil,
    waitForSelector: input.waitForSelector,
    waitForTimeout: input.waitForTimeout,
    timeout: input.timeout,
    format: input.format,
    quality: input.quality,
    scale: input.scale,
  });
  return {
    async startPreview(input: McpPreviewInput, progress?: McpToolProgress) {
      await closeCaptureSession();
      validatePreviewServerOptions({
        host: input.host ?? "127.0.0.1",
        port: input.port ?? 5173,
        imageDomains: input.imageDomains,
      });
      progress?.report(
        "tool preview.start preparing generated preview project"
      );
      const previewProject = await preparePreview(
        input.source,
        prepareSessionDataFile
      );
      progress?.report("tool preview.start starting production preview server");
      const result = await preview.startAndWait({
        ...input,
        cwd: previewProject.cwd,
        buildCacheKey: previewProject.buildCacheKey,
        restart: true,
      });
      markFresh();
      return {
        ...result,
        generatedBuildMetrics: await inspectGeneratedBuildMetrics(
          previewProject.cwd
        ),
      };
    },
    async captureScreenshot(
      input: McpScreenshotInput,
      progress?: McpToolProgress
    ) {
      const url = await resolveScreenshotUrl(input, progress);
      progress?.report(`tool screenshot capturing ${url}`);
      const captureOptions = getCaptureOptions(input, url);
      if (input.source === "session" && createCaptureSession !== undefined) {
        captureSession ??= createCaptureSession();
        return await captureSession.capture(captureOptions);
      }
      return await captureScreenshot({
        ...captureOptions,
        isJson: false,
        isMcp: true,
        isInteractive: false,
        confirmInstall: async () => false,
      });
    },
    async capturePageScreenshots(
      inputs: readonly McpScreenshotInput[],
      progress?: McpToolProgress
    ) {
      const firstInput = inputs[0];
      if (firstInput === undefined) {
        return [];
      }
      if (
        createCaptureSession === undefined ||
        firstInput.source !== "session" ||
        inputs.some((input) => input.source !== firstInput.source)
      ) {
        throw new Error(
          "Resized screenshot capture requires session preview pages."
        );
      }
      const urls: string[] = [];
      for (const input of inputs) {
        urls.push(await resolveScreenshotUrl(input, progress));
      }
      progress?.report(
        `tool screenshot capturing ${new Set(urls).size} pages across ${inputs.length} viewport widths`
      );
      captureSession ??= createCaptureSession();
      return await captureSession.capturePage(
        inputs.map((input, index) => {
          const url = urls[index];
          if (url === undefined) {
            throw new Error("Screenshot URL resolution was incomplete.");
          }
          return getCaptureOptions(input, url);
        })
      );
    },
    async stopPreview() {
      const errors: unknown[] = [];
      try {
        await closeCaptureSession();
      } catch (error) {
        errors.push(error);
      }
      let result;
      try {
        if (preview.stop === undefined) {
          throw new Error("Preview controller cannot stop its owned preview.");
        }
        result = await preview.stop();
      } catch (error) {
        errors.push(error);
      }
      if (errors.length === 1) {
        throw errors[0];
      }
      if (errors.length > 1) {
        throw new AggregateError(
          errors,
          "Could not clean up screenshot capture or stop the owned preview."
        );
      }
      if (result === undefined) {
        throw new Error("Preview controller did not return its stopped state.");
      }
      return result;
    },
  };
};

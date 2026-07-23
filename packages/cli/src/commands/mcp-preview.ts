import {
  arePreviewImageDomainsEqual,
  createPreviewController,
  type PreviewMode,
} from "../preview-server";
import {
  captureScreenshotWithBrowserInstall,
  createScreenshotCaptureSession,
} from "../screenshot";
import { inspectGeneratedBuildMetrics } from "../generated-build-metrics";
import { createExclusiveAsyncRunner } from "../async-utils";
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
  Partial<
    Pick<ReturnType<typeof createPreviewController>, "canReuse" | "stop">
  >;

type McpPreviewInput = {
  host?: string;
  port?: number;
  source?: PreviewSource;
  imageDomains?: string[];
  mode?: PreviewMode;
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
  mode?: PreviewMode;
  format?: "png" | "jpeg" | "webp";
  quality?: number;
  scale?: number;
};

type McpToolProgress = {
  report: (message: string) => void;
};

export const createPreviewFreshness = () => {
  let revision = 0;
  let freshRevision = -1;
  return {
    markStale() {
      revision += 1;
    },
    isStale: () => freshRevision !== revision,
    capture: () => revision,
    markFresh(capturedRevision: number) {
      if (capturedRevision === revision) {
        freshRevision = revision;
      }
    },
  };
};

type CaptureSessionConfig = Pick<
  CaptureScreenshotInput,
  "browser" | "browserPath"
>;

const getCaptureSessionConfig = (
  input: McpScreenshotInput
): CaptureSessionConfig => ({
  browser: input.browser ?? "auto",
  browserPath: input.browserPath,
});

const isSameCaptureSessionConfig = (
  left: CaptureSessionConfig,
  right: CaptureSessionConfig
) => left.browser === right.browser && left.browserPath === right.browserPath;

const defaultPreviewSource = "session" satisfies PreviewSource;
const getPreviewSource = (source: PreviewSource | undefined): PreviewSource =>
  source ?? defaultPreviewSource;

const getPreviewTarget = (input: McpPreviewInput) => ({
  source: getPreviewSource(input.source),
  mode: input.mode ?? "iterative",
  host: input.host ?? "127.0.0.1",
  port: input.port ?? 5173,
  imageDomains: input.imageDomains,
});

const isSamePreviewTarget = (
  left: ReturnType<typeof getPreviewTarget>,
  right: ReturnType<typeof getPreviewTarget>
) =>
  left.source === right.source &&
  left.mode === right.mode &&
  left.host === right.host &&
  left.port === right.port &&
  arePreviewImageDomainsEqual(left.imageDomains, right.imageDomains);

const prepareDefaultPreviewProject = (
  source: PreviewSource = defaultPreviewSource,
  prepareSessionDataFile?: () => Promise<void>,
  {
    preserveGeneratedProject = false,
    prepareForIncrementalGeneration = false,
  }: {
    preserveGeneratedProject?: boolean;
    prepareForIncrementalGeneration?: boolean;
  } = {}
) =>
  preparePreviewProject({
    assets: true,
    template: [...previewDefaultTemplate],
    generate: true,
    source,
    syncIfMissing: true,
    silent: true,
    includeDraftPages: true,
    prepareSessionDataFile,
    preserveGeneratedProject,
    prepareForIncrementalGeneration,
  });

export const createMcpPreviewHandlers = ({
  preview,
  isStale = () => true,
  captureFreshness = () => 0,
  markFresh = () => undefined,
  preparePreview = prepareDefaultPreviewProject,
  prepareSessionDataFile,
  captureScreenshot = captureScreenshotWithBrowserInstall,
  createCaptureSession,
}: {
  preview: McpPreviewController;
  isStale?: () => boolean;
  captureFreshness?: () => number;
  markFresh?: (freshness: number) => void;
  preparePreview?: typeof prepareDefaultPreviewProject;
  prepareSessionDataFile?: () => Promise<void>;
  captureScreenshot?: typeof captureScreenshotWithBrowserInstall;
  createCaptureSession?: typeof createScreenshotCaptureSession;
}) => {
  let captureSession:
    | ReturnType<typeof createScreenshotCaptureSession>
    | undefined;
  let captureSessionConfig: CaptureSessionConfig | undefined;
  let activeSource: PreviewSource | undefined;
  const runPreviewLifecycle = createExclusiveAsyncRunner();
  const closeCaptureSession = async () => {
    try {
      await captureSession?.close();
    } finally {
      captureSession = undefined;
      captureSessionConfig = undefined;
    }
  };
  const getCaptureSession = async (input: McpScreenshotInput) => {
    if (createCaptureSession === undefined) {
      throw new Error("Reusable screenshot capture is unavailable.");
    }
    const nextConfig = getCaptureSessionConfig(input);
    if (
      captureSessionConfig !== undefined &&
      isSameCaptureSessionConfig(captureSessionConfig, nextConfig) === false
    ) {
      await closeCaptureSession();
    }
    captureSession ??= createCaptureSession();
    captureSessionConfig = nextConfig;
    return captureSession;
  };
  const isPreviewTargetCompatible = (
    input: McpPreviewInput,
    mode: PreviewMode,
    status: ReturnType<McpPreviewController["status"]>
  ) => {
    return (
      preview.canReuse?.({
        host: input.host,
        port: input.port,
        imageDomains: input.imageDomains,
        mode,
      }) ??
      (status.running &&
        status.mode === mode &&
        input.host === undefined &&
        input.port === undefined &&
        input.imageDomains === undefined)
    );
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
    if (isProjectHost) {
      throw Object.assign(
        new Error(
          'This is a Webstudio Builder/share URL, not a generated site. Link the project with webstudio init --link, then capture only the generated site with screenshot { path: "/" }. Do not screenshot the Builder UI.'
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
    const mode = input.mode ?? "iterative";
    const source = getPreviewSource(input.source);
    const previewStatus = preview.status();
    const targetCompatible = isPreviewTargetCompatible(
      input,
      mode,
      previewStatus
    );
    if (
      previewStatus.running === false ||
      targetCompatible === false ||
      (activeSource !== undefined && activeSource !== source) ||
      isStale()
    ) {
      const canReusePreview = mode === "iterative" && targetCompatible;
      if (canReusePreview === false) {
        await closeCaptureSession();
      }
      validatePreviewServerOptions({
        host: input.host ?? "127.0.0.1",
        port: input.port ?? 5173,
        imageDomains: input.imageDomains,
      });
      progress?.report("tool screenshot preparing generated preview project");
      const freshness = captureFreshness();
      const previewProject = await preparePreview(
        source,
        prepareSessionDataFile,
        {
          preserveGeneratedProject: canReusePreview && mode === "iterative",
          prepareForIncrementalGeneration: mode === "iterative",
        }
      );
      progress?.report(
        `tool screenshot ${canReusePreview ? "refreshing" : "starting"} ${mode} preview server`
      );
      await preview.startAndWait({
        cwd: previewProject.cwd,
        buildCacheKey: previewProject.buildCacheKey,
        host: input.host,
        port: input.port,
        imageDomains: input.imageDomains,
        mode,
        restart: canReusePreview === false,
      });
      activeSource = source;
      markFresh(freshness);
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
  const assertGeneratedSiteCapture = (
    input: McpScreenshotInput,
    result: Awaited<ReturnType<typeof captureScreenshot>>
  ) => {
    if (
      input.path !== undefined &&
      input.baseUrl === undefined &&
      result.navigation?.generatedSiteRootPresent === false
    ) {
      throw Object.assign(
        new Error(
          'Screenshot did not render the generated Webstudio site. Capture the route with screenshot { path: "/" }; do not capture the Builder UI.'
        ),
        { code: "SCREENSHOT_NOT_GENERATED_SITE" }
      );
    }
    return result;
  };
  return {
    async startPreview(input: McpPreviewInput, progress?: McpToolProgress) {
      return await runPreviewLifecycle(async () => {
        const mode = input.mode ?? "iterative";
        const source = getPreviewSource(input.source);
        const canReusePreview =
          mode === "iterative" &&
          isPreviewTargetCompatible(input, mode, preview.status());
        if (canReusePreview === false) {
          await closeCaptureSession();
        }
        validatePreviewServerOptions({
          host: input.host ?? "127.0.0.1",
          port: input.port ?? 5173,
          imageDomains: input.imageDomains,
        });
        progress?.report(
          "tool preview.start preparing generated preview project"
        );
        const freshness = captureFreshness();
        const previewProject = await preparePreview(
          source,
          prepareSessionDataFile,
          {
            preserveGeneratedProject: canReusePreview && mode === "iterative",
            prepareForIncrementalGeneration: mode === "iterative",
          }
        );
        progress?.report(
          `tool preview.start ${canReusePreview ? "refreshing" : "starting"} ${mode} preview server`
        );
        const result = await preview.startAndWait({
          ...input,
          mode,
          cwd: previewProject.cwd,
          buildCacheKey: previewProject.buildCacheKey,
          restart: canReusePreview === false,
        });
        activeSource = source;
        markFresh(freshness);
        return {
          ...result,
          ...(mode === "production"
            ? {
                generatedBuildMetrics: await inspectGeneratedBuildMetrics(
                  previewProject.cwd
                ),
              }
            : {}),
        };
      });
    },
    async captureScreenshot(
      input: McpScreenshotInput,
      progress?: McpToolProgress
    ) {
      return await runPreviewLifecycle(async () => {
        const startedAt = Date.now();
        const url = await resolveScreenshotUrl(input, progress);
        const previewReadyAt = Date.now();
        progress?.report(`tool screenshot capturing ${url}`);
        const captureOptions = getCaptureOptions(input, url);
        let result: Awaited<ReturnType<typeof captureScreenshot>>;
        if (
          getPreviewSource(input.source) !== "local" &&
          createCaptureSession !== undefined
        ) {
          result = await (
            await getCaptureSession(input)
          ).capture(captureOptions);
        } else {
          result = await captureScreenshot({
            ...captureOptions,
            isJson: false,
            isMcp: true,
            isInteractive: false,
            confirmInstall: async () => false,
          });
        }
        const completedAt = Date.now();
        return {
          ...assertGeneratedSiteCapture(input, result),
          ...(input.path !== undefined && input.baseUrl === undefined
            ? { previewMode: preview.status().mode }
            : {}),
          lifecycleTimings: {
            previewRefreshMs: previewReadyAt - startedAt,
            captureMs: completedAt - previewReadyAt,
            totalMs: completedAt - startedAt,
          },
        };
      });
    },
    async capturePageScreenshots(
      inputs: readonly McpScreenshotInput[],
      progress?: McpToolProgress
    ) {
      return await runPreviewLifecycle(async () => {
        const firstInput = inputs[0];
        if (firstInput === undefined) {
          return [];
        }
        const previewTarget = getPreviewTarget(firstInput);
        if (
          createCaptureSession === undefined ||
          previewTarget.source === "local" ||
          inputs.some(
            (input) =>
              isSamePreviewTarget(getPreviewTarget(input), previewTarget) ===
                false ||
              isSameCaptureSessionConfig(
                getCaptureSessionConfig(input),
                getCaptureSessionConfig(firstInput)
              ) === false
          )
        ) {
          throw new Error(
            "Resized screenshot capture requires one session preview target and browser configuration."
          );
        }
        const urls: string[] = [];
        for (const input of inputs) {
          urls.push(await resolveScreenshotUrl(input, progress));
        }
        progress?.report(
          `tool screenshot capturing ${new Set(urls).size} pages across ${inputs.length} viewport widths`
        );
        const results = await (
          await getCaptureSession(firstInput)
        ).capturePage(
          inputs.map((input, index) => {
            const url = urls[index];
            if (url === undefined) {
              throw new Error("Screenshot URL resolution was incomplete.");
            }
            return getCaptureOptions(input, url);
          })
        );
        return results.map((result, index) => {
          const input = inputs[index];
          if (input === undefined) {
            throw new Error("Screenshot input was omitted from the batch.");
          }
          return {
            ...assertGeneratedSiteCapture(input, result),
            ...(input.path !== undefined && input.baseUrl === undefined
              ? { previewMode: preview.status().mode }
              : {}),
          };
        });
      });
    },
    async stopPreview() {
      return await runPreviewLifecycle(async () => {
        const errors: unknown[] = [];
        try {
          await closeCaptureSession();
        } catch (error) {
          errors.push(error);
        }
        let result;
        try {
          if (preview.stop === undefined) {
            throw new Error(
              "Preview controller cannot stop its owned preview."
            );
          }
          result = await preview.stop();
          activeSource = undefined;
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
          throw new Error(
            "Preview controller did not return its stopped state."
          );
        }
        return result;
      });
    },
  };
};

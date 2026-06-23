import * as path from "node:path";
import { FileStore } from "@tus/file-store";
import { S3Store } from "@tus/s3-store";
import { Server, type DataStore, type Upload } from "@tus/server";
import {
  maxProjectBundleSize,
  stagedUploadPath,
  stagedUploadProjectIdHeader,
} from "@webstudio-is/protocol";
import env from "~/env/env.server";
import { createContext } from "~/shared/context.server";
import { assertProjectBuildPermit as defaultAssertProjectBuildPermit } from "./project-import.server";

const stagedUploadExpiration = 60 * 60 * 1000;
const authTokenHeader = "x-auth-token";
const localUploadDirectory = path.join(process.cwd(), ".webstudio", "uploads");
const s3Env = [
  "S3_ENDPOINT",
  "S3_REGION",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_BUCKET",
] as const;
type StagedUploadStorageEnv = Pick<typeof env, (typeof s3Env)[number]>;

type ReadableDataStore = DataStore & {
  read(
    uploadId: string
  ): NodeJS.ReadableStream | Promise<NodeJS.ReadableStream>;
};

type StagedUploadServerDependencies = {
  assertProjectBuildPermit?: typeof defaultAssertProjectBuildPermit;
  createContext?: typeof createContext;
  datastore?: DataStore;
};

const createStagedUploadStore = (
  environment: StagedUploadStorageEnv = env
): DataStore => {
  const getEnvValue = (name: (typeof s3Env)[number]) => {
    const value = environment[name]?.trim();
    return value === "" ? undefined : value;
  };
  const isS3Configured = s3Env.some((name) => getEnvValue(name) !== undefined);
  if (isS3Configured) {
    const missingEnv = s3Env.filter((name) => getEnvValue(name) === undefined);
    if (missingEnv.length > 0) {
      throw new Error(
        `Staged upload storage is missing required environment variables: ${missingEnv.join(", ")}`
      );
    }
    const endpoint = getEnvValue("S3_ENDPOINT");
    const region = getEnvValue("S3_REGION");
    const accessKeyId = getEnvValue("S3_ACCESS_KEY_ID");
    const secretAccessKey = getEnvValue("S3_SECRET_ACCESS_KEY");
    const bucket = getEnvValue("S3_BUCKET");
    if (
      endpoint === undefined ||
      region === undefined ||
      accessKeyId === undefined ||
      secretAccessKey === undefined ||
      bucket === undefined
    ) {
      throw new Error("Staged upload storage is not configured.");
    }
    return new S3Store({
      expirationPeriodInMilliseconds: stagedUploadExpiration,
      partSize: 8 * 1024 * 1024,
      useTags: false,
      s3ClientConfig: {
        endpoint,
        region,
        bucket,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      },
    });
  }

  return new FileStore({
    directory: localUploadDirectory,
    expirationPeriodInMilliseconds: stagedUploadExpiration,
  });
};

const assertUploadProject = (upload: Upload, projectId: string) => {
  if (upload.metadata?.projectId !== projectId) {
    throw new Error("Staged upload does not belong to this project.");
  }
};

const getRequiredHeader = (request: Request, name: string, label: string) => {
  const value = request.headers.get(name)?.trim();
  if (value === undefined || value === "") {
    throw new Error(`${label} is required.`);
  }
  return value;
};

const getUploadProjectId = (request: Request) =>
  getRequiredHeader(request, stagedUploadProjectIdHeader, "Project id");

const assertAuthorizedUploadRequest = async (
  request: Request,
  {
    assertProjectBuildPermit = defaultAssertProjectBuildPermit,
    createContext: createRequestContext = createContext,
  }: StagedUploadServerDependencies
) => {
  getRequiredHeader(request, authTokenHeader, "Auth token");

  const projectId = getUploadProjectId(request);
  const context = await createRequestContext(request);
  await assertProjectBuildPermit({ ctx: context, projectId });
};

const createStagedUploadServer = (
  dependencies: StagedUploadServerDependencies = {}
) =>
  new Server({
    path: stagedUploadPath,
    datastore: dependencies.datastore ?? createStagedUploadStore(),
    maxSize: maxProjectBundleSize,
    relativeLocation: false,
    respectForwardedHeaders: true,
    allowedHeaders: [authTokenHeader, stagedUploadProjectIdHeader],
    async onIncomingRequest(request) {
      await assertAuthorizedUploadRequest(
        request as unknown as Request,
        dependencies
      );
    },
    async onUploadCreate(request, upload) {
      const projectId = getUploadProjectId(request as unknown as Request);
      if (upload.metadata?.projectId !== projectId) {
        throw new Error("Upload project id does not match request project id.");
      }
      return { metadata: { ...upload.metadata, projectId } };
    },
  });

const stagedUploadServer = createStagedUploadServer();

export const handleStagedUploadRequest = async (request: Request) => {
  return await stagedUploadServer.handleWeb(request);
};

const readText = async (stream: NodeJS.ReadableStream) => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
};

export const readStagedUploadText = async ({
  projectId,
  uploadId,
}: {
  projectId: string;
  uploadId: string;
}) => {
  const datastore = stagedUploadServer.datastore as ReadableDataStore;
  const upload = await datastore.getUpload(uploadId);
  assertUploadProject(upload, projectId);
  return await readText(await datastore.read(uploadId));
};

export const removeStagedUpload = async (uploadId: string) => {
  await stagedUploadServer.datastore.remove(uploadId);
};

export const __testing__ = {
  createStagedUploadStore,
  createStagedUploadServer,
};

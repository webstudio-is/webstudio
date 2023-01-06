import * as process from "process";

export const config = {
  storybookShots: {
    storybookUrl: "packages/design-system/storybook-static",
  },
  lostPixelProjectId: "clckoyuix110903101s75d4s71fc",
  lostPixelUrl: "https://app.gitbased.lost-pixel.com/api/callback",
  s3: {
    endPoint: "ams3.digitaloceanspaces.com",
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    bucketName: "beta-seven-turtle-time-blue-narrow",
  },
};

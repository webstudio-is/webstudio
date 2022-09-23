"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
var process = require("process");
exports.config = {
  storybookShots: {
    storybookUrl: "storybook-static",
  },
  lostPixelProjectId: "cl8a8xmx714904901m9oce4vhqc",
  s3: {
    endPoint: "ams3.digitaloceanspaces.com",
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    bucketName: "beta-seven-turtle-time-blue-narrow",
  },
};

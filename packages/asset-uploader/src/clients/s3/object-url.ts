import { extendedEncodeURIComponent } from "../../utils/sanitize-s3-key";

export const createS3ObjectUrl = ({
  endpoint,
  bucket,
  key,
}: {
  endpoint: string;
  bucket: string;
  key: string;
}) => new URL(`/${bucket}/${extendedEncodeURIComponent(key)}`, endpoint);

import { extendedEncodeURIComponent } from "../../utils/sanitize-s3-key";

type S3ObjectKeyType = "flat" | "hierarchical";

/**
 * Logical asset-database keys contain meaningful `/` separators and already
 * escaped dynamic segments. Encoding the whole key would turn those separators
 * into `%2F`, so S3-compatible storage would receive a flat object name instead
 * of the intended hierarchy. Encode hierarchical keys one segment at a time;
 * the second encoding of `%` is intentional because this layer produces the
 * HTTP request path, not the persisted logical key. Legacy asset keys remain
 * flat to preserve their existing storage contract.
 */
export const createS3ObjectUrl = ({
  endpoint,
  bucket,
  key,
  keyType,
}: {
  endpoint: string;
  bucket: string;
  key: string;
  keyType: S3ObjectKeyType;
}) => {
  const encodedKey =
    keyType === "hierarchical"
      ? key.split("/").map(extendedEncodeURIComponent).join("/")
      : extendedEncodeURIComponent(key);
  return new URL(`/${bucket}/${encodedKey}`, endpoint);
};

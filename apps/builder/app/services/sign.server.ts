const importStringKey = async (myStringKey: string, keyUsage: KeyUsage) => {
  const keyData = new TextEncoder().encode(myStringKey);
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    [keyUsage]
  );
};

export const toBase64Url = (buffer: ArrayBuffer) => {
  return Buffer.from(buffer).toString("base64url");
};

export const fromBase64Url = (base64Url: string): ArrayBuffer => {
  return Buffer.from(base64Url, "base64url");
};

export const sign = async (message: string, secret: string) => {
  const encoder = new TextEncoder();
  const encodedMessage = encoder.encode(message);
  const secretKey = await importStringKey(secret, "sign");
  const signature = await crypto.subtle.sign("HMAC", secretKey, encodedMessage);

  return `${toBase64Url(encodedMessage)}.${toBase64Url(signature)}`;
};

export const verify = async (signedMessage: string, secret: string) => {
  const [messageBase64, signatureBase64] = signedMessage.split(".") as [
    string,
    string | undefined,
  ];

  if (signatureBase64 === undefined) {
    return false;
  }
  const message = fromBase64Url(messageBase64);
  const signature = fromBase64Url(signatureBase64);

  const secretKey = await importStringKey(secret, "verify");

  return await crypto.subtle.verify("HMAC", secretKey, signature, message);
};

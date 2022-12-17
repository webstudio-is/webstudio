export const toUint8Array = async (data: AsyncIterable<Uint8Array>) => {
  const result = [];
  for await (const chunk of data) {
    result.push(Buffer.from(chunk));
  }

  return new Uint8Array(Buffer.concat(result));
};

export const toUint8Array = async (data: AsyncIterable<Uint8Array>) => {
  const result = [];
  for await (const chunk of data) {
    for (const byte of chunk) {
      result.push(byte);
    }
  }

  return Uint8Array.from(result);
};

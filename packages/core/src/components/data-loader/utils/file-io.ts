export async function readFileOptimized(file: File): Promise<ArrayBuffer> {
  if (file.size < 10 * 1024 * 1024) {
    return file.arrayBuffer();
  }
  const chunkSize = 8 * 1024 * 1024;
  const chunks: Uint8Array[] = [];
  let offset = 0;
  while (offset < file.size) {
    const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size));
    const chunkBuffer = await chunk.arrayBuffer();
    chunks.push(new Uint8Array(chunkBuffer));
    offset += chunkSize;
    // yield control
     
    await new Promise((r) => setTimeout(r, 0));
  }
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let position = 0;
  for (const c of chunks) {
    result.set(c, position);
    position += c.length;
  }
  return result.buffer;
}



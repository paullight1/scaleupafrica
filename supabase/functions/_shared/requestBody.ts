export type BoundedBodyResult =
  | { ok: true; body: string; bytes: number }
  | { ok: false; status: 413 };

/**
 * Read a request body without ever buffering more than maxBytes.
 *
 * Content-Length is treated as an early rejection hint only; the streamed byte
 * count remains authoritative because the header can be absent or dishonest.
 */
export async function readBoundedText(
  request: Request,
  maxBytes: number,
): Promise<BoundedBodyResult> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new Error("maxBytes must be a non-negative safe integer");
  }

  const lengthHeader = request.headers.get("content-length");
  if (lengthHeader && /^\d+$/.test(lengthHeader.trim())) {
    const declared = Number(lengthHeader);
    if (Number.isSafeInteger(declared) && declared > maxBytes) {
      return { ok: false, status: 413 };
    }
  }

  if (!request.body) return { ok: true, body: "", bytes: 0 };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > maxBytes) {
      try {
        await reader.cancel();
      } catch {
        // The response is already determined; cancellation is best-effort.
      }
      return { ok: false, status: 413 };
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return {
    ok: true,
    body: new TextDecoder().decode(merged),
    bytes: total,
  };
}

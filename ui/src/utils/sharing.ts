import type { Annotation, SharePayload, SerializedAnnotation } from "../types";

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function fromBase64Url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function compress(data: string): Promise<Uint8Array> {
  const stream = new CompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  writer.write(encoder.encode(data));
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

async function decompress(data: Uint8Array): Promise<string> {
  const stream = new DecompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  writer.write(data);
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(result);
}

function serializeAnnotation(a: Annotation): SerializedAnnotation {
  switch (a.type) {
    case "DELETION":
      return ["D", a.originalText];
    case "REPLACEMENT":
      return ["R", a.originalText, a.text ?? ""];
    case "COMMENT":
      return ["C", a.originalText, a.text ?? ""];
    case "INSERTION":
      return ["I", a.originalText, a.text ?? ""];
    case "GLOBAL_COMMENT":
      return ["G", a.text ?? ""];
  }
}

function deserializeAnnotation(s: SerializedAnnotation): Annotation {
  const base = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  switch (s[0]) {
    case "D":
      return { ...base, type: "DELETION", originalText: s[1] };
    case "R":
      return { ...base, type: "REPLACEMENT", originalText: s[1], text: s[2] };
    case "C":
      return { ...base, type: "COMMENT", originalText: s[1], text: s[2] };
    case "I":
      return { ...base, type: "INSERTION", originalText: s[1], text: s[2] };
    case "G":
      return { ...base, type: "GLOBAL_COMMENT", originalText: "", text: s[1] };
  }
}

export async function encodeShareUrl(
  plan: { name: string; overview: string; body: string },
  annotations: Annotation[],
): Promise<string> {
  const payload: SharePayload = {
    p: plan.body,
    n: plan.name,
    o: plan.overview,
    a: annotations.map(serializeAnnotation),
  };
  const json = JSON.stringify(payload);
  const compressed = await compress(json);
  const encoded = toBase64Url(compressed);
  const url = new URL(window.location.href);
  url.hash = encoded;
  url.search = "";
  return url.toString();
}

export async function decodeShareUrl(hash: string): Promise<{
  plan: { name: string; overview: string; body: string };
  annotations: Annotation[];
} | null> {
  try {
    const clean = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!clean) return null;
    const bytes = fromBase64Url(clean);
    const json = await decompress(bytes);
    const payload = JSON.parse(json) as SharePayload;
    return {
      plan: { name: payload.n, overview: payload.o, body: payload.p },
      annotations: payload.a.map(deserializeAnnotation),
    };
  } catch {
    return null;
  }
}

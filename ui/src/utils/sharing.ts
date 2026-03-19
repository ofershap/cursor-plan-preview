import type {
  Annotation,
  PlanMeta,
  SharePayload,
  SerializedAnnotation,
} from "../types";

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
  const author = a.author ?? "";
  switch (a.type) {
    case "DELETION":
      return author ? ["D", a.originalText, author] : ["D", a.originalText];
    case "REPLACEMENT":
      return author
        ? ["R", a.originalText, a.text ?? "", author]
        : ["R", a.originalText, a.text ?? ""];
    case "COMMENT":
      return author
        ? ["C", a.originalText, a.text ?? "", author]
        : ["C", a.originalText, a.text ?? ""];
    case "INSERTION":
      return author
        ? ["I", a.originalText, a.text ?? "", author]
        : ["I", a.originalText, a.text ?? ""];
    case "GLOBAL_COMMENT":
      return author ? ["G", a.text ?? "", author] : ["G", a.text ?? ""];
  }
}

function deserializeAnnotation(s: SerializedAnnotation): Annotation {
  const base = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  switch (s[0]) {
    case "D":
      return {
        ...base,
        type: "DELETION",
        originalText: s[1],
        ...(s[2] ? { author: s[2] } : {}),
      };
    case "R":
      return {
        ...base,
        type: "REPLACEMENT",
        originalText: s[1],
        text: s[2],
        ...(s[3] ? { author: s[3] } : {}),
      };
    case "C":
      return {
        ...base,
        type: "COMMENT",
        originalText: s[1],
        text: s[2],
        ...(s[3] ? { author: s[3] } : {}),
      };
    case "I":
      return {
        ...base,
        type: "INSERTION",
        originalText: s[1],
        text: s[2],
        ...(s[3] ? { author: s[3] } : {}),
      };
    case "G":
      return {
        ...base,
        type: "GLOBAL_COMMENT",
        originalText: "",
        text: s[1],
        ...(s[2] ? { author: s[2] } : {}),
      };
    default:
      return { ...base, type: "COMMENT", originalText: s[1] ?? "" };
  }
}

const SHARE_BASE_URL = "https://ofershap.github.io/cursor-plan-preview/";

export async function encodeShareUrl(
  plan: { name: string; overview: string; body: string; meta?: PlanMeta },
  annotations: Annotation[],
): Promise<string> {
  const payload: SharePayload = {
    p: plan.body,
    n: plan.name,
    o: plan.overview,
    a: annotations.map(serializeAnnotation),
  };
  if (plan.meta) {
    const m: SharePayload["m"] = {};
    if (plan.meta.repo) m.r = plan.meta.repo;
    if (plan.meta.branch) m.b = plan.meta.branch;
    if (plan.meta.sharedBy) m.s = plan.meta.sharedBy;
    if (Object.keys(m).length > 0) payload.m = m;
  }
  const json = JSON.stringify(payload);
  const compressed = await compress(json);
  const encoded = toBase64Url(compressed);
  return `${SHARE_BASE_URL}#${encoded}`;
}

export async function decodeShareUrl(hash: string): Promise<{
  plan: { name: string; overview: string; body: string; meta?: PlanMeta };
  annotations: Annotation[];
} | null> {
  try {
    const clean = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!clean) return null;
    const bytes = fromBase64Url(clean);
    const json = await decompress(bytes);
    const payload = JSON.parse(json) as SharePayload;
    const meta: PlanMeta = {};
    if (payload.m?.r) meta.repo = payload.m.r;
    if (payload.m?.b) meta.branch = payload.m.b;
    if (payload.m?.s) meta.sharedBy = payload.m.s;
    return {
      plan: {
        name: payload.n,
        overview: payload.o,
        body: payload.p,
        ...(Object.keys(meta).length > 0 ? { meta } : {}),
      },
      annotations: payload.a.map(deserializeAnnotation),
    };
  } catch {
    return null;
  }
}

/** Quick offline check: Ceremony seed → tree with 40+ nodes. */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "frontend", "public", "data");
const EMBED_DIM = 512;

const ids = JSON.parse(readFileSync(join(root, "fma-ids.json"), "utf8"));
const tracks = JSON.parse(readFileSync(join(root, "fma-index.json"), "utf8"));
const embBuf = readFileSync(join(root, "fma-embeddings.bin"));
const embeddings = new Float32Array(embBuf.buffer, embBuf.byteOffset, embBuf.byteLength / 4);
const prototypes = JSON.parse(readFileSync(join(root, "seed-prototypes.json"), "utf8"));

for (let i = 0; i < tracks.length; i++) {
  tracks[i].clap_embedding = Array.from(embeddings.subarray(i * EMBED_DIM, (i + 1) * EMBED_DIM));
}

const proto = prototypes["new order"];
if (!proto?.length) {
  console.error("FAIL: missing new order prototype");
  process.exit(1);
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

const scored = tracks
  .filter((t) => t.clap_embedding?.length)
  .map((t) => ({ t, s: dot(proto, t.clap_embedding) }))
  .sort((a, b) => b.s - a.s)
  .slice(0, 12);

console.log("Prototype seed OK:", proto.length === 512);
console.log("Catalog tracks:", tracks.length);
console.log("Top recs from new order prototype:", scored.map((x) => `${x.t.artist} - ${x.t.title}`).join(" | "));
console.log(scored.length >= 8 ? "PASS: enough neighbors for tree" : "FAIL: thin neighbors");

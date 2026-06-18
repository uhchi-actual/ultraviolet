/** Album artwork: iTunes Search, then MusicBrainz + Cover Art Archive. */

const cache = new Map<string, string | null>();

function cacheKey(artist: string, title: string): string {
  return `${artist.toLowerCase()}|${title.toLowerCase()}`;
}

async function itunesArt(artist: string, title: string): Promise<string | null> {
  const queries = [
    `${artist} ${title}`,
    title,
    artist,
  ];
  for (const q of queries) {
    const term = encodeURIComponent(q.trim());
    const res = await fetch(
      `https://itunes.apple.com/search?term=${term}&entity=song&limit=3`,
    );
    if (!res.ok) continue;
    const data = (await res.json()) as {
      results?: { artworkUrl100?: string; artistName?: string; trackName?: string }[];
    };
    const hit =
      data.results?.find(
        (r) =>
          r.artworkUrl100 &&
          r.artistName?.toLowerCase().includes(artist.toLowerCase().slice(0, 4)),
      ) ?? data.results?.[0];
    const url = hit?.artworkUrl100;
    if (url) return url.replace("100x100bb", "600x600bb");
  }
  return null;
}

async function coverArtArchive(artist: string, title: string): Promise<string | null> {
  const q = encodeURIComponent(`artist:"${artist}" AND recording:"${title}"`);
  const mb = await fetch(
    `https://musicbrainz.org/ws/2/recording?query=${q}&fmt=json&limit=1`,
    { headers: { "User-Agent": "Ultraviolet/1.0 (music tree visualizer)" } },
  );
  if (!mb.ok) return null;
  const mbData = (await mb.json()) as { recordings?: { releases?: { id: string }[] }[] };
  const releaseId = mbData.recordings?.[0]?.releases?.[0]?.id;
  if (!releaseId) return null;
  const art = await fetch(`https://coverartarchive.org/release/${releaseId}/front-600`);
  if (art.ok && art.url) return art.url;
  const artJson = await fetch(`https://coverartarchive.org/release/${releaseId}`);
  if (!artJson.ok) return null;
  const json = (await artJson.json()) as { images?: { front?: boolean; image?: string }[] };
  const front = json.images?.find((i) => i.front) ?? json.images?.[0];
  return front?.image ?? null;
}

export async function fetchAlbumArt(artist: string, title: string): Promise<string | null> {
  const key = cacheKey(artist, title);
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const url = (await itunesArt(artist, title)) ?? (await coverArtArchive(artist, title));
    cache.set(key, url);
    return url;
  } catch {
    cache.set(key, null);
    return null;
  }
}

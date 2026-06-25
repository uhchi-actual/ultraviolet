import {
  EXTRA_DISCOVERY_CATALOG,
  EXTRA_FAMILIAR_LANDMARKS,
} from "./expandedDiscovery";
import { allGenreMotifs, motifForGenre } from "./genreMotifs";

export interface StreamingTrack {
  title: string;
  artist: string;
  album?: string;
  source?: "paste" | "spotify" | "curated";
  url?: string;
}

export interface DiscoveryTrack extends StreamingTrack {
  genre: string;
  why: string;
  familiarity?: "mainstream";
}

export interface GenreAnalysis {
  genre: string;
  mood: string;
  count: number;
  tracks: StreamingTrack[];
  recommendations: DiscoveryTrack[];
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  tracksTotal: number;
}

const SPOTIFY_CLIENT_ID_KEY = "ultraviolet_spotify_client_id";
const SPOTIFY_TOKEN_KEY = "ultraviolet_spotify_token";
const SPOTIFY_VERIFIER_KEY = "ultraviolet_spotify_code_verifier";
const SPOTIFY_STATE_KEY = "ultraviolet_spotify_state";
const SPOTIFY_SCOPES = "playlist-read-private playlist-read-collaborative";

const CORE_DISCOVERY_CATALOG: DiscoveryTrack[] = [
  { artist: "Bauhaus", title: "Dark Entries", genre: "Rock", why: "angular post-punk pressure", source: "curated" },
  { artist: "The Chameleons", title: "Swamp Thing", genre: "Rock", why: "wide-screen melancholy guitar", source: "curated" },
  { artist: "Fontaines D.C.", title: "Starburster", genre: "Rock", why: "tense vocal rhythm and grit", source: "curated" },
  { artist: "Molchat Doma", title: "Sudno", genre: "Rock", why: "coldwave pulse and gloom", source: "curated" },
  { artist: "Drab Majesty", title: "Ellipsis", genre: "Rock", why: "glossy gothic synth-rock", source: "curated" },
  { artist: "Boy Harsher", title: "Pain", genre: "Rock", why: "minimal dark club dread", source: "curated" },
  { artist: "IDLES", title: "Never Fight a Man With a Perm", genre: "Rock", why: "red-line angry momentum", source: "curated" },
  { artist: "Viagra Boys", title: "Sports", genre: "Rock", why: "sardonic motorik swagger", source: "curated" },
  { artist: "METZ", title: "A Boat to Drown In", genre: "Rock", why: "abrasive release valve", source: "curated" },
  { artist: "Joy Division", title: "Disorder", genre: "Rock", why: "nervous post-punk ignition", source: "curated" },
  { artist: "The Cure", title: "A Forest", genre: "Rock", why: "shadowy guitar hypnosis", source: "curated" },
  { artist: "New Order", title: "Age of Consent", genre: "Rock", why: "bright bassline ache", source: "curated" },
  { artist: "Depeche Mode", title: "Enjoy the Silence", genre: "Rock", why: "dark synth-pop gravity", source: "curated" },
  { artist: "Protomartyr", title: "Pontiac 87", genre: "Rock", why: "dry dread and momentum", source: "curated" },
  { artist: "The Armed", title: "All Futures", genre: "Rock", why: "maximalist guitar detonation", source: "curated" },
  { artist: "Turnstile", title: "Holiday", genre: "Rock", why: "hardcore joy burst", source: "curated" },
  { artist: "Sonic Youth", title: "Teen Age Riot", genre: "Rock", why: "tangled guitar release", source: "curated" },
  { artist: "The Strokes", title: "Reptilia", genre: "Rock", why: "tight city-guitar bite", source: "curated" },
  { artist: "Queens of the Stone Age", title: "Go With the Flow", genre: "Rock", why: "desert-rock drive", source: "curated" },

  { artist: "Bicep", title: "Glue", genre: "Electronic", why: "big emotional rave lift", source: "curated" },
  { artist: "Overmono", title: "So U Kno", genre: "Electronic", why: "rubbery UK club swing", source: "curated" },
  { artist: "Floating Points", title: "Birth4000", genre: "Electronic", why: "patient synth bloom", source: "curated" },
  { artist: "Four Tet", title: "Two Thousand and Seventeen", genre: "Electronic", why: "soft melodic electronics", source: "curated" },
  { artist: "Burial", title: "Archangel", genre: "Electronic", why: "blue-lit garage melancholy", source: "curated" },
  { artist: "DJ Seinfeld", title: "U", genre: "Electronic", why: "dusty house ache", source: "curated" },
  { artist: "Mall Grab", title: "Pool Party Music", genre: "Electronic", why: "loose house momentum", source: "curated" },
  { artist: "Chris Stussy", title: "All Night Long", genre: "Electronic", why: "sleek rolling house", source: "curated" },
  { artist: "Caribou", title: "Can't Do Without You", genre: "Electronic", why: "warm loop hypnosis", source: "curated" },
  { artist: "Aphex Twin", title: "Xtal", genre: "Electronic", why: "glass-soft early IDM", source: "curated" },
  { artist: "Boards of Canada", title: "Roygbiv", genre: "Electronic", why: "sun-warped nostalgia", source: "curated" },
  { artist: "Daft Punk", title: "Digital Love", genre: "Electronic", why: "sleek French-touch lift", source: "curated" },
  { artist: "Jamie xx", title: "Gosh", genre: "Electronic", why: "slow-bloom club pressure", source: "curated" },
  { artist: "LCD Soundsystem", title: "Dance Yrself Clean", genre: "Electronic", why: "patient dance-rock payoff", source: "curated" },
  { artist: "Orbital", title: "Halcyon On and On", genre: "Electronic", why: "weightless rave memory", source: "curated" },
  { artist: "The Chemical Brothers", title: "Star Guitar", genre: "Electronic", why: "motorik big-beat shimmer", source: "curated" },
  { artist: "SOPHIE", title: "Immaterial", genre: "Electronic", why: "hyper-pop chrome bounce", source: "curated" },
  { artist: "Nicolas Jaar", title: "Space Is Only Noise", genre: "Electronic", why: "minimal late-night pulse", source: "curated" },
  { artist: "Underworld", title: "Born Slippy .NUXX", genre: "Electronic", why: "anthemic warehouse rush", source: "curated" },
  { artist: "Jon Hopkins", title: "Open Eye Signal", genre: "Electronic", why: "precision techno ascent", source: "curated" },
  { artist: "Kelly Lee Owens", title: "Melt!", genre: "Electronic", why: "icy techno-pop glide", source: "curated" },
  { artist: "Peggy Gou", title: "It Makes You Forget (Itgehane)", genre: "Electronic", why: "breezy house release", source: "curated" },

  { artist: "Kurt Vile", title: "Pretty Pimpin", genre: "Pop", why: "slacker guitar daylight", source: "curated" },
  { artist: "Yo La Tengo", title: "Autumn Sweater", genre: "Pop", why: "hushed indie repetition", source: "curated" },
  { artist: "Alvvays", title: "Belinda Says", genre: "Pop", why: "bright fuzz-pop rush", source: "curated" },
  { artist: "Beach House", title: "Space Song", genre: "Pop", why: "dream-pop drift", source: "curated" },
  { artist: "Japanese Breakfast", title: "Be Sweet", genre: "Pop", why: "glossy indie-pop motion", source: "curated" },
  { artist: "Weyes Blood", title: "Andromeda", genre: "Pop", why: "cosmic soft-rock longing", source: "curated" },
  { artist: "Caroline Polachek", title: "Bunny Is a Rider", genre: "Pop", why: "nimble art-pop hook", source: "curated" },
  { artist: "Charli XCX", title: "360", genre: "Pop", why: "compressed club-pop flash", source: "curated" },
  { artist: "Tame Impala", title: "Let It Happen", genre: "Pop", why: "psychedelic pop sprawl", source: "curated" },
  { artist: "Phoenix", title: "1901", genre: "Pop", why: "sleek festival bounce", source: "curated" },
  { artist: "The xx", title: "Crystalised", genre: "Pop", why: "minimal nocturnal tension", source: "curated" },
  { artist: "M83", title: "Midnight City", genre: "Pop", why: "neon widescreen lift", source: "curated" },
  { artist: "Mitski", title: "Washing Machine Heart", genre: "Pop", why: "compact emotional hook", source: "curated" },
  { artist: "Lana Del Rey", title: "Venice Bitch", genre: "Pop", why: "sunset psych-pop drift", source: "curated" },

  { artist: "Big Thief", title: "Simulation Swarm", genre: "Folk", why: "tender folk-rock detail", source: "curated" },
  { artist: "Adrianne Lenker", title: "anything", genre: "Folk", why: "close-mic ache", source: "curated" },
  { artist: "Sufjan Stevens", title: "Should Have Known Better", genre: "Folk", why: "soft grief into lift", source: "curated" },
  { artist: "Nick Drake", title: "Pink Moon", genre: "Folk", why: "bare autumn intimacy", source: "curated" },
  { artist: "Fleet Foxes", title: "Blue Ridge Mountains", genre: "Folk", why: "stacked pastoral harmony", source: "curated" },
  { artist: "Bon Iver", title: "Holocene", genre: "Folk", why: "frosted folk expanse", source: "curated" },
  { artist: "Joanna Newsom", title: "Sprout and the Bean", genre: "Folk", why: "strange harp-lit fable", source: "curated" },
  { artist: "Phoebe Bridgers", title: "Kyoto", genre: "Folk", why: "restless indie-folk release", source: "curated" },
  { artist: "Waxahatchee", title: "Fire", genre: "Folk", why: "plainspoken roots glow", source: "curated" },
  { artist: "MJ Lenderman", title: "You Don't Know The Shape I'm In", genre: "Folk", why: "loose alt-country ache", source: "curated" },
  { artist: "Hurray for the Riff Raff", title: "Alibi", genre: "Folk", why: "dusty folk-rock pulse", source: "curated" },
  { artist: "Gillian Welch", title: "Look at Miss Ohio", genre: "Folk", why: "weathered country folk", source: "curated" },
  { artist: "Alex G", title: "Sarah", genre: "Folk", why: "homespun indie unease", source: "curated" },

  { artist: "Grouper", title: "Heavy Water/I'd Rather Be Sleeping", genre: "Instrumental", why: "blue ambient sadness", source: "curated" },
  { artist: "Brian Eno", title: "An Ending (Ascent)", genre: "Instrumental", why: "weightless ambient blue", source: "curated" },
  { artist: "Tim Hecker", title: "Virginal II", genre: "Instrumental", why: "beautiful distortion cloud", source: "curated" },
  { artist: "Stars of the Lid", title: "Requiem for Dying Mothers Part 2", genre: "Instrumental", why: "slow celestial grief", source: "curated" },
  { artist: "William Basinski", title: "dlp 1.1", genre: "Instrumental", why: "decaying tape memory", source: "curated" },
  { artist: "Explosions in the Sky", title: "Your Hand in Mine", genre: "Instrumental", why: "post-rock catharsis", source: "curated" },
  { artist: "Godspeed You! Black Emperor", title: "Moya", genre: "Instrumental", why: "storm-cloud crescendo", source: "curated" },
  { artist: "Max Richter", title: "On the Nature of Daylight", genre: "Instrumental", why: "cinematic string sorrow", source: "curated" },
  { artist: "Nils Frahm", title: "Says", genre: "Instrumental", why: "piano-synth patience", source: "curated" },
  { artist: "A Winged Victory for the Sullen", title: "Steep Hills of Vicodin Tears", genre: "Instrumental", why: "orchestral ambient hush", source: "curated" },
  { artist: "Julianna Barwick", title: "The Magic Place", genre: "Instrumental", why: "vocal ambient shimmer", source: "curated" },
  { artist: "Ryuichi Sakamoto", title: "Merry Christmas Mr. Lawrence", genre: "Instrumental", why: "elegant piano ache", source: "curated" },
  { artist: "Hania Rani", title: "Glass", genre: "Instrumental", why: "modern piano pulse", source: "curated" },
  { artist: "Oneohtrix Point Never", title: "Chrome Country", genre: "Instrumental", why: "synthetic sunset wash", source: "curated" },

  { artist: "J Dilla", title: "Time: The Donut of the Heart", genre: "Hip-Hop", why: "warm chopped soul", source: "curated" },
  { artist: "MF DOOM", title: "Doomsday", genre: "Hip-Hop", why: "laid-back lyrical oddity", source: "curated" },
  { artist: "A Tribe Called Quest", title: "Electric Relaxation", genre: "Hip-Hop", why: "low-slung jazz pocket", source: "curated" },
  { artist: "Nujabes", title: "Feather", genre: "Hip-Hop", why: "jazz-rap float", source: "curated" },
  { artist: "Kendrick Lamar", title: "Alright", genre: "Hip-Hop", why: "anthemic pressure valve", source: "curated" },
  { artist: "Aesop Rock", title: "None Shall Pass", genre: "Hip-Hop", why: "dense abstract sprint", source: "curated" },
  { artist: "OutKast", title: "SpottieOttieDopaliscious", genre: "Hip-Hop", why: "horn-led southern cool", source: "curated" },
  { artist: "Tyler, The Creator", title: "See You Again", genre: "Hip-Hop", why: "pastel rap-pop swing", source: "curated" },
  { artist: "Little Simz", title: "Introvert", genre: "Hip-Hop", why: "orchestral self-interrogation", source: "curated" },
  { artist: "Run The Jewels", title: "Close Your Eyes (And Count to Fuck)", genre: "Hip-Hop", why: "combustive rap attack", source: "curated" },
  { artist: "JPEGMAFIA", title: "BALD!", genre: "Hip-Hop", why: "glitchy punk-rap charge", source: "curated" },
  { artist: "Madlib", title: "Slim's Return", genre: "Hip-Hop", why: "dusty jazz-loop strut", source: "curated" },
  { artist: "De La Soul", title: "Eye Know", genre: "Hip-Hop", why: "sunny sample collage", source: "curated" },
  { artist: "Gang Starr", title: "Moment of Truth", genre: "Hip-Hop", why: "classic boom-bap poise", source: "curated" },
  { artist: "The Roots", title: "You Got Me", genre: "Hip-Hop", why: "live-band soul gravity", source: "curated" },
  { artist: "Danny Brown", title: "Ain't It Funny", genre: "Hip-Hop", why: "chaotic blown-speaker mania", source: "curated" },

  { artist: "Tinariwen", title: "Sastanaqqam", genre: "International", why: "desert blues trance", source: "curated" },
  { artist: "Altin Gun", title: "Goca Dunya", genre: "International", why: "psych-folk groove", source: "curated" },
  { artist: "Mdou Moctar", title: "Afrique Victime", genre: "International", why: "high-voltage guitar spiral", source: "curated" },
  { artist: "Fela Kuti", title: "Water No Get Enemy", genre: "International", why: "extended afrobeat roll", source: "curated" },
  { artist: "Ali Farka Toure", title: "Ai Du", genre: "International", why: "patient desert guitar", source: "curated" },
  { artist: "Ebo Taylor", title: "Heaven", genre: "International", why: "golden highlife groove", source: "curated" },
  { artist: "William Onyeabor", title: "Fantastic Man", genre: "International", why: "cosmic synth-funk joy", source: "curated" },
  { artist: "Cesaria Evora", title: "Sodade", genre: "International", why: "morne-blue longing", source: "curated" },
  { artist: "Buena Vista Social Club", title: "Chan Chan", genre: "International", why: "warm Cuban sway", source: "curated" },
  { artist: "Rosalia", title: "Malamente", genre: "International", why: "flamenco-pop snap", source: "curated" },
  { artist: "Bomba Estereo", title: "Soy Yo", genre: "International", why: "bright cumbia-pop bounce", source: "curated" },
  { artist: "Shintaro Sakamoto", title: "You Just Decided", genre: "International", why: "weightless Japanese groove", source: "curated" },
  { artist: "Kikagaku Moyo", title: "Dripping Sun", genre: "International", why: "Japanese psych-guitar bloom", source: "curated" },
  { artist: "Khruangbin", title: "Time (You and I)", genre: "International", why: "global funk glide", source: "curated" },
  { artist: "Yussef Dayes", title: "Black Classical Music", genre: "International", why: "London jazz momentum", source: "curated" },

  { artist: "Arca", title: "Desafio", genre: "Experimental", why: "mutating club melodrama", source: "curated" },
  { artist: "Bjork", title: "Hyperballad", genre: "Experimental", why: "ecstatic art-pop vertigo", source: "curated" },
  { artist: "Animal Collective", title: "My Girls", genre: "Experimental", why: "communal psych-pop bloom", source: "curated" },
  { artist: "Swans", title: "Screen Shot", genre: "Experimental", why: "ritual noise-rock churn", source: "curated" },
  { artist: "Xiu Xiu", title: "Sad Pony Guerilla Girl", genre: "Experimental", why: "raw brittle confession", source: "curated" },
  { artist: "FKA twigs", title: "Cellophane", genre: "Experimental", why: "fragile futuristic ballad", source: "curated" },
  { artist: "Oneohtrix Point Never", title: "Replica", genre: "Experimental", why: "sampled-memory collage", source: "curated" },
  { artist: "Yves Tumor", title: "Gospel For a New Century", genre: "Experimental", why: "glam chaos and swagger", source: "curated" },
  { artist: "black midi", title: "John L", genre: "Experimental", why: "jagged math-rock spiral", source: "curated" },
  { artist: "clipping.", title: "Say the Name", genre: "Experimental", why: "industrial rap unease", source: "curated" },
  { artist: "Dean Blunt", title: "The Narcissist", genre: "Experimental", why: "foggy outsider soul", source: "curated" },
  { artist: "Cocteau Twins", title: "Cherry-coloured Funk", genre: "Experimental", why: "glossolalia dream shimmer", source: "curated" },
  { artist: "CAN", title: "Halleluwah", genre: "Experimental", why: "locked-in krautrock ritual", source: "curated" },
  { artist: "Broadcast", title: "Come On Let's Go", genre: "Experimental", why: "retro-futurist pop flicker", source: "curated" },
  { artist: "Portishead", title: "Roads", genre: "Experimental", why: "noir trip-hop despair", source: "curated" },
];

const CORE_FAMILIAR_LANDMARKS: DiscoveryTrack[] = [
  { artist: "Nirvana", title: "Smells Like Teen Spirit", genre: "Rock", why: "recognizable grunge landmark", source: "curated", familiarity: "mainstream" },
  { artist: "The Killers", title: "Mr. Brightside", genre: "Rock", why: "familiar indie-rock pressure point", source: "curated", familiarity: "mainstream" },
  { artist: "Radiohead", title: "Creep", genre: "Rock", why: "well-known outsider-rock anchor", source: "curated", familiarity: "mainstream" },
  { artist: "Foo Fighters", title: "Everlong", genre: "Rock", why: "mainstream guitar catharsis", source: "curated", familiarity: "mainstream" },
  { artist: "Metallica", title: "Nothing Else Matters", genre: "Rock", why: "widely recognized heavy ballad", source: "curated", familiarity: "mainstream" },
  { artist: "Fleetwood Mac", title: "Dreams", genre: "Pop", why: "classic pop-rock reference point", source: "curated", familiarity: "mainstream" },
  { artist: "The Weeknd", title: "Blinding Lights", genre: "Pop", why: "neon pop landmark", source: "curated", familiarity: "mainstream" },
  { artist: "Dua Lipa", title: "Levitating", genre: "Pop", why: "bright mainstream dance-pop", source: "curated", familiarity: "mainstream" },
  { artist: "Billie Eilish", title: "bad guy", genre: "Pop", why: "minimal pop reference point", source: "curated", familiarity: "mainstream" },
  { artist: "Lorde", title: "Royals", genre: "Pop", why: "spare pop breakout", source: "curated", familiarity: "mainstream" },
  { artist: "Daft Punk", title: "One More Time", genre: "Electronic", why: "mainstream electronic celebration", source: "curated", familiarity: "mainstream" },
  { artist: "Gorillaz", title: "Feel Good Inc.", genre: "Electronic", why: "familiar animated-pop groove", source: "curated", familiarity: "mainstream" },
  { artist: "Avicii", title: "Levels", genre: "Electronic", why: "festival electronic landmark", source: "curated", familiarity: "mainstream" },
  { artist: "OutKast", title: "Hey Ya!", genre: "Hip-Hop", why: "ubiquitous rap-pop pivot", source: "curated", familiarity: "mainstream" },
  { artist: "Kendrick Lamar", title: "HUMBLE.", genre: "Hip-Hop", why: "mainstream rap anchor", source: "curated", familiarity: "mainstream" },
  { artist: "Missy Elliott", title: "Get Ur Freak On", genre: "Hip-Hop", why: "recognizable left-field rap hit", source: "curated", familiarity: "mainstream" },
  { artist: "Eminem", title: "Lose Yourself", genre: "Hip-Hop", why: "canonical motivational rap hit", source: "curated", familiarity: "mainstream" },
  { artist: "Tracy Chapman", title: "Fast Car", genre: "Folk", why: "plainspoken folk-pop landmark", source: "curated", familiarity: "mainstream" },
  { artist: "Fleetwood Mac", title: "Landslide", genre: "Folk", why: "familiar acoustic anchor", source: "curated", familiarity: "mainstream" },
  { artist: "Bon Iver", title: "Skinny Love", genre: "Folk", why: "recognizable indie-folk entry point", source: "curated", familiarity: "mainstream" },
  { artist: "Hans Zimmer", title: "Time", genre: "Instrumental", why: "widely recognized cinematic instrumental", source: "curated", familiarity: "mainstream" },
  { artist: "Miles Davis", title: "So What", genre: "Instrumental", why: "canonical jazz reference point", source: "curated", familiarity: "mainstream" },
  { artist: "Bad Bunny", title: "Titi Me Pregunto", genre: "International", why: "global reggaeton landmark", source: "curated", familiarity: "mainstream" },
  { artist: "Rosalia", title: "Despecha", genre: "International", why: "recognizable flamenco-pop crossover", source: "curated", familiarity: "mainstream" },
  { artist: "Radiohead", title: "Everything In Its Right Place", genre: "Experimental", why: "familiar experimental-pop gateway", source: "curated", familiarity: "mainstream" },
];

export const DISCOVERY_CATALOG: DiscoveryTrack[] = [
  ...CORE_DISCOVERY_CATALOG,
  ...EXTRA_DISCOVERY_CATALOG,
];

export const FAMILIAR_LANDMARKS: DiscoveryTrack[] = [
  ...CORE_FAMILIAR_LANDMARKS,
  ...EXTRA_FAMILIAR_LANDMARKS,
];

export const STREAMING_RELATED_GENRES: Record<string, string[]> = {
  Rock: ["Experimental", "Pop"],
  Experimental: ["Rock", "Electronic", "Instrumental"],
  Instrumental: ["Electronic", "Experimental", "Folk"],
  Folk: ["Pop", "Instrumental", "Rock"],
  Electronic: ["Instrumental", "Experimental", "Pop"],
  Pop: ["Electronic", "Folk", "Rock"],
  "Hip-Hop": ["Experimental", "Electronic", "Pop"],
  International: ["Folk", "Electronic", "Pop"],
};

export interface DiscoveryCandidateScore {
  score: number;
  tagOverlap: number;
  seedGenre: string;
  candidateGenre: string;
  sharedTags: string[];
  seedTags: string[];
  candidateTags: string[];
  seedIsScore: boolean;
  candidateIsScore: boolean;
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function dedupeKey(track: StreamingTrack): string {
  return `${track.artist}|${track.title}`.toLowerCase();
}

export function streamingTrackKey(track: Pick<StreamingTrack, "artist" | "title">): string {
  return `${clean(track.artist)}|${clean(track.title)}`.toLowerCase();
}

export function exactFamiliarLandmark(track: Pick<StreamingTrack, "artist" | "title">): DiscoveryTrack | undefined {
  const key = streamingTrackKey(track);
  return FAMILIAR_LANDMARKS.find((candidate) => streamingTrackKey(candidate) === key);
}

export function exactDiscoveryTrack(track: Pick<StreamingTrack, "artist" | "title">): DiscoveryTrack | undefined {
  const key = streamingTrackKey(track);
  return (
    DISCOVERY_CATALOG.find((candidate) => streamingTrackKey(candidate) === key) ||
    exactFamiliarLandmark(track)
  );
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function parseTrackLines(text: string, source: StreamingTrack["source"] = "paste"): StreamingTrack[] {
  const seen = new Set<string>();
  const tracks: StreamingTrack[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const rawLine = raw.trim();
    const line = clean(rawLine);
    if (!line) continue;
    const tab = rawLine.split(/\t+/).map(clean).filter(Boolean);
    const csv = line.split(",").map(clean);
    const byDash = line.match(/^(.+?)\s+[-\u2013\u2014]\s+(.+)$/);
    const byBy = line.match(/^(.+?)\s+by\s+(.+)$/i);
    let track: StreamingTrack | null = null;
    if (tab.length >= 2 && !/^(title|song)$/i.test(tab[0]!) && !/^artist$/i.test(tab[1]!)) {
      track = { title: tab[0]!, artist: tab[1]!, album: tab[2], source };
    } else if (byDash) track = { artist: byDash[1]!, title: byDash[2]!, source };
    else if (byBy) track = { title: byBy[1]!, artist: byBy[2]!, source };
    else if (csv.length >= 2) track = { title: csv[0]!, artist: csv[1]!, album: csv[2], source };
    if (!track) continue;
    track.artist = clean(track.artist);
    track.title = clean(track.title);
    const key = dedupeKey(track);
    if (seen.has(key)) continue;
    seen.add(key);
    tracks.push(track);
  }
  return tracks.slice(0, 250);
}

export function inferStreamingGenre(track: StreamingTrack): string {
  const q = `${track.artist} ${track.title} ${track.album ?? ""}`.toLowerCase();
  if (/hip.?hop|rap|dilla|doom|tribe|nujabes|kendrick|jpegmafia|madvillain|outkast|missy|eminem|drake/.test(q)) return "Hip-Hop";
  if (
    /ambient|eno|grouper|basinski|hecker|stars of the lid|instrumental|drone|hans zimmer|miles davis|jazz/.test(q) ||
    /\b(?:soundtrack|score|ost|tron|son of flynn|end of line|derezzed|solar sailer|cinematic)\b/.test(q)
  ) {
    return "Instrumental";
  }
  if (/house|techno|burial|bicep|overmono|four tet|floating points|caribou|stussy|fred again|aphex|boards|electronic|dj |daft punk|gorillaz|avicii/.test(q)) {
    return "Electronic";
  }
  if (/folk|sufjan|big thief|adrianne|americana|lenker|elliott smith|tracy chapman|fast car|landslide|skinny love/.test(q)) return "Folk";
  if (/tinariwen|altin|mdou|fela|brazil|afro|latin|klezmer|bad bunny|rosalia|reggaeton/.test(q)) return "International";
  if (/idles|metz|viagra boys|bauhaus|cure|joy division|new order|depeche|fontaines|molchat|rock|punk|metal|goth|darkwave|nirvana|killers|radiohead|foo fighters|metallica/.test(q)) {
    return "Rock";
  }
  return "Pop";
}

const STYLE_PATTERNS: { tag: string; pattern: RegExp }[] = [
  { tag: "soundtrack", pattern: /\b(?:soundtrack|score|ost|tron|flynn|derezzed|solar sailer|end of line)\b/ },
  { tag: "cinematic", pattern: /\b(?:cinematic|orchestral|strings|film|score|sprawl|ascent|crescendo)\b/ },
  { tag: "ambient", pattern: /\b(?:ambient|drone|weightless|hush|stillness|glow|meditation|minimal)\b/ },
  { tag: "instrumental", pattern: /\b(?:instrumental|piano|synth instrumental|jazz|post-rock|chamber)\b/ },
  { tag: "synth", pattern: /\b(?:synth|electronic|idm|modular|chrome|neon|french-touch|electro)\b/ },
  { tag: "club", pattern: /\b(?:club|house|techno|rave|garage|dance-floor|warehouse|deep-house)\b/ },
  { tag: "breakbeat", pattern: /\b(?:breakbeat|big-beat|uk club|garage|rubbery)\b/ },
  { tag: "downtempo", pattern: /\b(?:downtempo|trip-hop|post-club|late-night|dusty)\b/ },
  { tag: "guitar", pattern: /\b(?:guitar|grunge|shoegaze|post-punk|indie-rock|alt-rock|slacker)\b/ },
  { tag: "post-punk", pattern: /\b(?:post-punk|goth|darkwave|coldwave|nervous|angular)\b/ },
  { tag: "punk", pattern: /\b(?:punk|abrasive|hardcore|detonation|red-line|snarling)\b/ },
  { tag: "folk", pattern: /\b(?:folk|acoustic|country|americana|fingerpicked|pastoral|roots)\b/ },
  { tag: "songwriter", pattern: /\b(?:songwriting|plainspoken|close-mic|confession|storytelling|intimacy)\b/ },
  { tag: "slacker", pattern: /\b(?:slacker|daylight|laid-back|loose|homespun)\b/ },
  { tag: "dream", pattern: /\b(?:dream|hazy|shoegaze|melancholy|nostalgia|sunset|blue-lit)\b/ },
  { tag: "sad", pattern: /\b(?:sad|grief|ache|sorrow|lonely|melancholy|longing|regret)\b/ },
  { tag: "bright", pattern: /\b(?:bright|euphoria|sunlit|daylight|celebration|lift|glossy)\b/ },
  { tag: "hip-hop", pattern: /\b(?:hip.?hop|rap|boom-bap|jazz-rap|lyrical|flow|sample)\b/ },
  { tag: "soul", pattern: /\b(?:soul|r&b|funk|groove|disco|highlife)\b/ },
  { tag: "global", pattern: /\b(?:afro|latin|reggae|flamenco|desert|samba|cumbia|mpb|reggaeton|global)\b/ },
  { tag: "experimental", pattern: /\b(?:experimental|art-pop|avant|mutating|fractured|collage|noise|glitch|oddity)\b/ },
  { tag: "psych", pattern: /\b(?:psych|psychedelic|krautrock|trance|ritual)\b/ },
];

const ARTIST_TAGS: { pattern: RegExp; tags: string[] }[] = [
  { pattern: /daft punk/, tags: ["synth", "electronic", "french-touch"] },
  { pattern: /kurt vile|pavement|yo la tengo|courtney barnett/, tags: ["slacker", "guitar", "indie-rock"] },
  { pattern: /new order|joy division|the cure|depeche mode|molchat doma|bauhaus/, tags: ["post-punk", "synth", "sad"] },
  { pattern: /burial|boards of canada|aphex twin|four tet|floating points|oneohtrix|tycho|kiasmos/, tags: ["synth", "ambient", "downtempo"] },
  { pattern: /bicep|overmono|fred again|chris stussy|mall grab|lane 8|ben bohmer/, tags: ["club", "electronic"] },
  { pattern: /grouper|brian eno|tim hecker|basinski|stars of the lid|nils frahm|max richter/, tags: ["ambient", "instrumental", "cinematic"] },
  { pattern: /vangelis|cliff martinez|trent reznor|atticus ross|disasterpeace|mica levi|clint mansell/, tags: ["soundtrack", "cinematic", "instrumental", "synth"] },
  { pattern: /daniel lopatin|lorn/, tags: ["soundtrack", "cinematic", "synth"] },
  { pattern: /mf doom|j dilla|nujabes|a tribe called quest|kendrick|madlib|madvillain/, tags: ["hip-hop", "sample"] },
  { pattern: /big thief|adrianne lenker|sufjan|nick drake|elliott smith|bon iver/, tags: ["folk", "songwriter", "sad"] },
  { pattern: /fela|tinariwen|mdou moctar|rosalia|bad bunny|bomba estereo|khruangbin/, tags: ["global", "groove"] },
];

const TAG_WEIGHTS: Record<string, number> = {
  soundtrack: 1.25,
  cinematic: 1.12,
  ambient: 1.02,
  instrumental: 0.98,
  synth: 0.92,
  club: 0.9,
  guitar: 0.88,
  "post-punk": 0.94,
  folk: 0.9,
  "hip-hop": 0.92,
  global: 0.88,
  experimental: 0.86,
  slacker: 1,
  songwriter: 0.82,
  dream: 0.78,
  sad: 0.72,
  bright: 0.58,
  electronic: 0.42,
  pop: 0.34,
  rock: 0.38,
};

function tagWeight(tag: string): number {
  return TAG_WEIGHTS[tag] ?? 0.7;
}

export function styleTagsForTrack(
  track: Pick<StreamingTrack, "artist" | "title" | "album"> & { genre?: string; why?: string },
  options: { genre?: string; why?: string } = {},
): Set<string> {
  const genre = options.genre ?? track.genre ?? inferStreamingGenre(track);
  const descriptorText = `${track.title} ${track.album ?? ""} ${genre} ${options.why ?? track.why ?? ""}`.toLowerCase();
  const text = `${track.artist} ${descriptorText}`.toLowerCase();
  const tags = new Set<string>([genre.toLowerCase()]);

  for (const { pattern, tags: artistTags } of ARTIST_TAGS) {
    if (pattern.test(text)) for (const tag of artistTags) tags.add(tag);
  }
  for (const { tag, pattern } of STYLE_PATTERNS) {
    if (pattern.test(descriptorText)) tags.add(tag);
  }
  if (/\b(?:son of flynn|tron|end of line|derezzed|solar sailer)\b/.test(descriptorText)) {
    tags.add("soundtrack");
    tags.add("cinematic");
    tags.add("instrumental");
    tags.add("synth");
  }
  return tags;
}

function weightedOverlap(a: Set<string>, b: Set<string>): { score: number; sharedTags: string[] } {
  let intersection = 0;
  let aTotal = 0;
  let bTotal = 0;
  const sharedTags: string[] = [];
  for (const tag of a) aTotal += tagWeight(tag);
  for (const tag of b) bTotal += tagWeight(tag);
  for (const tag of a) {
    if (!b.has(tag)) continue;
    intersection += tagWeight(tag);
    sharedTags.push(tag);
  }
  return {
    score: intersection / Math.sqrt(Math.max(0.001, aTotal * bTotal)),
    sharedTags: sharedTags.sort((x, y) => tagWeight(y) - tagWeight(x)),
  };
}

function genreScore(seedGenre: string, candidateGenre: string): number {
  if (seedGenre === candidateGenre) return 0.24;
  if ((STREAMING_RELATED_GENRES[seedGenre] ?? []).includes(candidateGenre)) return 0.08;
  return -0.16;
}

export function scoreDiscoveryCandidate(
  seed: StreamingTrack,
  candidate: DiscoveryTrack,
): DiscoveryCandidateScore {
  const seedReference = exactDiscoveryTrack(seed);
  const seedGenre = seedReference?.genre ?? inferStreamingGenre(seed);
  const candidateGenre = candidate.genre;
  const seedTags = styleTagsForTrack(seed, { genre: seedGenre, why: seedReference?.why });
  const candidateTags = styleTagsForTrack(candidate, { genre: candidateGenre, why: candidate.why });
  const overlap = weightedOverlap(seedTags, candidateTags);
  const sameArtist = clean(seed.artist).toLowerCase() === clean(candidate.artist).toLowerCase();
  const isExactTrack = streamingTrackKey(seed) === streamingTrackKey(candidate);
  const seedIsScore = seedTags.has("soundtrack") || seedTags.has("cinematic");
  const candidateIsScore =
    candidateTags.has("soundtrack") ||
    candidateTags.has("cinematic") ||
    candidateTags.has("ambient") ||
    candidateTags.has("instrumental");
  const candidateIsClubOnly =
    candidateTags.has("club") &&
    !candidateTags.has("soundtrack") &&
    !candidateTags.has("cinematic") &&
    !candidateTags.has("ambient") &&
    !candidateTags.has("instrumental");
  const candidateIsGuitarSong = candidateTags.has("slacker") || candidateTags.has("folk") || candidateTags.has("guitar");
  const candidateSupportsScore =
    candidateTags.has("soundtrack") ||
    candidateTags.has("cinematic") ||
    candidateTags.has("ambient") ||
    candidateTags.has("instrumental") ||
    candidateTags.has("synth");
  const clashPenalty = seedIsScore && candidateIsGuitarSong && !candidateSupportsScore ? 0.42 : 0;
  const clubPenalty = seedIsScore && candidateIsClubOnly ? 0.3 : 0;
  const scoreMismatchPenalty = seedIsScore && !candidateIsScore ? 0.36 : 0;
  const scoreBonus = seedIsScore && candidateIsScore ? 0.28 : 0;
  const sameArtistPenalty = sameArtist ? 0.18 : 0;
  const exactPenalty = isExactTrack ? 1 : 0;
  const familiarityPenalty = candidate.familiarity === "mainstream" ? 0.06 : 0;
  const jitter = (hash(`${streamingTrackKey(seed)}|${streamingTrackKey(candidate)}|sound-score`) % 40) / 1000;
  const score =
    genreScore(seedGenre, candidateGenre) +
    overlap.score * 0.82 +
    scoreBonus +
    jitter -
    sameArtistPenalty -
    clashPenalty -
    clubPenalty -
    scoreMismatchPenalty -
    familiarityPenalty -
    exactPenalty;

  return {
    score: Math.round(score * 1000) / 1000,
    tagOverlap: Math.round(overlap.score * 1000) / 1000,
    seedGenre,
    candidateGenre,
    sharedTags: overlap.sharedTags,
    seedTags: [...seedTags].sort((a, b) => tagWeight(b) - tagWeight(a)),
    candidateTags: [...candidateTags].sort((a, b) => tagWeight(b) - tagWeight(a)),
    seedIsScore,
    candidateIsScore,
  };
}

export function analyzeStreamingTracks(tracks: StreamingTrack[]): GenreAnalysis[] {
  const groups = new Map<string, StreamingTrack[]>();
  for (const track of tracks) {
    const genre = inferStreamingGenre(track);
    groups.set(genre, [...(groups.get(genre) ?? []), track]);
  }

  return [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([genre, genreTracks]) => {
      const motif = motifForGenre(genre);
      const existing = new Set(genreTracks.map(dedupeKey));
      const recommendations = DISCOVERY_CATALOG
        .filter((track) => !existing.has(dedupeKey(track)))
        .map((track) => ({
          track,
          score: Math.max(...genreTracks.map((seed) => scoreDiscoveryCandidate(seed, track).score)),
        }))
        .filter(({ score }) => score > 0.08)
        .sort((a, b) => b.score - a.score || dedupeKey(a.track).localeCompare(dedupeKey(b.track)))
        .map(({ track }) => track)
        .slice(0, 8);
      return {
        genre,
        mood: motif.mood,
        count: genreTracks.length,
        tracks: genreTracks,
        recommendations,
      };
    });
}

export function tracksToSeedText(tracks: StreamingTrack[], limit = 50): string {
  return tracks
    .slice(0, limit)
    .map((track) => `${track.artist} - ${track.title}`)
    .join("\n");
}

export function selectDiversePlaylistSeeds(tracks: StreamingTrack[], limit = 48): StreamingTrack[] {
  const unique = new Map<string, StreamingTrack>();
  for (const track of tracks) {
    const key = streamingTrackKey(track);
    if (!unique.has(key)) unique.set(key, track);
  }

  const candidates = [...unique.values()];
  const artistCounts = new Map<string, number>();
  const genreCounts = new Map<string, number>();
  for (const track of candidates) {
    const artist = clean(track.artist).toLowerCase();
    const genre = inferStreamingGenre(track);
    artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1);
    genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
  }

  const byGenre = new Map<string, StreamingTrack[]>();
  for (const track of candidates) {
    const genre = inferStreamingGenre(track);
    const list = byGenre.get(genre) ?? [];
    list.push(track);
    byGenre.set(genre, list);
  }

  function uniqueness(track: StreamingTrack): number {
    const artistCount = artistCounts.get(clean(track.artist).toLowerCase()) ?? 1;
    const genreCount = genreCounts.get(inferStreamingGenre(track)) ?? 1;
    const landmarkPenalty = exactFamiliarLandmark(track) ? 0.22 : 0;
    const jitter = (hash(streamingTrackKey(track)) % 100) / 1000;
    return 1 / artistCount + 0.72 / Math.sqrt(genreCount) + jitter - landmarkPenalty;
  }

  const genres = [...byGenre.keys()].sort((a, b) => (genreCounts.get(a) ?? 0) - (genreCounts.get(b) ?? 0));
  for (const genre of genres) {
    byGenre.get(genre)!.sort((a, b) => uniqueness(b) - uniqueness(a));
  }

  const selected: StreamingTrack[] = [];
  const selectedKeys = new Set<string>();
  while (selected.length < limit) {
    let addedThisRound = false;
    for (const genre of genres) {
      const list = byGenre.get(genre)!;
      const next = list.find((track) => !selectedKeys.has(streamingTrackKey(track)));
      if (!next) continue;
      selected.push(next);
      selectedKeys.add(streamingTrackKey(next));
      addedThisRound = true;
      if (selected.length >= limit) break;
    }
    if (!addedThisRound) break;
  }

  return selected;
}

export function extractSpotifyPlaylistId(value: string): string | null {
  const input = clean(value);
  if (!input) return null;

  const uriMatch = input.match(/^spotify:playlist:([A-Za-z0-9]+)$/);
  if (uriMatch?.[1]) return uriMatch[1];

  try {
    const url = new URL(input);
    const parts = url.pathname.split("/").filter(Boolean);
    const playlistIndex = parts.indexOf("playlist");
    if (playlistIndex >= 0 && parts[playlistIndex + 1]) return parts[playlistIndex + 1]!;
  } catch {
    /* Not a URL; fall through to raw id parsing. */
  }

  return /^[A-Za-z0-9]{16,}$/.test(input) ? input : null;
}

export function providerSearchUrl(track: StreamingTrack, provider: "spotify" | "youtube" | "soundcloud"): string {
  const query = encodeURIComponent(`${track.artist} ${track.title}`);
  if (provider === "spotify") return `https://open.spotify.com/search/${query}`;
  if (provider === "soundcloud") return `https://soundcloud.com/search/sounds?q=${query}`;
  return `https://www.youtube.com/results?search_query=${query}`;
}

function generateRandomString(length: number): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return [...values].map((x) => possible[x % possible.length]).join("");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  return window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain));
}

function base64Url(input: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function spotifyRedirectUri(): string {
  if (typeof window === "undefined") return "";
  const path = window.location.pathname.endsWith("/")
    ? window.location.pathname
    : `${window.location.pathname}/`;
  return `${window.location.origin}${path}`;
}

export function configuredSpotifyClientId(): string {
  if (typeof window === "undefined") return process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ?? "";
  return (
    localStorage.getItem(SPOTIFY_CLIENT_ID_KEY) ||
    process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ||
    ""
  );
}

export function storeSpotifyClientId(clientId: string): void {
  localStorage.setItem(SPOTIFY_CLIENT_ID_KEY, clientId.trim());
}

export async function startSpotifyLogin(clientId: string): Promise<void> {
  const codeVerifier = generateRandomString(64);
  const state = generateRandomString(24);
  localStorage.setItem(SPOTIFY_VERIFIER_KEY, codeVerifier);
  localStorage.setItem(SPOTIFY_STATE_KEY, state);

  const codeChallenge = base64Url(await sha256(codeVerifier));
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: spotifyRedirectUri(),
    scope: SPOTIFY_SCOPES,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    state,
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function completeSpotifyLoginFromUrl(clientId: string): Promise<boolean> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return false;
  if (state !== localStorage.getItem(SPOTIFY_STATE_KEY)) throw new Error("Spotify state mismatch");

  const verifier = localStorage.getItem(SPOTIFY_VERIFIER_KEY);
  if (!verifier) throw new Error("Missing Spotify verifier");

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: spotifyRedirectUri(),
    code_verifier: verifier,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error(`Spotify token exchange failed: ${response.status}`);
  const token = (await response.json()) as { access_token: string; expires_in: number };
  localStorage.setItem(
    SPOTIFY_TOKEN_KEY,
    JSON.stringify({
      accessToken: token.access_token,
      expiresAt: Date.now() + token.expires_in * 1000 - 60_000,
    }),
  );
  localStorage.removeItem(SPOTIFY_VERIFIER_KEY);
  localStorage.removeItem(SPOTIFY_STATE_KEY);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  return true;
}

export function spotifyAccessToken(): string | null {
  const raw = localStorage.getItem(SPOTIFY_TOKEN_KEY);
  if (!raw) return null;
  try {
    const token = JSON.parse(raw) as { accessToken: string; expiresAt: number };
    if (!token.accessToken || token.expiresAt < Date.now()) return null;
    return token.accessToken;
  } catch {
    return null;
  }
}

async function spotifyGet<T>(path: string, accessToken: string, attempt = 0): Promise<T> {
  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 429 && attempt < 3) {
    const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
    await new Promise((resolve) => window.setTimeout(resolve, Math.min(10, retryAfter) * 1000));
    return spotifyGet<T>(path, accessToken, attempt + 1);
  }
  if (!response.ok) throw new Error(`Spotify request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function fetchSpotifyPlaylists(accessToken: string): Promise<SpotifyPlaylist[]> {
  const data = await spotifyGet<{
    items: { id: string; name: string; tracks: { total: number } }[];
  }>("/me/playlists?limit=50", accessToken);
  return data.items.map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    tracksTotal: playlist.tracks.total,
  }));
}

export async function fetchSpotifyPlaylistTracks(
  playlistId: string,
  accessToken: string,
  maxTracks = 5000,
): Promise<StreamingTrack[]> {
  const tracks: StreamingTrack[] = [];
  let path = `/playlists/${playlistId}/tracks?limit=50&fields=items(track(name,external_urls,album(name),artists(name))),next`;
  while (path && tracks.length < maxTracks) {
    const data = await spotifyGet<{
      next: string | null;
      items: {
        track: {
          name: string;
          external_urls?: { spotify?: string };
          album?: { name?: string };
          artists?: { name: string }[];
        } | null;
      }[];
    }>(path, accessToken);
    for (const item of data.items) {
      if (!item.track?.name || !item.track.artists?.length) continue;
      tracks.push({
        title: item.track.name,
        artist: item.track.artists.map((artist) => artist.name).join(", "),
        album: item.track.album?.name,
        url: item.track.external_urls?.spotify,
        source: "spotify",
      });
      if (tracks.length >= maxTracks) break;
    }
    path = data.next ? data.next.replace("https://api.spotify.com/v1", "") : "";
  }
  return tracks;
}

export function motifLegend() {
  return allGenreMotifs().map((motif) => ({
    genre: motif.genre,
    mood: motif.mood,
    primary: motif.primary,
  }));
}

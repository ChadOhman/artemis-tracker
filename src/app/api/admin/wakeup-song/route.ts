// src/app/api/admin/wakeup-song/route.ts
// Add wake-up songs at runtime without rebuilding.

export const dynamic = "force-dynamic";

interface RuntimeSong {
  flightDay: number;
  title: string;
  artist: string;
  notes?: string;
}

// Runtime songs supplement the static ones in wakeup-songs.ts
const runtimeSongs: RuntimeSong[] = [];

export function getRuntimeSongs(): RuntimeSong[] {
  return runtimeSongs;
}

export async function GET(): Promise<Response> {
  return Response.json({ songs: runtimeSongs });
}

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.flightDay || !body.title || !body.artist) {
    return Response.json({ error: "Required: flightDay, title, artist" }, { status: 400 });
  }

  const song: RuntimeSong = {
    flightDay: parseInt(body.flightDay, 10),
    title: body.title,
    artist: body.artist,
    notes: body.notes || undefined,
  };

  // Replace if same flight day exists
  const idx = runtimeSongs.findIndex((s) => s.flightDay === song.flightDay);
  if (idx >= 0) runtimeSongs[idx] = song;
  else runtimeSongs.push(song);

  runtimeSongs.sort((a, b) => a.flightDay - b.flightDay);

  return Response.json({ success: true, songs: runtimeSongs });
}

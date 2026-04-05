// src/lib/wakeup-songs.ts
// Wake-up songs played to the Artemis II crew during the mission.
// Continuing a tradition from Apollo and Shuttle programs.
// Sources: NASA social media, mission blogs, news coverage.

export interface WakeupSong {
  flightDay: number;
  title: string;
  artist: string;
  year?: number;
  dedication?: string; // crew member it was dedicated to, if specified
  notes?: string;      // any memorable moment or context
  spotifyId?: string;  // for embedded player, optional
}

export const WAKEUP_SONGS: WakeupSong[] = [
  {
    flightDay: 2,
    title: "Sleepyhead",
    artist: "Young and Sick",
    notes: "Early morning wake-up call to end the first sleep period.",
  },
  {
    flightDay: 2,
    title: "Green Light",
    artist: "John Legend feat. André 3000",
    year: 2024,
    notes: "Played as the crew prepared for the historic Trans-Lunar Injection burn.",
  },
  {
    flightDay: 3,
    title: "In a Daydream",
    artist: "Freddy Jones Band",
    year: 1992,
    notes: "Classic 90s rock to start the first full day of deep space cruise.",
  },
  {
    flightDay: 4,
    title: "Pink Pony Club",
    artist: "Chappell Roan",
    year: 2020,
    notes: "Mission control famously cut the audio after 'heels' — Commander Wiseman quipped 'We were all eagerly awaiting the chorus.'",
  },
];

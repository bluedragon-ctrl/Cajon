# Cajon samples

Until real recordings are added, the app uses built-in synthesized sounds.

To use real cajon sounds, put these two files in this folder:

- `bass.ogg` – bass hit (center of the cajon)
- `slap.ogg` – slap hit (top edge)

The app tries `.ogg` first, then `.wav`, then `.mp3`. If a file won't play on your phone (older iPhones can't decode Ogg), add a `.wav` or `.mp3` copy next to it.

Tips:

- Short one-shots (0.3–0.6 s), trimmed so the hit starts at the very beginning of the file (no leading silence), otherwise the playback will feel late.
- Mono or stereo both work. Normalize them to a similar loudness.
- Only add files you recorded yourself or whose license allows redistribution (e.g. CC0 from freesound.org).
- After deploying a new version, reload the page twice (the app caches files for offline use).

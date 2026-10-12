# Cajon samples

This folder contains real cajon recordings (see Credits below). If a file is missing or can't be decoded, the app falls back to built-in synthesized sounds.

To use your own sounds, replace these files:

- `bass.ogg` – bass hit (center of the cajon)
- `slap.ogg` – slap hit (top edge)

The app tries `.ogg` first, then `.wav`, then `.mp3`. If a file won't play on your phone (older iPhones can't decode Ogg), add a `.wav` or `.mp3` copy next to it.

Tips:

- Short one-shots (0.3–0.6 s), trimmed so the hit starts at the very beginning of the file (no leading silence), otherwise the playback will feel late.
- Mono or stereo both work. Normalize them to a similar loudness.
- Only add files you recorded yourself or whose license allows redistribution (e.g. CC0 from freesound.org).
- After deploying a new version, reload the page twice (the app caches files for offline use).

## Credits

- `bass.ogg` / `bass.wav`: [Cajon Peruano Parche.ogg](https://commons.wikimedia.org/wiki/File:Cajon_Peruano_Parche.ogg)
- `slap.ogg` / `slap.wav`: [Cajon Peruano Golpe Agudo.ogg](https://commons.wikimedia.org/wiki/File:Cajon_Peruano_Golpe_Agudo.ogg)

Both by ZappaMidiPF, via Wikimedia Commons, licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The `.wav` files are format conversions of the originals.

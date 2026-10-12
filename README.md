# Cajon Practice

A mobile-first web page for practicing cajon rhythms. Static files only, no build step.

- Two big touch pads: **Bass** (center) and **Slap** (top edge)
- Built-in rhythm library shown as a B / S step grid, looping with a metronome and BPM control
- Edit mode to create your own rhythms; saved on the phone (localStorage)
- Works offline and can be added to the home screen (PWA)
- Real cajon samples (CC BY-SA 4.0, credits in `samples/README.md`), with synthesized sounds as fallback

## Publish on GitHub Pages

Repo **Settings → Pages → Build and deployment**: deploy from the branch containing these files, folder `/ (root)`.
The page is then at `https://<user>.github.io/<repo>/`.

## Run locally

    python3 -m http.server 8000

then open http://localhost:8000 (audio needs a tap to start, as on any mobile browser).

On iPhone, the ring/silent switch mutes web audio — turn it off.

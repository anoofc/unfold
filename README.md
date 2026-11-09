# Unfold.

Unfold is a 3D science lab for kids. The four sample lessons cover a four-stroke, four-cylinder engine, Earth's layers, an early Bell telephone and the human body.

## Run in VS Code

Install Node.js 22.12+ or 24 LTS. Open the extracted `unfold` folder in VS Code and run these commands in its integrated terminal.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Run `npm run build` for a production build or `npm run preview` to check that build locally.

## Explore a lesson

- Click or tap a visible part or choose its name. The viewer frames that part on its own.
- Drag to orbit and use the mouse wheel or pinch to zoom. The focused canvas also supports the arrow keys, plus and minus.
- Tap empty space or use **Back to assembly** to return. Escape works in the normal page view.
- Use **Play animation** or **Pause animation** to control the assembly. The default respects the system’s reduced-motion setting.
- In any lesson, choose **Start with audio** or **Explore silently**. The choice is saved on this browser. **Mute / Unmute** changes it at any time. Narration has its own **Play / Pause** and **Replay** controls, separate from animation.
- Every lesson overview and all 22 selectable parts have narration and matching transcripts. Returning to the assembly stops narration; press **Replay** to hear the overview again. The matching transcript remains available without audio.

## Project layout

- `src/lessons.js` defines the labels, part explanations and animation steps.
- `src/narration-clips.js` maps narration and transcripts to lesson and part IDs. `src/narration.js` owns the single audio player; `src/narration-ui.js` renders its controls and transcript.
- `src/models/` defines the four editable, procedural 3D models and their animations.
- `src/viewer.js` handles the 3D camera, model selection and controls. The renderer uses WebGL 2 when available and falls back to Canvas 2D.
- `src/style.css` defines the space-inspired UI, responsive layout and visual controls.
- `public/eis-logo.png` is the supplied EIS mark.

The geometry is simplified for the sample lessons. The Earth cutaway exaggerates the crust thickness. The telephone is a teaching reconstruction inspired by the supplied reference and early Bell magneto designs. The human body focuses on the skeleton, brain, breathing and circulation. The lesson pages link to source material from NASA, the USGS, the Smithsonian and NIH. Earth’s surface outlines use Natural Earth public-domain map data via world-atlas.

## Neural narration

All four lesson overviews and all 22 selectable parts have separate local recordings. The 26 clips use **Kokoro Heart**, an English neural voice with consistent pacing, replacing the original macOS system voice. Audio is generated before deployment and stored under `public/audio/`; playback does not need Python, a model download, a voice service or an API key.

The existing audio choice, Play/Pause, Replay and Mute/Unmute controls apply to every lesson. Returning to the assembly stops narration and leaves its overview ready for Replay. Narration and animation remain independent.

Run `npm test` for playback, persistence, rapid-selection races, all-part coverage, audio durations and script/recording integrity. `npm run build` includes all recordings automatically.

See [narration setup and browser checks](docs/NARRATION.md) and [all narration scripts](docs/NARRATION_SCRIPTS.md). The optional `npm run narration:generate` command regenerates the audio with HyperFrames and Kokoro; it has additional authoring-time dependencies described there. Generation never falls back to the old system voice.

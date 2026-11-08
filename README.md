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

## Project layout

- `src/lessons.js` defines the labels, part explanations and animation steps.
- `src/models/` defines the four editable, procedural 3D models and their animations.
- `src/viewer.js` handles the 3D camera, model selection and controls. The renderer uses WebGL 2 when available and falls back to Canvas 2D.
- `src/style.css` defines the space-inspired UI, responsive layout and visual controls.
- `public/eis-logo.png` is the supplied EIS mark.

The geometry is simplified for the sample lessons. The Earth cutaway exaggerates the crust thickness. The telephone is a teaching reconstruction inspired by the supplied reference and early Bell magneto designs. The human body focuses on the skeleton, brain, breathing and circulation. The lesson pages link to source material from NASA, the USGS, the Smithsonian and NIH. Earth’s surface outlines use Natural Earth public-domain map data via world-atlas.

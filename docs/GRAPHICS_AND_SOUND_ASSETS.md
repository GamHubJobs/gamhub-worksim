# Graphics and sound: where everything comes from

WorkSim's 3D world, characters, textures, sounds, music, voices and icons
are made by the game's own code. Nothing is downloaded from an asset store,
and there are no third-party models, texture images, sound recordings or
fonts to license. This keeps the game small (textures are drawn in the
browser when needed), works offline, and leaves no licensing questions.

## Made in the game's own code

| What                                   | Where                                                               | How                                                                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Buildings, rooms, furniture, equipment | `src/office/scene`, `src/home/scene`, `src/city/scene`, `src/court` | Built from simple shapes (boxes, cylinders, spheres) in React Three Fiber                                                                              |
| Characters and their clothes           | `src/office/scene/people.tsx`, `workwear.ts`                        | A jointed figure built from capsules and spheres; scrubs, clinical coats, hi-vis, suits, hard hats, badges and stethoscopes are part of the same model |
| Animations                             | `src/world/character/rig.ts`, `fit.ts`                              | Poses and motions written in code (walking, sitting, typing, talking, presenting, reaching and so on)                                                  |
| Surface textures                       | `src/world/look/surfaces.ts`, `src/office/scene/furniture.tsx`      | Drawn on small canvases in the browser: asphalt, paving, brick, render, grass, vinyl, concrete, carpet, plaster, tiles, wood                           |
| Signs, menus, screens                  | `src/city/scene/interiors/kit.ts`, office scene files               | Painted on canvases with the browser's fonts                                                                                                           |
| Lighting and reflections               | `src/world/look/SceneLook.tsx`, `looks.ts`                          | Lights and an environment made of glowing shapes in the scene (no downloaded HDR images)                                                               |
| Sound effects, surroundings, music     | `src/audio/engine.ts`                                               | Synthesised with the Web Audio API (oscillators, filtered noise), not recordings                                                                       |
| Room acoustics                         | `src/audio/engine.ts` (`setRoom`)                                   | A reverb made from generated noise, sized for each place                                                                                               |
| Spoken dialogue                        | `src/audio/speech.ts`                                               | The browser's own speech voices (Web Speech API): free, offline, nothing sent to a service                                                             |
| Icons                                  | `src/ui/Icon.tsx`                                                   | Simple line icons written as SVG paths for this game                                                                                                   |

## Third-party software

| Library            | Version | Licence | Used for                                               |
| ------------------ | ------- | ------- | ------------------------------------------------------ |
| three              | 0.187.0 | MIT     | The 3D engine                                          |
| @react-three/fiber | 9.8.2   | MIT     | 3D scenes in React                                     |
| @react-three/drei  | 10.7.9  | MIT     | Helpers: environment lighting, labels, contact shadows |

The bundled office apps (Grid Craft, Word Craft, Deck Craft in
`public/crafts`) have their own licences: see [CRAFT_APPS.md](CRAFT_APPS.md).
The app icons in `public/icons` are the game's own.

## If assets are added later

Use only CC0 or clearly licensed material, record each one here (source,
author, licence, what it is used for), keep files small (compressed textures,
low-polygon models), and match the existing look: clean shapes, soft light,
muted colours with one accent per place.

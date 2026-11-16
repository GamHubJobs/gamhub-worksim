# Character models: Quaternius Universal Base Characters, evaluated

Written 2026-11-16 (3D upgrade, round 3). It answers: should the game's people
be replaced with the free Quaternius models? Read from the pack's page,
[quaternius.com/packs/universalbasecharacters.html](https://quaternius.com/packs/universalbasecharacters.html).

## The pack

|           |                                                                                                                   |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| Licence   | CC0 ("Free to use in personal, educational and commercial projects"), so it fits the project's policy             |
| Content   | 6 base bodies (superhero, regular and teen proportions, male and female) and 20 hairstyles. No clothing is listed |
| Formats   | glTF, FBX, OBJ (free tier, "60–70%" of the pack); .blend sources and engine shaders are paid (Patreon)            |
| Detail    | About 13,000 triangles per character on average                                                                   |
| Rig       | "Humanoid rig compatible with retargeting in any engine". Bone names and count are not stated                     |
| Animation | None in this pack. The separate Universal Animation Library (also CC0) is designed for the same rig               |
| Hosting   | itch.io, or a download on the page. No direct file URL is given                                                   |

## How the game's people work now

- **Bodies:** every person (the player, colleagues, patients, customers) is
  built from shared turned and tapered shapes (`office/scene/people.tsx`).
- **Posing:** each is posed every frame from a joint-angle frame (`RigFrame`).
  Activities set that frame: sitting on a real seat, typing on a real keyboard,
  lying in a real bed, pushing a real door, holding real props.
- **Looks:** clothing and roles come from code: scrubs, high-vis and hard hats,
  suits, the courier's uniform, the barista's apron. There are around a hundred
  looks.
- **Cost:** a person is a few hundred triangles, with no textures to download.
  Crowds and the street stay drawable on computers without a graphics card.

## Assessment

1. **No clothing.** The pack is base bodies only. Every profession's look would
   still have to be made: scrubs, high-vis, suits, uniforms, aprons. Those would
   need modelling and fitting in Blender per body, which cannot be done in this
   environment (no Blender here).
2. **A different animation system.** These are skinned meshes, posed from
   keyframed clips. Every activity in the game poses joints directly (including
   fitting hands to the real keyboard and hips to the real seat). Adopting them
   means retargeting `RigFrame` onto the skeleton's bones: about 20 joint
   mappings, plus axis conventions checked per bone. That is a sizeable piece of
   work, and it needs its own visual verification.
3. **Cost on modest computers.** At 13k triangles, a street with 20 people is
   about 260k triangles before buildings, against about 10k now. Level of detail
   (the current people far away) would be needed. This machine renders in software
   at under 1 fps on High, so the effect could not be measured fairly here.
4. **Download.** The files come from itch.io's download page. Fetching them is
   free, but needs a browser click, so it is not scriptable here.

## Decision

Not integrated in this round. The current procedural people stay. They are
lighter, already dressed for every role, and already posed to the real
furniture and equipment.

The way to adopt the pack, if wanted:

1. Download the glTF tier by hand into `public/models/people/` (CC0: record it in
   GRAPHICS_AND_SOUND_ASSETS.md).
2. Add a `SkinnedPerson` that maps `RigFrame` joints onto the skeleton's bones
   (shoulders, elbows, hips, knees, spine, neck), with a per-bone rest-pose
   offset. It would be used only near the camera on High, with today's people
   as the far level of detail and on Low.
3. Give the bodies clothing by colour regions (a material per region: top,
   trousers, shoes), since no outfits are included. Uniform details (lanyard,
   stethoscope, hard hat) stay as attached props, as now.
4. Compare in play, on a computer with a graphics card, before switching.

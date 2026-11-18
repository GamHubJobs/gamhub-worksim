/**
 * Accessories and equipment in 3D (content/accessories.ts), drawn on the
 * characters of office/scene/people.tsx at the parts they go on, so they move with
 * the body: hats, glasses, headphones and earrings on the head; necklaces,
 * badges, a stethoscope, a camera and a vest on the torso; bags on the back and
 * shoulder; a tool belt, keys and a tape at the waist; watches and bracelets on
 * the wrists, a ring on the finger, gloves on the hands; what is carried in the
 * left hand (a briefcase, a folder, a tablet, a toolkit); and the shoes.
 *
 * Made from simple shapes like the rest of the characters, with materials that
 * read as what they are (polished steel and gold, glass, leather, plastic,
 * fabric). Geometry and materials are made once and shared by everyone who
 * wears the same thing, so a room of colleagues costs little more to draw.
 */
import {
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type MeshStandardMaterial,
} from 'three'
import type { Model } from '../../content/accessories'
import { finish, has, type Finish, type Wear } from './accessoryLook'

const STEEL = '#cbd5e1'
const DARK = '#111827'

const G = {
  // Wrist (around a forearm about 0.035 across at the wrist)
  strap: new CylinderGeometry(0.037, 0.037, 0.016, 18, 1, true),
  bandThin: new CylinderGeometry(0.036, 0.036, 0.01, 18, 1, true),
  bangle: new TorusGeometry(0.039, 0.0045, 6, 20),
  links: new TorusGeometry(0.038, 0.0028, 4, 20),
  face: new CylinderGeometry(0.017, 0.017, 0.008, 18),
  faceGlass: new CylinderGeometry(0.015, 0.015, 0.002, 18),
  square: new BoxGeometry(0.03, 0.006, 0.036),
  squareScreen: new BoxGeometry(0.025, 0.002, 0.03),
  pill: new BoxGeometry(0.014, 0.006, 0.03),
  clip: new BoxGeometry(0.012, 0.012, 0.012),
  coil: new TorusGeometry(0.02, 0.003, 4, 14),
  // Hand
  ring: new TorusGeometry(0.0085, 0.0022, 6, 14),
  signet: new BoxGeometry(0.012, 0.005, 0.012),
  // Head (the head's centre is 0.12 above its group; its radius about 0.115)
  capCrown: new SphereGeometry(0.127, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  capPeak: new CylinderGeometry(0.08, 0.08, 0.008, 18, 1, false, Math.PI / 2, Math.PI),
  beanie: new SphereGeometry(0.124, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
  beanieCuff: new CylinderGeometry(0.124, 0.126, 0.04, 22, 1, true),
  hatDome: new SphereGeometry(0.134, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  hatBrim: new CylinderGeometry(0.16, 0.16, 0.012, 24),
  hatRidge: new BoxGeometry(0.02, 0.02, 0.26),
  helmet: new SphereGeometry(0.135, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
  vent: new BoxGeometry(0.018, 0.012, 0.11),
  trilbyCrown: new CylinderGeometry(0.098, 0.118, 0.1, 22),
  trilbyBrim: new CylinderGeometry(0.17, 0.17, 0.008, 26),
  trilbyBand: new CylinderGeometry(0.119, 0.119, 0.02, 22, 1, true),
  scrubCap: new SphereGeometry(0.125, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
  // Eyes (the glasses sit 0.121 in front of the centre)
  lens: new TorusGeometry(0.021, 0.0028, 6, 18),
  lensRect: new BoxGeometry(0.044, 0.028, 0.004),
  glassDisc: new CylinderGeometry(0.02, 0.02, 0.002, 16),
  bridge: new BoxGeometry(0.022, 0.003, 0.003),
  temple: new BoxGeometry(0.003, 0.003, 0.1),
  shield: new CylinderGeometry(
    0.13,
    0.13,
    0.036,
    22,
    1,
    true,
    Math.PI * 0.7,
    Math.PI * 0.6,
  ),
  goggleStrap: new TorusGeometry(0.118, 0.006, 4, 24),
  // Ears (at x ±0.104)
  bud: new SphereGeometry(0.011, 10, 8),
  stem: new BoxGeometry(0.005, 0.022, 0.006),
  hpBand: new TorusGeometry(0.128, 0.0075, 6, 22, Math.PI),
  cup: new CylinderGeometry(0.036, 0.036, 0.026, 18),
  cupBig: new CylinderGeometry(0.044, 0.044, 0.036, 18),
  boom: new BoxGeometry(0.005, 0.005, 0.1),
  micTip: new SphereGeometry(0.009, 8, 6),
  stud: new SphereGeometry(0.005, 8, 6),
  hoop: new TorusGeometry(0.012, 0.0015, 4, 16),
  // Torso (front at about z −0.11, back at +0.11; the neck at y 0.5)
  necklace: new TorusGeometry(0.085, 0.0018, 4, 28, Math.PI),
  chain: new TorusGeometry(0.083, 0.0042, 5, 28, Math.PI),
  pendant: new SphereGeometry(0.007, 8, 6),
  lanyard: new TorusGeometry(0.066, 0.0035, 4, 18, Math.PI),
  card: new BoxGeometry(0.038, 0.054, 0.004),
  scope: new TorusGeometry(0.072, 0.0065, 6, 20, Math.PI * 1.25),
  tube: new CylinderGeometry(0.0055, 0.0055, 0.11, 8),
  bell: new CylinderGeometry(0.014, 0.014, 0.008, 12),
  fob: new CylinderGeometry(0.014, 0.014, 0.007, 14),
  camBody: new BoxGeometry(0.1, 0.064, 0.04),
  camLens: new CylinderGeometry(0.022, 0.024, 0.045, 16),
  camStrap: new TorusGeometry(0.09, 0.004, 4, 24, Math.PI),
  // Back and shoulder
  pack: new BoxGeometry(0.26, 0.34, 0.13),
  packPocket: new BoxGeometry(0.2, 0.13, 0.03),
  packStrap: new BoxGeometry(0.035, 0.32, 0.012),
  sling: new BoxGeometry(0.03, 0.56, 0.01),
  laptopBag: new BoxGeometry(0.36, 0.27, 0.07),
  satchel: new BoxGeometry(0.28, 0.22, 0.09),
  flap: new BoxGeometry(0.28, 0.12, 0.006),
  // Waist (at the belt, in the body's frame)
  pouch: new BoxGeometry(0.07, 0.09, 0.05),
  hammer: new BoxGeometry(0.012, 0.15, 0.012),
  tape: new BoxGeometry(0.05, 0.05, 0.028),
  keyRing: new TorusGeometry(0.012, 0.002, 4, 12),
  key: new BoxGeometry(0.006, 0.03, 0.002),
  wallet: new BoxGeometry(0.075, 0.1, 0.014),
  // Carried in the hand (the hand's grip at its group's origin)
  caseBody: new BoxGeometry(0.4, 0.29, 0.085),
  handle: new TorusGeometry(0.03, 0.006, 4, 12, Math.PI),
  docBag: new BoxGeometry(0.34, 0.26, 0.06),
  folder: new BoxGeometry(0.24, 0.31, 0.03),
  calc: new BoxGeometry(0.09, 0.14, 0.018),
  calcScreen: new BoxGeometry(0.07, 0.025, 0.002),
  tablet: new BoxGeometry(0.17, 0.24, 0.009),
  tabletScreen: new BoxGeometry(0.155, 0.225, 0.002),
  kit: new BoxGeometry(0.26, 0.18, 0.06),
  meter: new BoxGeometry(0.08, 0.15, 0.035),
  dial: new CylinderGeometry(0.018, 0.018, 0.006, 12),
  mic: new CylinderGeometry(0.012, 0.016, 0.16, 12),
  micHead: new SphereGeometry(0.025, 12, 10),
  tripod: new CylinderGeometry(0.014, 0.014, 0.48, 8),
  duck: new SphereGeometry(0.035, 12, 10),
  duckHead: new SphereGeometry(0.022, 12, 10),
  beak: new BoxGeometry(0.02, 0.008, 0.014),
  // Feet (the shoe's group at the ankle)
  upper: new SphereGeometry(1, 16, 12),
  sole: new BoxGeometry(0.1, 0.018, 0.25),
  shaft: new CylinderGeometry(0.052, 0.056, 0.12, 14),
  toecap: new SphereGeometry(0.048, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  strapThin: new BoxGeometry(0.1, 0.008, 0.02),
} satisfies Record<string, BufferGeometry>

/** What is on the head: hat, glasses, audio, earrings. In the head's own frame. */
export function HeadWear({ wear, c }: { wear?: Wear[]; c: number }) {
  if (!wear?.length) return null
  const head = has(wear, 'head')
  const eyes = has(wear, 'eyes')
  const ears = has(wear, 'ears')
  const rings = has(wear, 'earrings')
  return (
    <group>
      {head && <Hat model={head.model} colour={head.colour} c={c} />}
      {eyes && <Eyewear model={eyes.model} colour={eyes.colour} c={c} />}
      {ears && <Audio model={ears.model} colour={ears.colour} c={c} />}
      {rings && <Earrings model={rings.model} colour={rings.colour} c={c} />}
    </group>
  )
}

function Hat({ model, colour, c }: { model: Model; colour: string; c: number }) {
  switch (model) {
    case 'cap':
      return (
        <group position={[0, c + 0.02, 0]}>
          <mesh geometry={G.capCrown} material={finish(colour, 'fabric')} />
          <mesh
            geometry={G.capPeak}
            material={finish(colour, 'fabric')}
            position={[0, 0.002, -0.07]}
            rotation={[-0.3, 0, 0]}
          />
          <mesh
            geometry={G.pendant}
            material={finish(colour, 'fabric')}
            position={[0, 0.127, 0]}
          />
        </group>
      )
    case 'beanie':
      return (
        <group position={[0, c + 0.012, 0.002]}>
          <mesh
            geometry={G.beanie}
            material={finish(colour, 'fabric')}
            scale={[1, 1.12, 1]}
          />
          <mesh
            geometry={G.beanieCuff}
            material={finish(colour, 'fabric')}
            position={[0, 0.012, 0]}
          />
        </group>
      )
    case 'hardhat':
      return (
        <group position={[0, c + 0.035, 0]}>
          <mesh geometry={G.hatDome} material={finish(colour, 'plastic')} />
          <mesh
            geometry={G.hatBrim}
            material={finish(colour, 'plastic')}
            position={[0, 0.004, -0.012]}
          />
          <mesh
            geometry={G.hatRidge}
            material={finish(colour, 'plastic')}
            position={[0, 0.128, 0]}
          />
        </group>
      )
    case 'helmet':
      return (
        <group position={[0, c + 0.03, 0.01]}>
          <mesh
            geometry={G.helmet}
            material={finish(colour, 'plastic')}
            scale={[1, 0.95, 1.12]}
          />
          {[-0.04, 0, 0.04].map((x) => (
            <mesh
              key={x}
              geometry={G.vent}
              material={finish(DARK, 'plastic')}
              position={[x, 0.118, 0]}
            />
          ))}
        </group>
      )
    case 'scrub-cap':
      return (
        <mesh
          geometry={G.scrubCap}
          material={finish(colour, 'fabric')}
          position={[0, c + 0.02, 0.004]}
          scale={[1, 0.92, 1.02]}
        />
      )
    case 'trilby':
      return (
        <group position={[0, c + 0.085, 0]}>
          <mesh
            geometry={G.trilbyCrown}
            material={finish(colour, 'fabric')}
            position={[0, 0.03, 0]}
          />
          <mesh
            geometry={G.trilbyBrim}
            material={finish(colour, 'fabric')}
            position={[0, -0.02, 0]}
          />
          <mesh
            geometry={G.trilbyBand}
            material={finish(DARK, 'fabric')}
            position={[0, -0.005, 0]}
          />
        </group>
      )
    default:
      return null
  }
}

function Eyewear({ model, colour, c }: { model: Model; colour: string; c: number }) {
  const frame = finish(
    colour,
    model === 'glasses' && colour === '#b45309' ? 'gold' : 'plastic',
  )
  const temples = (
    <>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          geometry={G.temple}
          material={frame}
          position={[side * 0.1, 0.004, 0.05]}
        />
      ))}
    </>
  )
  const y = c + 0.006
  switch (model) {
    case 'glasses':
    case 'computer-glasses':
    case 'sunglasses':
    case 'reading-glasses': {
      const tint =
        model === 'sunglasses'
          ? '#1f2937'
          : model === 'computer-glasses'
            ? '#fde68a'
            : '#e0f2fe'
      const half = model === 'reading-glasses'
      return (
        <group position={[0, half ? y - 0.01 : y, -0.121]}>
          {[-1, 1].map((side) =>
            model === 'sunglasses' ? (
              <mesh
                key={side}
                geometry={G.lensRect}
                material={frame}
                position={[side * 0.037, 0, 0]}
              />
            ) : (
              <mesh
                key={side}
                geometry={G.lens}
                material={frame}
                position={[side * 0.037, 0, 0]}
                scale={half ? [1.05, 0.6, 1] : 1}
              />
            ),
          )}
          {[-1, 1].map((side) => (
            <mesh
              key={`g${side}`}
              geometry={G.glassDisc}
              material={finish(tint, model === 'sunglasses' ? 'screen' : 'glass')}
              position={[side * 0.037, 0, -0.001]}
              rotation={[Math.PI / 2, 0, 0]}
              scale={half ? [1, 1, 0.6] : 1}
            />
          ))}
          <mesh geometry={G.bridge} material={frame} />
          {temples}
        </group>
      )
    }
    case 'safety-glasses':
      return (
        <group position={[0, y, 0]}>
          <mesh geometry={G.shield} material={finish(colour, 'glass')} />
          <mesh
            geometry={G.bridge}
            material={finish(DARK, 'plastic')}
            position={[0, 0.016, -0.128]}
          />
          {temples}
        </group>
      )
    case 'goggles':
      return (
        <group position={[0, y, 0]}>
          <mesh
            geometry={G.shield}
            material={finish(colour, 'glass')}

            scale={[1.02, 1.5, 1.02]}
          />
          <mesh
            geometry={G.goggleStrap}
            material={finish(DARK, 'rubber')}
            rotation={[Math.PI / 2, 0, 0]}
          />
        </group>
      )
    default:
      return null
  }
}

function Audio({ model, colour, c }: { model: Model; colour: string; c: number }) {
  const shell = finish(colour, 'plastic')
  const y = c - 0.004
  switch (model) {
    case 'earbuds':
      return (
        <>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 0.107, y, 0.004]}>
              <mesh geometry={G.bud} material={shell} />
              <mesh geometry={G.stem} material={shell} position={[0, -0.016, -0.004]} />
            </group>
          ))}
        </>
      )
    case 'headphones':
    case 'gaming-headset':
    case 'earmuffs': {
      const big = model !== 'headphones'
      return (
        <group position={[0, y, 0.005]}>
          <mesh
            geometry={G.hpBand}
            material={shell}
            scale={big ? [0.93, 1.03, 1] : [0.88, 1, 1]}
          />
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              geometry={big ? G.cupBig : G.cup}
              material={shell}
              position={[side * (big ? 0.12 : 0.114), 0, 0]}
              rotation={[0, 0, Math.PI / 2]}
            />
          ))}
          {model === 'gaming-headset' && (
            <>
              <mesh
                geometry={G.boom}
                material={finish(DARK, 'plastic')}
                position={[-0.122, -0.03, -0.05]}
                rotation={[0.35, 0.25, 0]}
              />
              <mesh
                geometry={G.micTip}
                material={finish(DARK, 'rubber')}
                position={[-0.105, -0.05, -0.1]}
              />
            </>
          )}
        </group>
      )
    }
    case 'comms-headset':
      return (
        <group position={[0, y, 0.005]}>
          <mesh geometry={G.hpBand} material={shell} scale={[0.88, 1, 0.5]} />
          <mesh
            geometry={G.cup}
            material={shell}
            position={[-0.114, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
            scale={[0.8, 0.6, 0.8]}
          />
          <mesh
            geometry={G.boom}
            material={shell}
            position={[-0.1, -0.035, -0.055]}
            rotation={[0.4, 0.45, 0]}
          />
          <mesh
            geometry={G.micTip}
            material={finish(DARK, 'rubber')}
            position={[-0.075, -0.06, -0.1]}
          />
        </group>
      )
    default:
      return null
  }
}

function Earrings({ model, colour, c }: { model: Model; colour: string; c: number }) {
  const m = finish(colour, colour === '#ca8a04' ? 'gold' : 'metal')
  return (
    <>
      {[-1, 1].map((side) =>
        model === 'hoops' ? (
          <mesh
            key={side}
            geometry={G.hoop}
            material={m}
            position={[side * 0.106, c - 0.035, 0.006]}
            rotation={[0, Math.PI / 2, 0]}
          />
        ) : (
          <mesh
            key={side}
            geometry={G.stud}
            material={m}
            position={[side * 0.108, c - 0.022, 0.004]}
          />
        ),
      )}
    </>
  )
}

/** On the torso: what is round the neck and on the chest. In the spine's frame. */
export function TorsoWear({ wear }: { wear?: Wear[]; width?: number }) {
  if (!wear?.length) return null
  const neck = has(wear, 'neck')
  const chest = has(wear, 'chest')
  return (
    <group>
      {neck && <Neck model={neck.model} colour={neck.colour} />}
      {chest?.model === 'fob-watch' && (
        <group position={[0.07, 0.38, -0.118]}>
          <mesh
            geometry={G.clip}
            material={finish(chest.colour, 'rubber')}
            position={[0, 0.02, 0]}
          />
          <mesh
            geometry={G.fob}
            material={finish(chest.colour, 'rubber')}
            rotation={[Math.PI / 2, 0, 0]}
          />
          <mesh
            geometry={G.faceGlass}
            material={finish('#f8fafc', 'screen')}
            position={[0, 0, -0.004]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[0.8, 1, 0.8]}
          />
        </group>
      )}
    </group>
  )
}

function Neck({ model, colour }: { model: Model; colour: string }) {
  const metal = finish(colour, colour === '#ca8a04' ? 'gold' : 'metal')
  switch (model) {
    case 'necklace':
      return (
        <group>
          <mesh
            geometry={G.necklace}
            material={metal}
            position={[0, 0.5, -0.04]}
            rotation={[1.25, 0, Math.PI]}
          />
          <mesh geometry={G.pendant} material={metal} position={[0, 0.455, -0.115]} />
        </group>
      )
    case 'chain':
      return (
        <mesh
          geometry={G.chain}
          material={metal}
          position={[0, 0.5, -0.045]}
          rotation={[1.2, 0, Math.PI]}
        />
      )
    case 'badge':
      return (
        <group>
          <mesh
            geometry={G.lanyard}
            material={finish(colour, 'fabric')}
            position={[0, 0.45, -0.09]}
            rotation={[0.2, 0, Math.PI]}
            scale={[0.75, 1.3, 1]}
          />
          <mesh
            geometry={G.card}
            material={finish('#f8fafc', 'plastic')}
            position={[0, 0.345, -0.114]}
          />
          <mesh
            geometry={G.card}
            material={finish(colour, 'plastic')}
            position={[0, 0.365, -0.1165]}
            scale={[1, 0.25, 0.5]}
          />
        </group>
      )
    case 'stethoscope':
      return (
        <group>
          <mesh
            geometry={G.scope}
            material={finish(colour, 'rubber')}
            position={[0, 0.535, -0.01]}
            rotation={[Math.PI / 2, 0, Math.PI * 0.375 + Math.PI]}
          />
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              geometry={G.tube}
              material={finish(colour, 'rubber')}
              position={[side * 0.055, 0.47, -0.095]}
              rotation={[0.15, 0, side * 0.12]}
            />
          ))}
          <mesh
            geometry={G.bell}
            material={finish(STEEL, 'metal')}
            position={[0.06, 0.4, -0.107]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        </group>
      )
    case 'camera':
      return (
        <group>
          <mesh
            geometry={G.camStrap}
            material={finish(DARK, 'fabric')}
            position={[0, 0.47, -0.05]}
            rotation={[0.9, 0, Math.PI]}
            scale={[1, 1.3, 1]}
          />
          <group position={[0, 0.3, -0.15]}>
            <mesh geometry={G.camBody} material={finish(colour, 'plastic')} />
            <mesh
              geometry={G.camLens}
              material={finish(DARK, 'plastic')}
              position={[0, -0.002, -0.04]}
              rotation={[Math.PI / 2, 0, 0]}
            />
            <mesh
              geometry={G.faceGlass}
              material={finish('#334155', 'glass')}
              position={[0, -0.002, -0.063]}
              rotation={[Math.PI / 2, 0, 0]}
              scale={[1.3, 1, 1.3]}
            />
          </group>
        </group>
      )
    default:
      return null
  }
}

/** The bag on the back or the shoulder (in the spine's frame): put down while sitting. */
export function BackWear({ wear, width }: { wear?: Wear[]; width: number }) {
  const back = has(wear, 'back')
  return back ? <Bag model={back.model} colour={back.colour} width={width} /> : null
}

function Bag({ model, colour, width }: { model: Model; colour: string; width: number }) {
  switch (model) {
    case 'backpack':
      return (
        <group>
          <group position={[0, 0.27, 0.16]}>
            <mesh
              geometry={G.pack}
              material={finish(colour, 'fabric')}
              scale={[width, 1, 1]}
            />
            <mesh
              geometry={G.packPocket}
              material={finish(colour, 'fabric')}
              position={[0, -0.08, 0.075]}
              scale={[width, 1, 1]}
            />
          </group>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              geometry={G.packStrap}
              material={finish(DARK, 'fabric')}
              position={[side * 0.085 * width, 0.3, -0.112]}
              rotation={[-0.08, 0, 0]}
            />
          ))}
        </group>
      )
    case 'laptop-bag':
    case 'shoulder-bag': {
      const big = model === 'laptop-bag'
      return (
        <group>
          {/* The strap across the body, from the left shoulder to the right hip */}
          <mesh
            geometry={G.sling}
            material={finish(DARK, model === 'shoulder-bag' ? 'leather' : 'fabric')}
            position={[0, 0.23, -0.114]}
            rotation={[0, 0, 0.62]}
          />
          <mesh
            geometry={G.sling}
            material={finish(DARK, model === 'shoulder-bag' ? 'leather' : 'fabric')}
            position={[0, 0.23, 0.114]}
            rotation={[0, 0, 0.62]}
          />
          <group
            position={[0.21 * width + 0.04, -0.05, 0.02]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <mesh
              geometry={big ? G.laptopBag : G.satchel}
              material={finish(colour, model === 'shoulder-bag' ? 'leather' : 'fabric')}
            />
            {!big && (
              <mesh
                geometry={G.flap}
                material={finish(colour, 'leather')}
                position={[0, 0.06, 0.048]}
              />
            )}
          </group>
        </group>
      )
    }
    default:
      return null
  }
}

/** At the waist, in the body's frame (the belt at `y`): a tool belt, a belt, keys, a tape, a wallet. */
export function WaistWear({
  wear,
  y,
  width,
}: {
  wear?: Wear[]
  y: number
  width: number
}) {
  if (!wear?.length) return null
  const belt = has(wear, 'belt')
  const pockets = wear.filter((w) => w.slot === 'pocket')
  const keys = pockets.find((w) => w.model === 'keys')
  const tape = pockets.find(
    (w) => w.model === 'tape-measure' || w.model === 'laser-measure',
  )
  const wallet = pockets.find((w) => w.model === 'wallet')
  const x = 0.16 * width
  return (
    <group position={[0, y, 0]}>
      {belt?.model === 'tool-belt' && (
        <>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              geometry={G.pouch}
              material={finish(belt.colour, 'leather')}
              position={[side * x, -0.06, -0.035]}
            />
          ))}
          <mesh
            geometry={G.hammer}
            material={finish('#78350f', 'leather')}
            position={[x + 0.03, -0.1, -0.06]}
          />
        </>
      )}
      {keys && (
        <group position={[-x + 0.02, -0.03, -0.12]}>
          <mesh geometry={G.keyRing} material={finish(keys.colour, 'metal')} />
          {[-0.006, 0.006].map((kx) => (
            <mesh
              key={kx}
              geometry={G.key}
              material={finish(STEEL, 'metal')}
              position={[kx, -0.022, 0]}
              rotation={[0, 0, kx * 20]}
            />
          ))}
        </group>
      )}
      {tape && (
        <mesh
          geometry={G.tape}
          material={finish(tape.colour, 'plastic')}
          position={[-(x + 0.035), -0.05, 0]}
          rotation={[0, Math.PI / 2, 0]}
        />
      )}
      {wallet && (
        <mesh
          geometry={G.wallet}
          material={finish(wallet.colour, 'leather')}
          position={[0.06 * width, -0.08, 0.122]}
        />
      )}
    </group>
  )
}

/** On a wrist (in the forearm's frame: the wrist at y −0.235). */
export function WristWear({ wear, side }: { wear?: Wear[]; side: 'left' | 'right' }) {
  if (!wear?.length) return null
  const w = has(wear, side === 'left' ? 'wrist' : 'wrist2')
  const ring = side === 'left' ? has(wear, 'ring') : undefined
  return (
    <group>
      {/* The face on the back of the wrist: outwards (−x on the left arm, +x on the right) */}
      {w && (
        <group rotation={[0, side === 'left' ? -Math.PI / 2 : Math.PI / 2, 0]}>
          <Wrist model={w.model} colour={w.colour} />
        </group>
      )}
      {ring && (
        <group position={[0.0075, -0.315, -0.006]}>
          <mesh
            geometry={G.ring}
            material={finish(ring.colour, ring.colour === '#ca8a04' ? 'gold' : 'metal')}
            rotation={[Math.PI / 2, 0, 0]}
          />
          {ring.model === 'signet' && (
            <mesh
              geometry={G.signet}
              material={finish(ring.colour, 'gold')}
              position={[0, 0, -0.01]}
              rotation={[Math.PI / 2, 0, 0]}
            />
          )}
        </group>
      )}
    </group>
  )
}

function Wrist({ model, colour }: { model: Model; colour: string }) {
  const y = -0.225
  // The face on the back of the wrist (the outside of the forearm, +x on the left arm).
  switch (model) {
    case 'watch':
    case 'digital-watch': {
      const strap = finish(colour, model === 'digital-watch' ? 'rubber' : 'leather')
      return (
        <group position={[0, y, 0]}>
          <mesh geometry={G.strap} material={strap} />
          <group position={[0, 0, 0.038]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh
              geometry={model === 'watch' ? G.face : G.square}
              material={finish(
                model === 'watch' ? (colour === '#b45309' ? '#ca8a04' : STEEL) : DARK,
                model === 'watch' ? (colour === '#b45309' ? 'gold' : 'metal') : 'plastic',
              )}
            />
            <mesh
              geometry={model === 'watch' ? G.faceGlass : G.squareScreen}
              material={finish(
                model === 'watch' ? '#f8fafc' : '#94a3b8',
                model === 'watch' ? 'glass' : 'screen',
              )}
              position={[0, 0.005, 0]}
            />
          </group>
        </group>
      )
    }
    case 'smartwatch':
      return (
        <group position={[0, y, 0]}>
          <mesh geometry={G.strap} material={finish(colour, 'rubber')} />
          <group position={[0, 0, 0.039]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh geometry={G.square} material={finish(DARK, 'plastic')} />
            <mesh
              geometry={G.squareScreen}
              material={finish('#38bdf8', 'screen')}
              position={[0, 0.004, 0]}
            />
          </group>
        </group>
      )
    case 'tracker':
      return (
        <group position={[0, y, 0]}>
          <mesh geometry={G.bandThin} material={finish(colour, 'rubber')} />
          <mesh
            geometry={G.pill}
            material={finish(DARK, 'screen')}
            position={[0, 0, 0.037]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        </group>
      )
    case 'bangle':
      return (
        <mesh
          geometry={G.bangle}
          material={finish(
            colour,
            colour === '#b45309' ? 'gold' : colour.startsWith('#d') ? 'metal' : 'leather',
          )}
          position={[0, y - 0.012, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      )
    case 'chain-bracelet':
      return (
        <mesh
          geometry={G.links}
          material={finish(colour, colour === '#ca8a04' ? 'gold' : 'metal')}
          position={[0, y - 0.01, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      )
    case 'esd-strap':
      return (
        <group position={[0, y, 0]}>
          <mesh geometry={G.strap} material={finish(colour, 'fabric')} />
          <mesh
            geometry={G.clip}
            material={finish(STEEL, 'metal')}
            position={[0, 0, 0.04]}
          />
          <mesh
            geometry={G.coil}
            material={finish('#1d4ed8', 'rubber')}
            position={[0, -0.04, 0.05]}
            rotation={[0, Math.PI / 2, 0]}
          />
        </group>
      )
    default:
      return null
  }
}

/** Carried in the left hand (the grip at the hand group's origin), unless the hand holds something. */
export function Carried({ wear }: { wear?: Wear[] }) {
  const c = has(wear, 'carry')
  if (!c) return null
  const body = (kind: Finish) => finish(c.colour, kind)
  switch (c.model) {
    case 'briefcase':
      return (
        <group position={[0, -0.18, 0]}>
          <mesh
            geometry={G.handle}
            material={finish(DARK, 'leather')}
            position={[0, 0.16, 0]}
          />
          <mesh
            geometry={G.caseBody}
            material={body('leather')}
            rotation={[0, Math.PI / 2, 0]}
          />
          {[-0.08, 0.08].map((z) => (
            <mesh
              key={z}
              geometry={G.clip}
              material={finish('#ca8a04', 'gold')}
              position={[0.045, 0.12, z]}
            />
          ))}
        </group>
      )
    case 'document-bag':
      return (
        <group position={[0, -0.15, 0]}>
          <mesh
            geometry={G.docBag}
            material={body('fabric')}
            rotation={[0, Math.PI / 2, 0]}
          />
        </group>
      )
    case 'folder':
      return (
        <mesh
          geometry={G.folder}
          material={body('plastic')}
          position={[0.03, -0.12, 0]}
          rotation={[0, Math.PI / 2, 0.15]}
        />
      )
    case 'calculator':
      return (
        <group position={[0, -0.04, -0.03]} rotation={[-1.2, 0, 0]}>
          <mesh geometry={G.calc} material={body('plastic')} />
          <mesh
            geometry={G.calcScreen}
            material={finish('#a7f3d0', 'screen')}
            position={[0, 0.045, -0.01]}
          />
        </group>
      )
    case 'tablet':
      return (
        <group position={[0.02, -0.11, 0]} rotation={[0, Math.PI / 2, 0.1]}>
          <mesh geometry={G.tablet} material={body('plastic')} />
          <mesh
            geometry={G.tabletScreen}
            material={finish('#0f172a', 'screen')}
            position={[0, 0, -0.006]}
          />
        </group>
      )
    case 'toolkit':
      return (
        <group position={[0, -0.13, 0]}>
          <mesh
            geometry={G.kit}
            material={body('fabric')}
            rotation={[0, Math.PI / 2, 0]}
          />
          <mesh
            geometry={G.handle}
            material={finish(DARK, 'rubber')}
            position={[0, 0.1, 0]}
          />
        </group>
      )
    case 'multimeter':
      return (
        <group position={[0, -0.06, -0.03]} rotation={[-1.1, 0, 0]}>
          <mesh geometry={G.meter} material={body('plastic')} />
          <mesh
            geometry={G.calcScreen}
            material={finish('#cbd5e1', 'screen')}
            position={[0, 0.045, -0.019]}
          />
          <mesh
            geometry={G.dial}
            material={finish(DARK, 'plastic')}
            position={[0, -0.01, -0.019]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        </group>
      )
    case 'microphone':
      return (
        <group position={[0, 0.02, -0.02]} rotation={[-0.4, 0, 0]}>
          <mesh geometry={G.mic} material={body('plastic')} />
          <mesh
            geometry={G.micHead}
            material={finish('#64748b', 'metal')}
            position={[0, 0.1, 0]}
          />
        </group>
      )
    case 'tripod':
      return (
        <group position={[0, -0.1, 0]}>
          {[-0.012, 0, 0.012].map((x) => (
            <mesh
              key={x}
              geometry={G.tripod}
              material={body('metal')}
              position={[x, 0, x]}
            />
          ))}
        </group>
      )
    case 'rubber-duck':
      return (
        <group position={[0, -0.03, -0.04]}>
          <mesh geometry={G.duck} material={body('rubber')} scale={[1, 0.8, 1.2]} />
          <mesh
            geometry={G.duckHead}
            material={body('rubber')}
            position={[0, 0.035, -0.025]}
          />
          <mesh
            geometry={G.beak}
            material={finish('#ea580c', 'rubber')}
            position={[0, 0.032, -0.05]}
          />
        </group>
      )
    default:
      return null
  }
}

/** The shoes, in place of the plain ones (in the shoe's frame, at the ankle). */
export function Footwear({ wear, skin }: { wear?: Wear[]; skin: MeshStandardMaterial }) {
  const f = has(wear, 'feet')
  if (!f) return null
  switch (f.model) {
    case 'sneakers':
      return (
        <group>
          <mesh
            geometry={G.upper}
            material={finish(f.colour, 'fabric')}
            position={[0, -0.026, -0.045]}
            scale={[0.054, 0.04, 0.128]}
          />
          <mesh
            geometry={G.sole}
            material={finish('#f8fafc', 'rubber')}
            position={[0, -0.058, -0.042]}
            scale={[1.05, 1.2, 1.05]}
          />
        </group>
      )
    case 'formal-shoes':
      return (
        <group>
          <mesh
            geometry={G.upper}
            material={finish(f.colour, 'metal')}
            position={[0, -0.03, -0.05]}
            scale={[0.046, 0.032, 0.13]}
          />
          <mesh
            geometry={G.sole}
            material={finish('#1c1917', 'leather')}
            position={[0, -0.058, -0.045]}
            scale={[0.92, 0.8, 1.02]}
          />
        </group>
      )
    case 'safety-boots':
      return (
        <group>
          <mesh
            geometry={G.shaft}
            material={finish(f.colour, 'leather')}
            position={[0, 0.02, 0.005]}
          />
          <mesh
            geometry={G.upper}
            material={finish(f.colour, 'leather')}
            position={[0, -0.022, -0.045]}
            scale={[0.058, 0.045, 0.132]}
          />
          <mesh
            geometry={G.toecap}
            material={finish(f.colour, 'leather')}
            position={[0, -0.04, -0.12]}
            scale={[1, 0.7, 1.1]}
          />
          <mesh
            geometry={G.sole}
            material={finish(DARK, 'rubber')}
            position={[0, -0.06, -0.042]}
            scale={[1.15, 1.5, 1.08]}
          />
        </group>
      )
    case 'sandals':
      return (
        <group>
          <mesh
            geometry={G.upper}
            material={skin}
            position={[0, -0.03, -0.045]}
            scale={[0.046, 0.026, 0.115]}
          />
          <mesh
            geometry={G.sole}
            material={finish(f.colour, 'leather')}
            position={[0, -0.058, -0.04]}
            scale={[0.95, 0.9, 1]}
          />
          {[-0.08, -0.01].map((z) => (
            <mesh
              key={z}
              geometry={G.strapThin}
              material={finish(f.colour, 'leather')}
              position={[0, -0.03, z]}
            />
          ))}
        </group>
      )
    default:
      return null
  }
}

/** Everything drawn, for the shop's turntable (one item alone, centred). */
export function Showcase({ wear }: { wear: Wear }) {
  const one = [wear]
  const c = 0
  switch (wear.slot) {
    case 'head':
    case 'eyes':
    case 'ears':
    case 'earrings':
      return (
        <group position={[0, -0.12, 0]} scale={2.4}>
          <HeadWear wear={one} c={c + 0.05} />
        </group>
      )
    case 'neck':
    case 'chest':
    case 'back':
      return (
        <group position={[0, -0.7, 0]} scale={1.6}>
          <BackWear wear={one} width={1} />
        </group>
      )
    case 'wrist':
    case 'wrist2':
    case 'ring':
      return (
        <group
          position={[0, 0.9, 0]}
          scale={4}
          rotation={[0, wear.slot === 'ring' ? 0 : -Math.PI / 2, 0]}
        >
          <WristWear
            wear={[{ ...wear, slot: wear.slot === 'wrist2' ? 'wrist' : wear.slot }]}
            side="left"
          />
        </group>
      )
    case 'carry':
      return (
        <group position={[0, 0.25, 0]} scale={1.6}>
          <Carried wear={one} />
        </group>
      )
    case 'belt':
    case 'pocket':
      return (
        <group position={[0, 0, 0]} scale={3}>
          <WaistWear wear={wear.slot === 'belt' ? one : [{ ...wear }]} y={0} width={1} />
        </group>
      )
    case 'feet':
      return (
        <group position={[0, 0.1, 0]} scale={3} rotation={[0, Math.PI / 4, 0]}>
          <Footwear wear={one} skin={finish('#d6a77a', 'leather')} />
        </group>
      )
    case 'body':
    case 'hands':
      return null
    default:
      return null
  }
}

/** A bag on its own (on a hook: its top at the origin), without straps on a body. */
function BagAlone({ model, colour }: { model: Model; colour: string }) {
  switch (model) {
    case 'backpack':
      return (
        <group position={[0, -0.19, 0]}>
          <mesh geometry={G.pack} material={finish(colour, 'fabric')} />
          <mesh
            geometry={G.packPocket}
            material={finish(colour, 'fabric')}
            position={[0, -0.08, 0.075]}
          />
          <mesh
            geometry={G.handle}
            material={finish(DARK, 'fabric')}
            position={[0, 0.18, 0]}
          />
        </group>
      )
    case 'laptop-bag':
      return (
        <group position={[0, -0.16, 0]}>
          <mesh geometry={G.laptopBag} material={finish(colour, 'fabric')} />
          <mesh
            geometry={G.handle}
            material={finish(DARK, 'fabric')}
            position={[0, 0.15, 0]}
          />
        </group>
      )
    case 'shoulder-bag':
      return (
        <group position={[0, -0.14, 0]}>
          <mesh geometry={G.satchel} material={finish(colour, 'leather')} />
          <mesh
            geometry={G.flap}
            material={finish(colour, 'leather')}
            position={[0, 0.06, 0.048]}
          />
          <mesh
            geometry={G.handle}
            material={finish(DARK, 'leather')}
            position={[0, 0.12, 0]}
          />
        </group>
      )
    default:
      return null
  }
}

/**
 * Something kept at home rather than worn (on the coat stand by the door, or in
 * the tray on the table beside it): a bag or a hat on a hook, a briefcase, a
 * watch or bracelet lying in the tray.
 */
export function Kept({ wear }: { wear: Wear }) {
  switch (wear.slot) {
    case 'back':
      return <BagAlone model={wear.model} colour={wear.colour} />
    case 'carry':
      return <Carried wear={[wear]} />
    case 'head':
      return (
        <group position={[0, -0.13, 0.06]} rotation={[-0.5, 0, 0]}>
          <Hat model={wear.model} colour={wear.colour} c={0} />
        </group>
      )
    case 'wrist':
    case 'wrist2':
      return (
        <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
          <group position={[0, 0.225, 0]}>
            <Wrist model={wear.model} colour={wear.colour} />
          </group>
        </group>
      )
    default:
      return null
  }
}

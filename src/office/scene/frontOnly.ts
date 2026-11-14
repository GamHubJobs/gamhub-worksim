import { useFrame } from '@react-three/fiber'
import { useRef, type RefObject } from 'react'

/**
 * Hides a flat sign while the camera is behind it. Labels in the scene are
 * page elements laid into 3D: seen from behind they would show through the
 * wall they hang on, mirrored and often huge when the camera is close.
 */
export function useFrontOnly(
  ref: RefObject<HTMLElement | null>,
  position: [number, number, number],
  rotation: number,
) {
  const shown = useRef(true)
  useFrame(({ camera }) => {
    const el = ref.current
    if (!el) return
    // The sign faces +z turned by `rotation` about the vertical.
    const nx = Math.sin(rotation)
    const nz = Math.cos(rotation)
    const front =
      (camera.position.x - position[0]) * nx + (camera.position.z - position[2]) * nz > 0
    if (front !== shown.current) {
      shown.current = front
      el.style.visibility = front ? 'visible' : 'hidden'
    }
  })
}

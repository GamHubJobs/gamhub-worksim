# The world map and the mini-map

The map is its own game screen, not part of the phone.

- **Opening it**: **M** (changeable with the other keys), the **Map** button on the HUD,
  **Map** in the pause menu (Esc), or **Open the map** in the phone's Maps app (the phone
  is put away first). **M** or **Esc** closes it; the game carries on exactly where it
  was. While it is open, the keys are the map's: the character does not move.
- **The world map** (full screen): the neighbourhood drawn from the same data as the 3D
  street (`city/worldMap.ts`): the road, pavements and crossings, every building along
  both sides, the park, and the places with their icons. Places the player has not been
  to or walked past yet show as "Not yet found" (home and work are known from the start).
  Wheel or the buttons to zoom, drag to move, "Where am I?" to come back. Clicking a place
  shows its name, what it is, its opening hours, how far it is (metres and minutes on
  foot) and what there is to do; **Set as destination** (or clear it).
- **The route**: worked out by the street's own walking grid (the one the character
  walks on), from where the player is to the door of the destination, along the
  pavements and the road, never through buildings; it is worked out again every second.
  It shows on the world map and on the mini-map. Arriving (going in) clears the
  destination. Nothing moves the player: they walk (or ride, or drive) there.
- **The mini-map** (HUD, bottom right): the street round the player, turned so the way
  they face is up, "N" for north, nearby places, the destination ring, the route, and a
  red pointer towards the destination when it is off the edge. Indoors it says where the
  player is. Click it for the world map; off in the phone's Settings.
- **The phone's Maps app**: a shortcut to the map, with the current destination and
  recent destinations.
- **Saved**: the destination, recent destinations and the places found (`life.nav`), and
  the mini-map setting (`life.phone.minimap`); defaults for older saves.

## Limits

- The map covers the neighbourhood's street, where the 3D world is. Indoors (home, the
  office, the café…) the player is shown at the place they are in; there are no indoor
  maps. The world has no cinema, hospital or police station yet, so the map has none:
  only places that exist are on it.

/**
 * The computer's own windows: Settings (background and icon size) and the
 * Recycle Bin. They change only how the desktop looks, never game data.
 */
import { useState } from 'react'
import { prefersBasicEditors, setPrefersBasicEditors } from '../../apps/craft/crafts'
import { ICON_SIZES, WALLPAPERS, type DesktopSettings } from './desktopSettings'
import { Wallpaper } from './DesktopSurface'

export function SettingsWindow({
  settings,
  onSettings,
  screen,
}: {
  settings: DesktopSettings
  onSettings: (settings: DesktopSettings) => void
  screen: { w: number; h: number }
}) {
  return (
    <div className="h-full overflow-y-auto bg-white p-6 text-sm text-slate-800">
      <h2 className="text-2xl font-light">Personalisation</h2>

      <h3 className="mt-5 font-semibold">Background</h3>
      <div
        className="mt-2 flex flex-wrap gap-3"
        role="radiogroup"
        aria-label="Background"
      >
        {WALLPAPERS.map((wallpaper) => (
          <button
            key={wallpaper.id}
            type="button"
            role="radio"
            aria-checked={settings.wallpaper === wallpaper.id}
            onClick={() => onSettings({ ...settings, wallpaper: wallpaper.id })}
            className={`w-36 text-left ${
              settings.wallpaper === wallpaper.id
                ? 'ring-2 ring-[#1f6fbf] ring-offset-2'
                : ''
            }`}
          >
            <span className="relative block h-20 overflow-hidden">
              <Wallpaper id={wallpaper.id} />
            </span>
            <span className="mt-1 block text-xs">{wallpaper.name}</span>
          </button>
        ))}
      </div>

      <h3 className="mt-5 font-semibold">Desktop icons</h3>
      <div className="mt-2 flex gap-4" role="radiogroup" aria-label="Icon size">
        {ICON_SIZES.map((size) => (
          <label key={size} className="flex items-center gap-1.5">
            <input
              type="radio"
              name="icon-size"
              checked={settings.iconSize === size}
              onChange={() => onSettings({ ...settings, iconSize: size })}
            />
            {size[0].toUpperCase() + size.slice(1)}
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onSettings({ ...settings, positions: {} })}
        className="mt-3 border border-slate-300 bg-slate-100 px-3 py-1 hover:bg-slate-200"
      >
        Put icons back in their default places
      </button>

      <OfficeApps />

      <h3 className="mt-5 font-semibold">Display</h3>
      <p className="mt-1 text-slate-600">
        Desktop area: {screen.w} × {screen.h}. Windows open full screen when the browser
        window is small; make it larger (or zoom out) to see several side by side.
      </p>
    </div>
  )
}

/** Which editors the office uses, on this device. */
function OfficeApps() {
  const [basic, setBasic] = useState(prefersBasicEditors)
  return (
    <>
      <h3 className="mt-5 font-semibold">Office apps</h3>
      <label className="mt-2 flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={basic}
          onChange={(event) => {
            setPrefersBasicEditors(event.target.checked)
            setBasic(event.target.checked)
          }}
        />
        <span>
          Use the basic spreadsheet editor instead of Grid Craft
          <span className="block text-slate-600">
            Grid Craft is drawn as a picture of its window, which screen readers may not
            read. The basic editor reads out every cell. Your files work in both; files
            opened after this change use the editor chosen.
          </span>
        </span>
      </label>
    </>
  )
}

export function RecycleBinWindow() {
  return (
    <div className="flex h-full flex-col bg-white text-sm">
      <div className="border-b border-slate-200 px-4 py-2 text-xs text-slate-500">
        Recycle Bin · 0 items
      </div>
      <p className="flex flex-1 items-center justify-center p-6 text-center text-slate-500">
        This folder is empty. Files you delete in WorkSim&apos;s apps are removed straight
        away; restore older copies from a file&apos;s version history or a backup.
      </p>
    </div>
  )
}

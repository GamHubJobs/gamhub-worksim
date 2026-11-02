// Runs before every test file.

// Tests run outside the browser, so they have no real IndexedDB.
// This installs a simulated in-memory IndexedDB that behaves the same way.
import 'fake-indexeddb/auto'

// Career content is loaded on demand in the app; tests have every career loaded.
import { loadAllCareerContent } from '../content/loader'
await loadAllCareerContent()

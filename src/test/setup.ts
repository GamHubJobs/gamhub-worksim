// Runs before every test file.

// Tests run outside the browser, so they have no real IndexedDB.
// This installs a simulated in-memory IndexedDB that behaves the same way.
import 'fake-indexeddb/auto'

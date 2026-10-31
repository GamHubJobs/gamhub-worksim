/** A saved record failed validation: it is damaged or has an unexpected shape. */
export class InvalidRecordError extends Error {
  readonly table: string
  readonly recordId: string

  constructor(table: string, recordId: string, details: string) {
    super(`Saved ${table} record ${recordId} is damaged or invalid:\n${details}`)
    this.name = 'InvalidRecordError'
    this.table = table
    this.recordId = recordId
  }
}

/** A record that should exist could not be found (or has been deleted). */
export class RecordNotFoundError extends Error {
  readonly table: string
  readonly recordId: string

  constructor(table: string, recordId: string) {
    super(`No ${table} record with ID ${recordId} was found.`)
    this.name = 'RecordNotFoundError'
    this.table = table
    this.recordId = recordId
  }
}

/** Saved data was created by a newer version of WorkSim than this one. */
export class NewerFormatError extends Error {
  constructor(what: string, savedVersion: number, supportedVersion: number) {
    super(
      `This ${what} was saved by a newer version of GamHub WorkSim ` +
        `(format ${savedVersion}; this version supports up to ${supportedVersion}). ` +
        'Please update the app.',
    )
    this.name = 'NewerFormatError'
  }
}

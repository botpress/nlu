import Knex from 'knex'
export interface KnexExtension {
isLite: boolean
location: string
createTableIfNotExists(tableName: string, cb: Knex.KnexCallback): Promise<boolean>
date: Knex.Date
bool: Knex.Bool
json: Knex.Json
binary: Knex.Binary
insertAndRetrieve<T>(
    tableName: string,
    data: {},
    returnColumns?: string | string[],
    idColumnName?: string,
    trx?: Knex.Transaction
): Promise<T>
}

export type KnexExtended = Knex & KnexExtension

export interface Logger {
    forBot(botId: string): this
    attachError(error: Error): this

    persist(shouldPersist: boolean): this
    level(level: LogLevel): this
    noEmit(): this

    /**
     * Sets the level that will be required at runtime to
     * display the next message.
     * 0 = Info / Error (default)
     * 1 = Warning
     * 2 = Debug
     * 3 = Silly
     * @param level The level to apply for the next message
     */
    level(level: LogLevel): this
    debug(message: string, metadata?: any): void
    info(message: string, metadata?: any): void
    warn(message: string, metadata?: any): void
    error(message: string, metadata?: any): void
    critical(message: string, metadata?: any): void
}

export enum LogLevel {
    PRODUCTION = 0,
    DEV = 1,
    DEBUG = 2
}

export interface DirectoryListingOptions {
    excludes?: string | string[]
    includeDotFiles?: boolean
    sortOrder?: SortOrder & { column: 'filePath' | 'modifiedOn' }
  }

  export interface SortOrder {
    /** The name of the column  */
    column: string
    /** Is the sort order ascending or descending? Asc by default */
    desc?: boolean
  }

  export interface UpsertOptions {
    /** Whether or not to record a revision @default true */
    recordRevision?: boolean
    /** When enabled, files changed on the database are synced locally so they can be used locally (eg: require in actions) @default false */
    syncDbToDisk?: boolean
    /** This is only applicable for bot-scoped ghost. When true, the lock status of the bot is ignored. @default false */
    ignoreLock?: boolean
  }

  export interface ListenHandle {
    /** Stops listening from the event */
    remove(): void
  }

  export interface ScopedGhostService {
    /**
     * Insert or Update the file at the specified location
     * @param rootFolder - Folder relative to the scoped parent
     * @param file - The name of the file
     * @param content - The content of the file
     */
    upsertFile(rootFolder: string, file: string, content: string | Buffer, options?: UpsertOptions): Promise<void>
    readFileAsBuffer(rootFolder: string, file: string): Promise<Buffer>
    readFileAsString(rootFolder: string, file: string): Promise<string>
    readFileAsObject<T>(rootFolder: string, file: string): Promise<T>
    renameFile(rootFolder: string, fromName: string, toName: string): Promise<void>
    deleteFile(rootFolder: string, file: string): Promise<void>
    /**
     * List all the files matching the ending pattern in the folder.
     * DEPRECATE WARNING: exclude and includedDotFiles must be defined in options in future versions
     * @example bp.ghost.forBot('welcome-bot').directoryListing('./questions', '*.json')
     * @param rootFolder - Folder relative to the scoped parent
     * @param fileEndingPattern - The pattern to match. Don't forget to include wildcards!
     * @param @deprecated exclude - The pattern to match excluded files.
     * @param @deprecated includeDotFiles - Whether or not to include files starting with a dot (normally disabled files)
     */
    directoryListing(
      rootFolder: string,
      fileEndingPattern: string,
      exclude?: string | string[],
      includeDotFiles?: boolean,
      options?: DirectoryListingOptions
    ): Promise<string[]>
    /**
     * Starts listening on all file changes (deletion, inserts and updates)
     * `callback` will be called for every change
     * To stop listening, call the `remove()` method of the returned ListenHandle
     */
    onFileChanged(callback: (filePath: string) => void): ListenHandle
    fileExists(rootFolder: string, file: string): Promise<boolean>
  }
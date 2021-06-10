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

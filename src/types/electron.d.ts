// Electron API type declarations
export interface ElectronAPI {
  // File system operations
  getDataPath: () => Promise<string>
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
  listFiles: (dirPath: string) => Promise<{ success: boolean; files?: string[]; error?: string }>
  deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>
  
  // Dialog operations
  showSaveDialog: (options: any) => Promise<{ canceled: boolean; filePath?: string }>
  showOpenDialog: (options: any) => Promise<{ canceled: boolean; filePaths?: string[] }>
  
  // Logging
  appendLog: (logType: string, message: string) => Promise<{ success: boolean; error?: string }>
  
  // Platform info
  platform: string
  isElectron: boolean
}

export interface StorageAPI {
  setItem: (key: string, value: any) => boolean
  getItem: (key: string, defaultValue?: any) => any
  removeItem: (key: string) => boolean
  clear: () => boolean
  keys: () => string[]
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
    storageAPI?: StorageAPI
  }
}

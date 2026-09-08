export interface PrivateScoreFileStore {
  download(input: {
    url: string;
    choirId: string;
    fileId: string;
    signal: AbortSignal;
  }): Promise<{ uri: string; size: number }>;
  remove(uri: string): Promise<void>;
  clear(): Promise<void>;
}

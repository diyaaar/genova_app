import { PdfPageImage } from '@dariyd/react-native-pdf-page-image';
import type { NativePageImage } from './reader-contract';

export interface NativePdfRenderer {
  open(uri: string): Promise<{ pageCount: number }>;
  generate(uri: string, zeroBasedPage: number): Promise<NativePageImage>;
  close(uri: string): Promise<void>;
}

export const nativePdfRenderer: NativePdfRenderer = {
  open: (uri) => PdfPageImage.open(uri),
  generate: (uri, zeroBasedPage) => PdfPageImage.generate(uri, zeroBasedPage, 2, {
    format: 'jpeg',
    quality: 88,
    maxDimension: 2200,
  }),
  close: (uri) => PdfPageImage.close(uri),
};

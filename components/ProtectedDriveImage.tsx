'use client';

import type { ImgHTMLAttributes, ReactNode } from 'react';

import { useProtectedDriveFileUrl } from '@/hooks/useProtectedDriveFileUrl';
import type { RepertoireFile } from '@/lib/supabase';

interface ProtectedDriveImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  file: (Pick<RepertoireFile, 'drive_file_id'> & Partial<Pick<RepertoireFile, 'id' | 'file_name' | 'mime_type' | 'updated_at' | 'file_size_bytes'>>) | null | undefined;
  fallback?: ReactNode;
  repertoireFile?: boolean;
}

export function ProtectedDriveImage({ file, fallback = null, repertoireFile = false, alt = '', ...props }: ProtectedDriveImageProps) {
  const { url } = useProtectedDriveFileUrl(file, { repertoireFile });

  if (!file?.drive_file_id || !url) {
    return <>{fallback}</>;
  }

  return <img {...props} src={url} alt={alt} />;
}

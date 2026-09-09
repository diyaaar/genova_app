import { AnnotationSaveQueue } from '@/lib/repertuvar/annotation-save-queue';
import { saveLayerSnapshotSafely } from '@/lib/repertuvar/annotations';

/** Shared browser-memory queue used by the workspace and auth tenant boundaries. */
export const annotationSaveQueue = new AnnotationSaveQueue(saveLayerSnapshotSafely);

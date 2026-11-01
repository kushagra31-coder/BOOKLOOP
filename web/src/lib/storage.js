import { supabase } from './supabase';

export const BUCKET_NAME = 'listing-images';
export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Validates file type and size.
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type (${file.type || 'unknown'}). Allowed: JPEG, PNG, WebP.`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max allowed size is 2MB.`,
    };
  }

  return { valid: true };
}

/**
 * Returns public CDN URL for a photo path in 'listing-images'.
 */
export function getListingPhotoUrl(path) {
  if (!path) return '';
  // If already a full URL
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data?.publicUrl || '';
}

/**
 * Generates an unguessable filename: {uid}/{crypto.randomUUID()}.{ext}
 */
export function generatePhotoPath(userId, file) {
  const ext = file.name?.split('.').pop()?.toLowerCase() || (file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg');
  const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
  const fileId = crypto.randomUUID();
  return `${userId}/${fileId}.${safeExt}`;
}

/**
 * Uploads a file to Supabase Storage with progress simulation / callback.
 */
export async function uploadListingPhoto(file, userId, onProgress) {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const filePath = generatePhotoPath(userId, file);

  if (onProgress) onProgress(30);

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) {
    throw error;
  }

  if (onProgress) onProgress(100);
  return data.path;
}

/**
 * Deletes photos from storage (used to clean up if listing RPC fails or when removing a photo).
 */
export async function deleteListingPhotos(paths) {
  if (!paths || paths.length === 0) return;
  try {
    const validPaths = paths.filter(Boolean);
    if (validPaths.length > 0) {
      await supabase.storage.from(BUCKET_NAME).remove(validPaths);
    }
  } catch (err) {
    console.error('[Storage] Error deleting photos:', err);
  }
}

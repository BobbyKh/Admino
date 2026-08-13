"use server";

export type AdminActionState = { success?: boolean; message?: string };
export type UploadState = { url?: string; error?: string };
export type MediaUploadState = { url?: string; publicId?: string; width?: number; height?: number; error?: string };

export type BulkItemResult = { id: number; success: boolean; message?: string };
export type BulkActionResult = {
  total: number;
  succeeded: number;
  failed: number;
  results: BulkItemResult[];
};

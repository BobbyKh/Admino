"use server";

export type AdminActionState = { success?: boolean; message?: string };
export type UploadState = { url?: string; error?: string };
export type MediaUploadState = { url?: string; publicId?: string; width?: number; height?: number; error?: string };

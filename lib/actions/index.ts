// Re-export all domain modules for backward compatibility
export type { AdminActionState, UploadState, MediaUploadState } from "./types";
export { updateSettings } from "./settings";
export { addGalleryImage, updateGalleryImage, deleteGalleryImage, toggleFeatured } from "./gallery";
export { addMenuCategory, deleteMenuCategory, addMenuItem, updateMenuItem, deleteMenuItem } from "./menu";
export { uploadMedia, getMediaItems, getMediaFolders, deleteMediaItem, updateMediaAlt, moveMediaToFolder, createMediaFolder, deleteMediaFolder } from "./media";
export { getNavLinks, addNavLink, updateNavLink, deleteNavLink, reorderNavLinks } from "./navigation";
export { getHomeSections, addHomeSection, updateHomeSection, deleteHomeSection, reorderHomeSections } from "./home-sections";
export { createSite, updateSite, deleteSite, getSites } from "./sites";
export { getPages, getPage, createPage, updatePage, deletePage, reorderPages, getPageBlocks, addPageBlock, updatePageBlock, deletePageBlock, reorderPageBlocks } from "./pages";
export { getAdminUsers, getSitesForCurrentUser, createAdminUser, updateAdminUser, deleteAdminUser } from "./users";
export { uploadImage } from "./uploads";

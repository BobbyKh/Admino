"use client";

import * as React from "react";
import {
  Check,
  Copy,
  Folder,
  FolderInput,
  FolderPlus,
  Grid3X3,
  List,
  Loader2,
  Search,
  Trash2,
  UploadCloud,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteMediaItem,
  moveMediaToFolder,
  createMediaFolder,
  getMediaItems,
  getMediaFolders,
} from "@/lib/actions/index";
import type { Media } from "@/lib/db/schema";
import { useAdminSiteId } from "./admin-site-context";

interface MediaLibraryProps {
  onSelect?: (media: Media) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter?: "image" | "video";
  title?: string;
}

export function MediaLibrary({
  onSelect,
  open,
  onOpenChange,
  filter,
  title = "Media Library",
}: MediaLibraryProps) {
  const siteId = useAdminSiteId();
  const [items, setItems] = React.useState<Media[]>([]);
  const [folders, setFolders] = React.useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [selected, setSelected] = React.useState<Media | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [showNewFolder, setShowNewFolder] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [showMoveDialog, setShowMoveDialog] = React.useState(false);
  const [moveTargetFolder, setMoveTargetFolder] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadMedia = React.useCallback(async () => {
    setLoading(true);
    try {
      const [mediaResult, folderList] = await Promise.all([
        getMediaItems({
          folder: selectedFolder,
          search,
          type: filter,
        }),
        getMediaFolders(),
      ]);
      setItems(mediaResult.items);
      setFolders(folderList);
    } catch {
      toast.error("Failed to load media");
    } finally {
      setLoading(false);
    }
  }, [selectedFolder, search, filter]);

  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadMedia();
    }
  }, [open, loadMedia]);

  async function handleFiles(files: FileList | File[]) {
    setUploading(true);
    const fileArray = Array.from(files);
    let successCount = 0;

    for (const file of fileArray) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("siteId", String(siteId));
      if (selectedFolder !== "all") formData.append("folder", selectedFolder);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const result = await res.json();
        if (res.ok && result.url) {
          successCount++;
        } else {
          toast.error(result?.error ?? `Failed to upload ${file.name}`);
        }
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    if (successCount > 0) {
      toast.success(`${successCount} file${successCount > 1 ? "s" : ""} uploaded`);
      loadMedia();
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  async function handleDelete(id: number) {
    try {
      await deleteMediaItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (selected?.id === id) setSelected(null);
      toast.success("Media deleted");
    } catch {
      toast.error("Failed to delete media");
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    const result = await createMediaFolder(newFolderName);
    if (result?.success) {
      toast.success(`Folder "${result.folder}" created`);
      setFolders((prev) => [...prev, result.folder!]);
      setNewFolderName("");
      setShowNewFolder(false);
    } else if (result?.error) {
      toast.error(result.error);
    }
  }

  async function handleMoveToFolder() {
    if (!selected || !moveTargetFolder) return;
    try {
      await moveMediaToFolder(selected.id, moveTargetFolder);
      setItems((prev) =>
        prev.map((item) =>
          item.id === selected.id ? { ...item, folder: moveTargetFolder } : item
        )
      );
      setSelected({ ...selected, folder: moveTargetFolder });
      setShowMoveDialog(false);
      toast.success(`Moved to ${moveTargetFolder}`);
    } catch {
      toast.error("Failed to move media");
    }
  }

  function handleCopyUrl(url: string) {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl gap-0 p-0 sm:max-w-5xl">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Upload, manage, and select media files. Drag and drop or click to upload.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-[500px]">
            {/* Sidebar - Folders (desktop) */}
            <div className="hidden w-56 shrink-0 border-r bg-muted/30 p-3 sm:block">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Folders
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => setShowNewFolder(true)}
                >
                  <FolderPlus className="size-3.5" />
                </Button>
              </div>

              <div className="space-y-0.5">
                <button
                  onClick={() => setSelectedFolder("all")}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                    selectedFolder === "all"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Folder className="size-3.5" />
                  All Media
                </button>
                {folders.map((folder) => (
                  <button
                    key={folder}
                    onClick={() => setSelectedFolder(folder)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                      selectedFolder === folder
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Folder className="size-3.5" />
                    <span className="truncate">{folder}</span>
                  </button>
                ))}
              </div>

              {showNewFolder && (
                <div className="mt-3 flex gap-1">
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder name"
                    className="h-8 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateFolder();
                      if (e.key === "Escape") setShowNewFolder(false);
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    className="h-8 px-2"
                    onClick={handleCreateFolder}
                  >
                    <Check className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Main content */}
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Toolbar */}
              <div className="flex items-center gap-2 border-b px-4 py-2">
                {/* Mobile folder dropdown */}
                <div className="flex items-center gap-1 sm:hidden">
                  <select
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="h-8 rounded-md border bg-background px-2 text-xs"
                  >
                    <option value="all">All Media</option>
                    {folders.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => setShowNewFolder(true)}
                  >
                    <FolderPlus className="size-3.5" />
                  </Button>
                </div>
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search media..."
                    className="h-8 pl-8 text-sm"
                  />
                </div>

                <div className="hidden items-center gap-1 sm:flex">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    className="size-8"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3X3 className="size-3.5" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    className="size-8"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="size-3.5" />
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFiles(e.target.files);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                />
              </div>

              {/* Upload zone / Grid */}
              <div
                className="relative flex-1 overflow-auto p-4"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {dragOver && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center border-2 border-dashed border-primary bg-primary/5">
                    <div className="text-center">
                      <UploadCloud className="mx-auto size-10 text-primary" />
                      <p className="mt-2 text-sm font-medium text-primary">
                        Drop files here to upload
                      </p>
                    </div>
                  </div>
                )}

                {uploading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
                    <div className="flex items-center gap-2">
                      <Loader2 className="size-5 animate-spin" />
                      <span className="text-sm">Uploading...</span>
                    </div>
                  </div>
                )}

                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <UploadCloud className="size-12 text-muted-foreground/50" />
                    <p className="mt-3 text-sm font-medium text-muted-foreground">
                      No media files yet
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Drag and drop files here or click the button below
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadCloud className="size-3.5" />
                      Upload files
                    </Button>
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelected(item)}
                        className={`group relative aspect-square overflow-hidden rounded-md border-2 bg-muted transition-all hover:ring-2 hover:ring-primary ${
                          selected?.id === item.id
                            ? "border-primary ring-2 ring-primary"
                            : "border-transparent"
                        }`}
                      >
                        {item.mimeType.startsWith("image/") ? (
                          <img
                            src={item.url}
                            alt={item.alt || item.originalName}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            <Video className="size-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <p className="truncate text-[10px] text-white">
                            {item.originalName}
                          </p>
                        </div>
                        {selected?.id === item.id && (
                          <div className="absolute right-1 top-1">
                            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <Check className="size-3" />
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelected(item)}
                        className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted ${
                          selected?.id === item.id
                            ? "border-primary bg-primary/5"
                            : "border-transparent"
                        }`}
                      >
                        {item.mimeType.startsWith("image/") ? (
                          <img
                            src={item.url}
                            alt={item.alt || item.originalName}
                            className="size-10 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <div className="flex size-10 shrink-0 items-center justify-center rounded bg-muted">
                            <Video className="size-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {item.originalName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(item.size)}
                            {item.width && item.height
                              ? ` · ${item.width}×${item.height}`
                              : ""}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {item.mimeType.startsWith("image/") ? "Image" : "Video"}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer / Actions */}
              <div className="flex items-center justify-between border-t px-4 py-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="size-3.5" />
                  Upload files
                </Button>

                <div className="flex items-center gap-2">
                  {selected && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleCopyUrl(selected.url)}
                      >
                        <Copy className="size-3.5" />
                        Copy URL
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setShowMoveDialog(true)}
                      >
                        <FolderInput className="size-3.5" />
                        Move
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(selected.id)}
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                      {onSelect && (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            onSelect(selected);
                            onOpenChange(false);
                          }}
                        >
                          <Check className="size-3.5" />
                          Select
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Move to folder dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Move to folder</DialogTitle>
            <DialogDescription>
              Select a folder for &ldquo;{selected?.originalName}&rdquo;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {folders.map((folder) => (
              <button
                key={folder}
                onClick={() => setMoveTargetFolder(folder)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  moveTargetFolder === folder
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <Folder className="size-4" />
                {folder}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMoveToFolder} disabled={!moveTargetFolder}>
              Move here
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

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
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  deleteMediaFolder,
  getMediaItems,
  getMediaFolders,
  updateMediaAlt,
} from "@/lib/actions/index";
import type { Media } from "@/lib/db/schema";

export default function MediaPage() {
  const [items, setItems] = React.useState<Media[]>([]);
  const [folders, setFolders] = React.useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [selected, setSelected] = React.useState<Media | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [showNewFolder, setShowNewFolder] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [showMoveDialog, setShowMoveDialog] = React.useState(false);
  const [moveTargetFolder, setMoveTargetFolder] = React.useState("");
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [editAlt, setEditAlt] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadMedia = React.useCallback(async () => {
    setLoading(true);
    try {
      const [mediaResult, folderList] = await Promise.all([
        getMediaItems({ folder: selectedFolder, search }),
        getMediaFolders(),
      ]);
      setItems(mediaResult.items);
      setFolders(folderList);
    } catch {
      toast.error("Failed to load media");
    } finally {
      setLoading(false);
    }
  }, [selectedFolder, search]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMedia();
  }, [loadMedia]);

  async function handleFiles(files: FileList | File[]) {
    setUploading(true);
    const fileArray = Array.from(files);
    let successCount = 0;

    for (const file of fileArray) {
      const formData = new FormData();
      formData.append("file", file);
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

  async function handleDelete() {
    if (!selected) return;
    try {
      await deleteMediaItem(selected.id);
      setItems((prev) => prev.filter((item) => item.id !== selected.id));
      setSelected(null);
      setShowDeleteDialog(false);
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

  async function handleDeleteFolder(folder: string) {
    if (!confirm(`Delete folder "${folder}" and all its files?`)) return;
    try {
      await deleteMediaFolder(folder);
      setFolders((prev) => prev.filter((f) => f !== folder));
      if (selectedFolder === folder) setSelectedFolder("all");
      toast.success(`Folder "${folder}" deleted`);
    } catch {
      toast.error("Failed to delete folder");
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

  async function handleSaveAlt() {
    if (!selected) return;
    try {
      await updateMediaAlt(selected.id, editAlt);
      setItems((prev) =>
        prev.map((item) =>
          item.id === selected.id ? { ...item, alt: editAlt } : item
        )
      );
      setSelected({ ...selected, alt: editAlt });
      toast.success("Alt text updated");
    } catch {
      toast.error("Failed to update alt text");
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Media Library</h1>
        <p className="text-sm text-muted-foreground">
          Upload and manage images, videos, and other media files.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar - Folders (desktop) */}
        <div className="hidden w-52 shrink-0 md:block">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Folders</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => setShowNewFolder(true)}
                >
                  <FolderPlus className="size-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-0.5 p-2">
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
                <span className="ml-auto text-[10px] opacity-70">
                  {items.length}
                </span>
              </button>
              {folders.map((folder) => (
                <button
                  key={folder}
                  onClick={() => setSelectedFolder(folder)}
                  className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                    selectedFolder === folder
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Folder className="size-3.5" />
                  <span className="truncate flex-1 text-left">{folder}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); handleDeleteFolder(folder); } }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </span>
                </button>
              ))}

              {showNewFolder && (
                <div className="flex gap-1 px-1 pt-1">
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder name"
                    className="h-7 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateFolder();
                      if (e.key === "Escape") setShowNewFolder(false);
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    className="h-7 px-2"
                    onClick={handleCreateFolder}
                  >
                    <Check className="size-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Toolbar */}
          <div className="mb-4 flex items-center gap-2">
            {/* Mobile folder dropdown */}
            <div className="flex items-center gap-1 md:hidden">
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              >
                <option value="all">All Media</option>
                {folders.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0"
                onClick={() => setShowNewFolder(true)}
              >
                <FolderPlus className="size-4" />
              </Button>
            </div>

            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search media..."
                className="h-9 pl-8 text-sm"
              />
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="size-9"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="size-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="size-9"
                onClick={() => setViewMode("list")}
              >
                <List className="size-4" />
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

            <Button
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="size-4" />
              Upload
            </Button>
          </div>

          {/* Upload zone / Grid */}
          <div
            className="relative rounded-lg border"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {dragOver && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5">
                <div className="text-center">
                  <UploadCloud className="mx-auto size-10 text-primary" />
                  <p className="mt-2 text-sm font-medium text-primary">
                    Drop files here to upload
                  </p>
                </div>
              </div>
            )}

            {uploading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80">
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
                  Drag and drop files here or click Upload
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
              <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelected(item);
                      setEditAlt(item.alt || "");
                    }}
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
              <div className="divide-y">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelected(item);
                      setEditAlt(item.alt || "");
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted ${
                      selected?.id === item.id ? "bg-primary/5" : ""
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
                        {item.folder ? ` · ${item.folder}` : ""}
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
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="hidden w-72 shrink-0 lg:block">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Details</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => setSelected(null)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selected.mimeType.startsWith("image/") ? (
                  <div className="relative aspect-square overflow-hidden rounded-md border bg-muted">
                    <img
                      src={selected.url}
                      alt={selected.alt || selected.originalName}
                      className="size-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-md border bg-muted">
                    <Video className="size-10 text-muted-foreground" />
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      File name
                    </p>
                    <p className="truncate text-sm">{selected.originalName}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Type
                    </p>
                    <p className="text-sm">{selected.mimeType}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Size
                    </p>
                    <p className="text-sm">{formatFileSize(selected.size)}</p>
                  </div>

                  {selected.width && selected.height && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Dimensions
                      </p>
                      <p className="text-sm">
                        {selected.width} × {selected.height}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Folder
                    </p>
                    <p className="text-sm">{selected.folder}</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Alt text</Label>
                    <div className="flex gap-1">
                      <Input
                        value={editAlt}
                        onChange={(e) => setEditAlt(e.target.value)}
                        placeholder="Describe this media"
                        className="h-8 text-xs"
                      />
                      <Button
                        size="sm"
                        className="h-8 px-2"
                        onClick={handleSaveAlt}
                      >
                        Save
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => handleCopyUrl(selected.url)}
                    >
                      <Copy className="size-3" />
                      Copy URL
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => setShowMoveDialog(true)}
                    >
                      <FolderInput className="size-3" />
                      Move
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs text-destructive hover:text-destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="size-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Move to folder dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Move to folder</DialogTitle>
            <DialogDescription>
              Select a folder for &ldquo;{selected?.originalName}&rdquo;
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 space-y-1 overflow-auto py-2">
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

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete media</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{selected?.originalName}
              &rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

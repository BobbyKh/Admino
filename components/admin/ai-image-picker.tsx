"use client";

import { useState, useActionState } from "react";
import { Loader2, Wand2, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription as ModalDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { generateImageForUpload } from "@/lib/actions/image-ai";

interface AiImagePickerProps {
  siteId: number;
  onSelect: (url: string) => void;
  trigger?: React.ReactNode;
}

export function AiImagePicker({ siteId, onSelect, trigger }: AiImagePickerProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(generateImageForUpload, null);
  const [prompt, setPrompt] = useState("");

  function handleSelect() {
    if (state && "url" in state && state.url) {
      onSelect(state.url);
      setOpen(false);
      setPrompt("");
    }
  }

  const suggestions = [
    "A cozy restaurant interior with warm lighting",
    "Modern minimalist office workspace",
    "Mountain landscape at golden hour",
    "Abstract geometric pattern in blue and gold",
    "Fresh gourmet food plating on dark background",
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="sm" className="gap-1.5">
            <Wand2 className="size-3.5" />
            AI Generate
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="size-4 text-primary" />
            AI Image Generator
          </DialogTitle>
          <ModalDescription>
            Describe the image you want. AI will generate it using DALL-E.
          </ModalDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="siteId" value={siteId} />
          <div className="space-y-1.5">
            <Label htmlFor="ai-image-prompt">Prompt *</Label>
            <Textarea
              id="ai-image-prompt"
              name="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="A cozy cafe interior with warm lighting and wooden furniture..."
              required
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <Button
                key={s}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPrompt(s)}
                className="text-xs"
              >
                {s}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Size</Label>
              <select
                name="size"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="1024x1024">1024×1024 (Square)</option>
                <option value="1792x1024">1792×1024 (Landscape)</option>
                <option value="1024x1792">1024×1792 (Portrait)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Quality</Label>
              <select
                name="quality"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="standard">Standard</option>
                <option value="hd">HD (Higher quality)</option>
              </select>
            </div>
          </div>

          {state && "success" in state && !state.success && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}

          {state && "success" in state && state.success && "url" in state && (
            <div className="space-y-2">
              {state.revisedPrompt && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Revised prompt:</span> {state.revisedPrompt}
                </p>
              )}
              <img
                src={state.url}
                alt="AI generated"
                className="w-full rounded-lg border object-cover"
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {state && "success" in state && state.success ? (
              <Button type="button" onClick={handleSelect} className="gap-2">
                <Check className="size-4" />
                Use This Image
              </Button>
            ) : (
              <Button type="submit" disabled={pending || prompt.trim().length < 3} className="gap-2">
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                Generate
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

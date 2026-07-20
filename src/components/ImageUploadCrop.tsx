import { useCallback, useId, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

type Props = {
  label: string;
  value: string;
  /** `path` is the storage object path (null when cleared) so the parent can clean up orphans. */
  onChange: (url: string, path: string | null) => void;
  userId: string;
  aspect?: number;
  shape?: "round" | "rect";
  folder: string;
};

/** Derive the storage object path from a public URL, e.g. `.../profile-media/<uid>/logo-1.jpg`. */
export function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const parts = url.split("/profile-media/");
  return parts.length > 1 ? decodeURIComponent(parts[1]) : null;
}

/**
 * Decode a file to an oriented data URL.
 * EXIF fix (IMPROVEMENTS §3.13): `createImageBitmap(file, { imageOrientation: "from-image" })`
 * bakes the EXIF rotation into pixels so portrait photos from older Android WebView/Chromium
 * upload upright. Falls back to the plain FileReader path where createImageBitmap is missing.
 */
async function fileToOrientedDataUrl(file: File): Promise<string> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close?.();
        return canvas.toDataURL("image/jpeg", 0.92);
      }
    } catch {
      /* fall through to FileReader */
    }
  }
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function getCroppedBlob(src: string, crop: Area): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
  });
  const canvas = document.createElement("canvas");
  const size = Math.min(crop.width, 800);
  canvas.width = size;
  canvas.height = size * (crop.height / crop.width);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  return await new Promise((r) => canvas.toBlob((b) => r(b!), "image/jpeg", 0.9));
}

const ImageUploadCrop = ({ label, value, onChange, userId, aspect = 1, shape = "rect", folder }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const zoomId = useId();
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removed, setRemoved] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Max 5MB");
      return;
    }
    try {
      setSrc(await fileToOrientedDataUrl(f));
    } catch {
      toast.error("Couldn't read that image");
    } finally {
      // allow re-selecting the same file
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onCropComplete = useCallback((_: Area, px: Area) => setArea(px), []);

  const save = async () => {
    if (!src || !area) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(src, area);
      const path = `${userId}/${folder}-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("profile-media")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("profile-media").getPublicUrl(path);
      onChange(data.publicUrl, path);
      setRemoved(false);
      setSrc(null);
      toast.success("Uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const remove = () => {
    onChange("", storagePathFromUrl(value));
    setRemoved(true);
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        {value ? (
          <img
            src={value}
            alt={label}
            className={`h-20 w-20 border border-border object-cover ${shape === "round" ? "rounded-full" : "rounded-lg"}`}
          />
        ) : (
          <div
            className={`flex h-20 w-20 items-center justify-center border border-dashed border-border bg-secondary text-muted-foreground ${shape === "round" ? "rounded-full" : "rounded-lg"}`}
          >
            <Upload className="h-5 w-5" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            onClick={() => inputRef.current?.click()}
          >
            {value ? "Replace" : "Upload"} {label}
          </Button>
          {value && (
            <button
              type="button"
              onClick={remove}
              className="inline-flex min-h-[44px] items-center gap-1 text-xs text-muted-foreground hover:text-destructive-strong"
            >
              <X className="h-3.5 w-3.5" /> Remove
            </button>
          )}
          {removed && !value && (
            <p className="text-xs text-muted-foreground">Removed — takes effect when you save</p>
          )}
        </div>
      </div>

      <Dialog open={!!src} onOpenChange={(o) => !o && setSrc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crop {label}</DialogTitle>
          </DialogHeader>
          <div className="relative h-72 w-full overflow-hidden rounded-lg bg-black">
            {src && (
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                cropShape={shape}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="px-1">
            <label htmlFor={zoomId} className="text-xs text-muted-foreground">
              Zoom
            </label>
            <Slider
              id={zoomId}
              aria-label="Zoom"
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(v) => setZoom(v[0])}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setSrc(null)}>
              Cancel
            </Button>
            <Button type="button" variant="default" className="min-h-[44px]" onClick={save} disabled={uploading}>
              {uploading ? "Uploading..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageUploadCrop;

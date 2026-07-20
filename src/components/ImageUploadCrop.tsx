import { useCallback, useRef, useState } from "react";
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
  onChange: (url: string) => void;
  userId: string;
  aspect?: number;
  shape?: "round" | "rect";
  folder: string;
};

async function getCroppedBlob(src: string, crop: Area): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
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
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
    const r = new FileReader();
    r.onload = () => setSrc(r.result as string);
    r.readAsDataURL(f);
  };

  const onCropComplete = useCallback((_: Area, px: Area) => setArea(px), []);

  const save = async () => {
    if (!src || !area) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(src, area);
      const path = `${userId}/${folder}-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("profile-media").upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("profile-media").getPublicUrl(path);
      onChange(data.publicUrl);
      setSrc(null);
      toast.success("Uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        {value ? (
          <img src={value} alt={label} className={`h-20 w-20 object-cover border border-border ${shape === "round" ? "rounded-full" : "rounded-lg"}`} />
        ) : (
          <div className={`h-20 w-20 bg-secondary border border-dashed border-border flex items-center justify-center text-muted-foreground ${shape === "round" ? "rounded-full" : "rounded-lg"}`}>
            <Upload className="h-5 w-5" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            {value ? "Replace" : "Upload"} {label}
          </Button>
          {value && (
            <button type="button" onClick={() => onChange("")} className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1">
              <X className="h-3 w-3" /> Remove
            </button>
          )}
        </div>
      </div>

      <Dialog open={!!src} onOpenChange={(o) => !o && setSrc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Crop {label}</DialogTitle></DialogHeader>
          <div className="relative w-full h-72 bg-black rounded-lg overflow-hidden">
            {src && (
              <Cropper image={src} crop={crop} zoom={zoom} aspect={aspect} cropShape={shape} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
            )}
          </div>
          <div className="px-1">
            <label className="text-xs text-muted-foreground">Zoom</label>
            <Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={(v) => setZoom(v[0])} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSrc(null)}>Cancel</Button>
            <Button type="button" variant="default" onClick={save} disabled={uploading}>{uploading ? "Uploading..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageUploadCrop;

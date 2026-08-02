import { useRef, useState } from "react";
import { supabase } from "@shared/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { toast } from "sonner";
import { UploadCloud, X, FileText, Loader2 } from "lucide-react";

export type UploadedFile = { url: string; name: string; sizeKb: number };

type Props = {
  /** Storage bucket: "content-media" for images, "resource-files" for PDFs/assets. */
  bucket: "content-media" | "resource-files";
  /** "image" renders a preview thumbnail; "file" renders a filename chip. */
  kind?: "image" | "file";
  accept?: string;
  maxMb?: number;
  value?: string | null;
  onChange: (file: UploadedFile | null) => void;
  label?: string;
};

/**
 * Staff-only uploader for admin content. Writes to a public bucket (RLS allows
 * INSERT only for staff) and returns the public URL. Files are namespaced by a
 * random id to avoid collisions.
 */
const FileUpload = ({
  bucket,
  kind = "file",
  accept,
  maxMb = kind === "image" ? 5 : 25,
  value,
  onChange,
  label,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = () => inputRef.current?.click();

  const handleFile = async (file: File) => {
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`File too large. Max ${maxMb} MB.`);
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(0, 60);
      const path = `${kind}/${crypto.randomUUID()}-${safe || `file.${ext}`}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange({ url: data.publicUrl, name: file.name, sizeKb: Math.round(file.size / 1024) });
      toast.success("Uploaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-ink-strong">{label}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept ?? (kind === "image" ? "image/*" : ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />

      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
          {kind === "image" ? (
            <img src={value} alt="" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-muted text-navy">
              <FileText className="h-5 w-5" />
            </div>
          )}
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 truncate text-sm text-navy underline-offset-4 hover:underline"
          >
            {value.split("/").pop()}
          </a>
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(null)} aria-label="Remove file">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={pick} disabled={busy} className="w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {busy ? "Uploading…" : kind === "image" ? "Upload image" : "Upload file"}
        </Button>
      )}
    </div>
  );
};

export default FileUpload;

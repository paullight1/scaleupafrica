import { ArrowDown, ArrowUp, Copy, GripVertical, Image, Link2, Minus, Newspaper, Plus, Trash2, Type } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import type { CampaignBlock } from "@/lib/newsletter/types";

const uid = () => crypto.randomUUID();
function make(type: CampaignBlock["type"]): CampaignBlock {
  if (type === "heading") return { id: uid(), type, text: "", level: 2 };
  if (type === "paragraph") return { id: uid(), type, text: "" };
  if (type === "image") return { id: uid(), type, url: "", alt: "" };
  if (type === "button") return { id: uid(), type, label: "", url: "" };
  if (type === "divider") return { id: uid(), type };
  if (type === "funding" || type === "resource") return { id: uid(), type, title: "", summary: "", url: "" };
  return { id: uid(), type: "social", links: [{ label: "LinkedIn", url: "" }] };
}

const choices = [
  { type: "heading", label: "Heading", icon: Type }, { type: "paragraph", label: "Paragraph", icon: Newspaper },
  { type: "image", label: "Image", icon: Image }, { type: "button", label: "Button", icon: Link2 },
  { type: "divider", label: "Divider", icon: Minus }, { type: "funding", label: "Funding card", icon: Plus },
  { type: "resource", label: "Resource card", icon: Plus }, { type: "social", label: "Social links", icon: Link2 },
] as const;

export default function BlockEditor({ blocks, onChange }: { blocks: CampaignBlock[]; onChange: (blocks: CampaignBlock[]) => void }) {
  const replace = (index: number, block: CampaignBlock) => onChange(blocks.map((item, position) => position === index ? block : item));
  const move = (index: number, offset: number) => { const next = [...blocks]; const target = index + offset; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; onChange(next); };
  return <div className="space-y-4">
    {blocks.map((block, index) => <div key={block.id} className="rounded-xl border border-border bg-card p-4 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><GripVertical className="h-4 w-4 text-muted-foreground" /><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{block.type} {index + 1}</span></div><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" aria-label={`Move ${block.type} up`} onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" aria-label={`Move ${block.type} down`} onClick={() => move(index, 1)} disabled={index === blocks.length - 1}><ArrowDown className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" aria-label={`Duplicate ${block.type}`} onClick={() => onChange([...blocks.slice(0, index + 1), { ...block, id: uid() }, ...blocks.slice(index + 1)])}><Copy className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" aria-label={`Remove ${block.type}`} onClick={() => onChange(blocks.filter((_, position) => position !== index))}><Trash2 className="h-4 w-4" /></Button></div></div><BlockFields block={block} index={index} onChange={(next) => replace(index, next)} /></div>)}
    {!blocks.length && <div className="rounded-xl border border-dashed border-border bg-secondary/30 px-6 py-10 text-center text-sm text-muted-foreground">Start with a heading, paragraph, card or visual.</div>}
    <div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add a content block</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{choices.map(({ type, label, icon: Icon }) => <Button key={type} type="button" variant="outline" className="justify-start" aria-label={`Add ${label.toLowerCase()}`} onClick={() => onChange([...blocks, make(type)])}><Icon className="h-4 w-4" />{label}</Button>)}</div></div>
  </div>;
}

function BlockFields({ block, index, onChange }: { block: CampaignBlock; index: number; onChange: (block: CampaignBlock) => void }) {
  if (block.type === "divider") return <p className="text-sm text-muted-foreground">A subtle rule separates sections.</p>;
  if (block.type === "heading") return <div className="grid gap-3 sm:grid-cols-[1fr_120px]"><div><Label htmlFor={`${block.id}-text`}>Heading {index + 1}</Label><Input id={`${block.id}-text`} value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} /></div><div><Label htmlFor={`${block.id}-level`}>Size</Label><select id={`${block.id}-level`} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={block.level} onChange={(e) => onChange({ ...block, level: e.target.value === "1" ? 1 : 2 })}><option value="1">Feature</option><option value="2">Section</option></select></div></div>;
  if (block.type === "paragraph") return <div><Label htmlFor={`${block.id}-text`}>Paragraph {index + 1}</Label><Textarea id={`${block.id}-text`} value={block.text} rows={5} onChange={(e) => onChange({ ...block, text: e.target.value })} /></div>;
  if (block.type === "image") return <div className="grid gap-3"><div><Label htmlFor={`${block.id}-url`}>HTTPS image URL</Label><Input id={`${block.id}-url`} type="url" value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} /></div><div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor={`${block.id}-alt`}>Alternative text</Label><Input id={`${block.id}-alt`} value={block.alt} onChange={(e) => onChange({ ...block, alt: e.target.value })} /></div><div><Label htmlFor={`${block.id}-href`}>Optional destination</Label><Input id={`${block.id}-href`} type="url" value={block.href ?? ""} onChange={(e) => onChange({ ...block, href: e.target.value })} /></div></div></div>;
  if (block.type === "button") return <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor={`${block.id}-label`}>Button label</Label><Input id={`${block.id}-label`} value={block.label} onChange={(e) => onChange({ ...block, label: e.target.value })} /></div><div><Label htmlFor={`${block.id}-url`}>Destination URL</Label><Input id={`${block.id}-url`} type="url" value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} /></div></div>;
  if (block.type === "social") return <div className="grid gap-3">{block.links.map((link, linkIndex) => <div key={linkIndex} className="grid gap-2 sm:grid-cols-2"><Input aria-label={`Social label ${linkIndex + 1}`} value={link.label} onChange={(e) => onChange({ ...block, links: block.links.map((item, position) => position === linkIndex ? { ...item, label: e.target.value } : item) })} /><Input aria-label={`Social URL ${linkIndex + 1}`} type="url" value={link.url} onChange={(e) => onChange({ ...block, links: block.links.map((item, position) => position === linkIndex ? { ...item, url: e.target.value } : item) })} /></div>)}<Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...block, links: [...block.links, { label: "", url: "" }] })}><Plus className="h-4 w-4" />Add social link</Button></div>;
  return <div className="grid gap-3"><div><Label htmlFor={`${block.id}-title`}>Card title</Label><Input id={`${block.id}-title`} value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} /></div><div><Label htmlFor={`${block.id}-summary`}>Summary</Label><Textarea id={`${block.id}-summary`} value={block.summary} onChange={(e) => onChange({ ...block, summary: e.target.value })} /></div><div><Label htmlFor={`${block.id}-url`}>Destination URL</Label><Input id={`${block.id}-url`} type="url" value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} /></div></div>;
}

import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { Button } from "@shared/components/ui/button";

export default function CampaignPreview({ html }: { html: string }) {
  const [mobile, setMobile] = useState(false);
  return <div className="rounded-xl border border-border bg-secondary/60 p-3"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live preview</p><div className="flex gap-1"><Button type="button" variant={!mobile ? "secondary" : "ghost"} size="icon" aria-label="Desktop preview" onClick={() => setMobile(false)}><Monitor className="h-4 w-4" /></Button><Button type="button" variant={mobile ? "secondary" : "ghost"} size="icon" aria-label="Mobile preview" onClick={() => setMobile(true)}><Smartphone className="h-4 w-4" /></Button></div></div><div className="overflow-auto rounded-lg bg-[#ece8df] p-3"><iframe title="Campaign preview" sandbox="" srcDoc={html} className={`mx-auto h-[620px] border-0 bg-white transition-all ${mobile ? "w-[390px] max-w-full" : "w-full"}`} /></div></div>;
}

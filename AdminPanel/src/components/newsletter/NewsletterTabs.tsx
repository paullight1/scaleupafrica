import { BarChart3, ContactRound, MailOpen, SlidersHorizontal } from "lucide-react";
import { TabsList, TabsTrigger } from "@shared/components/ui/tabs";

export type NewsletterView = "overview" | "campaigns" | "subscribers" | "settings";

const items = [
  { value: "overview", label: "Overview", icon: BarChart3 },
  { value: "campaigns", label: "Campaigns", icon: MailOpen },
  { value: "subscribers", label: "Subscribers", icon: ContactRound },
  { value: "settings", label: "Settings", icon: SlidersHorizontal },
] as const;

export default function NewsletterTabs() {
  return <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1.5 shadow-soft">
    {items.map(({ value, label, icon: Icon }) => <TabsTrigger key={value} value={value} className="gap-2 rounded-lg px-4 py-2.5 data-[state=active]:bg-navy data-[state=active]:text-white"><Icon className="h-4 w-4" />{label}</TabsTrigger>)}
  </TabsList>;
}

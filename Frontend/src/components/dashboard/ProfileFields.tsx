import { createContext, useContext } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Switch } from "@shared/components/ui/switch";
import ImageUploadCrop from "@/components/ImageUploadCrop";
import { KeywordInput } from "@/components/directory/KeywordInput";
import { AFRICAN_COUNTRIES, SECTORS } from "@/lib/directory/options";
import {
  APPLICATION_READINESS_OPTIONS,
  BUSINESS_STAGE_OPTIONS,
  FUNDING_TYPE_OPTIONS,
  type ProfileFormValues,
} from "@/lib/validation/profile";
import type { ProfileSection } from "@/lib/dashboard/routes";

type ImageField = "logo_url" | "founder_photo_url";
type ImageSetter = (field: ImageField) => (url: string) => void;
const ImageSetterContext = createContext<ImageSetter | null>(null);

export const SECTION_FIELDS: Record<ProfileSection, (keyof ProfileFormValues)[]> = {
  identity: ["business_name", "founder_name", "country", "sector", "logo_url", "founder_photo_url"],
  story: ["short_description", "long_description"],
  matching: [
    "keywords",
    "business_stage",
    "funding_target_usd",
    "preferred_funding_types",
    "application_readiness",
  ],
  contact: [
    "website", "email", "phone", "whatsapp", "show_email", "show_phone", "show_whatsapp",
    "instagram", "linkedin", "twitter",
  ],
};

function Field({ label, error, name, hint, children }: { label: string; error?: string; name: string; hint?: string; children: React.ReactNode }) {
  return <div><Label className="mb-1.5 block">{label}</Label>{children}{hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}{error && <p id={`err-${name}`} className="mt-1 text-sm text-destructive-strong">{error}</p>}</div>;
}

function ContactField({ label, error, name, switchName, children }: { label: string; error?: string; name: string; switchName: "show_email" | "show_phone" | "show_whatsapp"; children: React.ReactNode }) {
  const { control } = useFormContext<ProfileFormValues>(); const switchId = `${switchName}-toggle`;
  return <div><Label className="mb-1.5 block">{label}</Label>{children}{error && <p id={`err-${name}`} className="mt-1 text-sm text-destructive-strong">{error}</p>}<div className="mt-2 flex items-center gap-2"><Controller control={control} name={switchName} render={({ field }) => <Switch id={switchId} checked={!!field.value} onCheckedChange={field.onChange} />} /><Label htmlFor={switchId} className="text-xs font-normal text-muted-foreground">Visible on your public page</Label></div></div>;
}

function IdentityFields({ userId }: { userId: string }) {
  const { register, watch, formState: { errors } } = useFormContext<ProfileFormValues>(); const setImage = useImageSetter();
  return <div className="space-y-5"><div className="grid gap-5 md:grid-cols-2">
    <Field label="Business name *" error={errors.business_name?.message} name="business_name"><Input {...register("business_name")} maxLength={120} aria-invalid={!!errors.business_name} aria-describedby={errors.business_name ? "err-business_name" : undefined} /></Field>
    <Field label="Founder name" error={errors.founder_name?.message} name="founder_name"><Input {...register("founder_name")} maxLength={120} /></Field>
    <Field label="Country *" error={errors.country?.message} name="country"><select {...register("country")} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm" aria-invalid={!!errors.country}><option value="">Select a country</option>{AFRICAN_COUNTRIES.map((c)=><option key={c} value={c}>{c}</option>)}</select></Field>
    <Field label="Sector / industry *" error={errors.sector?.message} name="sector"><select {...register("sector")} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm" aria-invalid={!!errors.sector}><option value="">Select a sector</option>{SECTORS.map((s)=><option key={s} value={s}>{s}</option>)}</select></Field>
  </div><div className="grid gap-6 md:grid-cols-2"><ImageUploadCrop label="Logo" value={watch("logo_url") ?? ""} onChange={setImage("logo_url")} userId={userId} aspect={1} shape="rect" folder="logo" /><ImageUploadCrop label="Founder photo" value={watch("founder_photo_url") ?? ""} onChange={setImage("founder_photo_url")} userId={userId} aspect={1} shape="round" folder="founder" /></div></div>;
}

function StoryFields() {
  const { register, watch, formState: { errors } } = useFormContext<ProfileFormValues>(); const long = watch("long_description") ?? "";
  return <div className="space-y-5"><Field label="One-liner" error={errors.short_description?.message} name="short_description" hint="The single sentence that appears under your name in the directory."><Input {...register("short_description")} maxLength={180} /></Field><Field label="About the business" error={errors.long_description?.message} name="long_description" hint={`${long.length} / 2000`}><Textarea {...register("long_description")} maxLength={2000} rows={7} /></Field></div>;
}

function MatchingFields() {
  const { control, register, formState: { errors } } = useFormContext<ProfileFormValues>();
  return <div className="space-y-6">
    <div><Label htmlFor="keywords" className="mb-1.5 block">Keywords</Label><p className="mb-2 text-sm text-muted-foreground">Use the words a funder would use — “solar”, “irrigation”, “women-led”.</p><Controller control={control} name="keywords" render={({ field }) => <KeywordInput value={field.value ?? []} onChange={field.onChange} />} />{errors.keywords && <p className="mt-1 text-sm text-destructive-strong">{errors.keywords.message as string}</p>}</div>

    <div className="rounded-xl border border-border bg-surface-muted p-4"><h3 className="font-medium text-ink-strong">Funding profile</h3><p className="mt-1 text-sm text-muted-foreground">Optional. These answers improve eligibility and fit scoring; they are not shown on your public profile.</p>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <Field label="Business stage" error={errors.business_stage?.message} name="business_stage"><select {...register("business_stage", { setValueAs: (v) => v || null })} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Select stage</option>{BUSINESS_STAGE_OPTIONS.map((v)=><option key={v} value={v}>{v === "idea" ? "Idea / pre-launch" : v === "early" ? "Early / validating" : v === "growth" ? "Growth" : "Scale"}</option>)}</select></Field>
        <Field label="Funding target (USD)" error={errors.funding_target_usd?.message} name="funding_target_usd" hint="Used only when a program publishes a structured award range."><Input type="number" min="1" step="100" placeholder="100000" {...register("funding_target_usd", { setValueAs: (v) => v === "" ? null : Number(v) })} /></Field>
        <Field label="Application readiness" error={errors.application_readiness?.message} name="application_readiness"><select {...register("application_readiness", { setValueAs: (v) => v || null })} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Select readiness</option>{APPLICATION_READINESS_OPTIONS.map((v)=><option key={v} value={v}>{v === "exploring" ? "Exploring opportunities" : v === "preparing" ? "Preparing documents" : "Ready to apply"}</option>)}</select></Field>
      </div>
      <div className="mt-5"><Label className="mb-2 block">Preferred funding types</Label><Controller control={control} name="preferred_funding_types" render={({ field }) => <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{FUNDING_TYPE_OPTIONS.map((type) => { const checked=(field.value??[]).includes(type); return <label key={type} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"><input type="checkbox" checked={checked} onChange={(e)=>field.onChange(e.target.checked ? [...(field.value??[]), type] : (field.value??[]).filter((v)=>v!==type))} /><span className="capitalize">{type}</span></label>; })}</div>} /></div>
    </div>
  </div>;
}

function ContactFields() {
  const { register, formState: { errors } } = useFormContext<ProfileFormValues>();
  return <div className="space-y-5"><p className="text-sm text-muted-foreground">Visible details appear after a visitor taps “Show contact”. You can turn any of these off at any time.</p><div className="grid gap-5 md:grid-cols-2">
    <ContactField label="Public email" error={errors.email?.message} name="email" switchName="show_email"><Input type="email" {...register("email")} maxLength={255} aria-invalid={!!errors.email} /></ContactField>
    <ContactField label="Phone" error={errors.phone?.message} name="phone" switchName="show_phone"><Input {...register("phone")} maxLength={40} /></ContactField>
    <ContactField label="WhatsApp" error={errors.whatsapp?.message} name="whatsapp" switchName="show_whatsapp"><Input {...register("whatsapp")} maxLength={40} /></ContactField>
    <Field label="Website" error={errors.website?.message} name="website"><Input {...register("website")} maxLength={255} placeholder="https://..." aria-invalid={!!errors.website} /></Field>
  </div><div className="grid gap-5 md:grid-cols-3"><Field label="Instagram" error={errors.instagram?.message} name="instagram"><Input {...register("instagram")} maxLength={120} placeholder="@handle" /></Field><Field label="LinkedIn" error={errors.linkedin?.message} name="linkedin"><Input {...register("linkedin")} maxLength={255} placeholder="https://linkedin.com/in/..." aria-invalid={!!errors.linkedin} /></Field><Field label="X (Twitter)" error={errors.twitter?.message} name="twitter"><Input {...register("twitter")} maxLength={120} placeholder="@handle" /></Field></div></div>;
}

export function ProfileImageSetterProvider({ onSet, children }: { onSet: ImageSetter; children: React.ReactNode }) { return <ImageSetterContext.Provider value={onSet}>{children}</ImageSetterContext.Provider>; }
function useImageSetter(): ImageSetter { const { setValue } = useFormContext<ProfileFormValues>(); const provided = useContext(ImageSetterContext); return provided ?? ((field: ImageField)=>(url:string)=>setValue(field,url,{shouldDirty:true})); }
export function ProfileSectionFields({ section, userId }: { section: ProfileSection; userId: string }) { switch(section){case "identity":return <IdentityFields userId={userId}/>;case "story":return <StoryFields/>;case "matching":return <MatchingFields/>;case "contact":return <ContactFields/>;} }

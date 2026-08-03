import { createContext, useContext } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Switch } from "@shared/components/ui/switch";
import ImageUploadCrop from "@/components/ImageUploadCrop";
import { KeywordInput } from "@/components/directory/KeywordInput";
import { AFRICAN_COUNTRIES, SECTORS } from "@/lib/directory/options";
import type { ProfileFormValues } from "@/lib/validation/profile";
import type { ProfileSection } from "@/lib/dashboard/routes";

/**
 * The profile form, split into the same four sections the profile page shows.
 *
 * Fields read the form off `useFormContext`, so the wizard (one section at a
 * time) and the section editor (one or all) render identical inputs with
 * identical validation — there is no second copy of the form to drift.
 */

/**
 * Setting an image has to be routed through the page, not straight into the
 * form: the page records the storage path of the image being REPLACED so it can
 * delete the orphan after a successful save. Deleting at change-time would
 * destroy the live image of an edit the user then abandons.
 */
type ImageField = "logo_url" | "founder_photo_url";
type ImageSetter = (field: ImageField) => (url: string) => void;

const ImageSetterContext = createContext<ImageSetter | null>(null);

/** Which fields belong to which section — used to validate one wizard step. */
export const SECTION_FIELDS: Record<ProfileSection, (keyof ProfileFormValues)[]> = {
  identity: ["business_name", "founder_name", "country", "sector", "logo_url", "founder_photo_url"],
  story: ["short_description", "long_description"],
  matching: ["keywords"],
  contact: [
    "website",
    "email",
    "phone",
    "whatsapp",
    "show_email",
    "show_phone",
    "show_whatsapp",
    "instagram",
    "linkedin",
    "twitter",
  ],
};

function Field({
  label,
  error,
  name,
  hint,
  children,
}: {
  label: string;
  error?: string;
  name: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`err-${name}`} className="mt-1 text-sm text-destructive-strong">
          {error}
        </p>
      )}
    </div>
  );
}

function ContactField({
  label,
  error,
  name,
  switchName,
  children,
}: {
  label: string;
  error?: string;
  name: string;
  switchName: "show_email" | "show_phone" | "show_whatsapp";
  children: React.ReactNode;
}) {
  const { control } = useFormContext<ProfileFormValues>();
  const switchId = `${switchName}-toggle`;
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
      {error && (
        <p id={`err-${name}`} className="mt-1 text-sm text-destructive-strong">
          {error}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <Controller
          control={control}
          name={switchName}
          render={({ field }) => (
            <Switch id={switchId} checked={!!field.value} onCheckedChange={field.onChange} />
          )}
        />
        <Label htmlFor={switchId} className="text-xs font-normal text-muted-foreground">
          Visible on your public page
        </Label>
      </div>
    </div>
  );
}

function IdentityFields({ userId }: { userId: string }) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<ProfileFormValues>();
  const setImage = useImageSetter();

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Business name *" error={errors.business_name?.message} name="business_name">
          <Input
            {...register("business_name")}
            maxLength={120}
            aria-invalid={!!errors.business_name}
            aria-describedby={errors.business_name ? "err-business_name" : undefined}
          />
        </Field>
        <Field label="Founder name" error={errors.founder_name?.message} name="founder_name">
          <Input {...register("founder_name")} maxLength={120} />
        </Field>
        <Field label="Country *" error={errors.country?.message} name="country">
          <select
            {...register("country")}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            aria-invalid={!!errors.country}
          >
            <option value="">Select a country</option>
            {AFRICAN_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sector / industry *" error={errors.sector?.message} name="sector">
          <select
            {...register("sector")}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            aria-invalid={!!errors.sector}
          >
            <option value="">Select a sector</option>
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ImageUploadCrop
          label="Logo"
          value={watch("logo_url") ?? ""}
          onChange={setImage("logo_url")}
          userId={userId}
          aspect={1}
          shape="rect"
          folder="logo"
        />
        <ImageUploadCrop
          label="Founder photo"
          value={watch("founder_photo_url") ?? ""}
          onChange={setImage("founder_photo_url")}
          userId={userId}
          aspect={1}
          shape="round"
          folder="founder"
        />
      </div>
    </div>
  );
}

function StoryFields() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<ProfileFormValues>();
  const long = watch("long_description") ?? "";

  return (
    <div className="space-y-5">
      <Field
        label="One-liner"
        error={errors.short_description?.message}
        name="short_description"
        hint="The single sentence that appears under your name in the directory."
      >
        <Input {...register("short_description")} maxLength={180} />
      </Field>

      <Field
        label="About the business"
        error={errors.long_description?.message}
        name="long_description"
        hint={`${long.length} / 2000`}
      >
        <Textarea {...register("long_description")} maxLength={2000} rows={7} />
      </Field>
    </div>
  );
}

function MatchingFields() {
  const {
    control,
    formState: { errors },
  } = useFormContext<ProfileFormValues>();

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="keywords" className="mb-1.5 block">
          Keywords
        </Label>
        <p className="mb-2 text-sm text-muted-foreground">
          Add at least three. These are what we match funding opportunities against, so use the
          words a funder would use — "solar", "irrigation", "women-led".
        </p>
        <Controller
          control={control}
          name="keywords"
          render={({ field }) => (
            <KeywordInput value={field.value ?? []} onChange={field.onChange} />
          )}
        />
        {errors.keywords && (
          <p className="mt-1 text-sm text-destructive-strong">
            {errors.keywords.message as string}
          </p>
        )}
      </div>
    </div>
  );
}

function ContactFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProfileFormValues>();

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Visible details appear after a visitor taps "Show contact". You can turn any of these off
        at any time.
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        <ContactField label="Public email" error={errors.email?.message} name="email" switchName="show_email">
          <Input type="email" {...register("email")} maxLength={255} aria-invalid={!!errors.email} />
        </ContactField>
        <ContactField label="Phone" error={errors.phone?.message} name="phone" switchName="show_phone">
          <Input {...register("phone")} maxLength={40} />
        </ContactField>
        <ContactField label="WhatsApp" error={errors.whatsapp?.message} name="whatsapp" switchName="show_whatsapp">
          <Input {...register("whatsapp")} maxLength={40} />
        </ContactField>
        <Field label="Website" error={errors.website?.message} name="website">
          <Input
            {...register("website")}
            maxLength={255}
            placeholder="https://..."
            aria-invalid={!!errors.website}
          />
        </Field>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Field label="Instagram" error={errors.instagram?.message} name="instagram">
          <Input {...register("instagram")} maxLength={120} placeholder="@handle" />
        </Field>
        <Field label="LinkedIn" error={errors.linkedin?.message} name="linkedin">
          <Input
            {...register("linkedin")}
            maxLength={255}
            placeholder="https://linkedin.com/in/..."
            aria-invalid={!!errors.linkedin}
          />
        </Field>
        <Field label="X (Twitter)" error={errors.twitter?.message} name="twitter">
          <Input {...register("twitter")} maxLength={120} placeholder="@handle" />
        </Field>
      </div>
    </div>
  );
}

export function ProfileImageSetterProvider({
  onSet,
  children,
}: {
  onSet: ImageSetter;
  children: React.ReactNode;
}) {
  return <ImageSetterContext.Provider value={onSet}>{children}</ImageSetterContext.Provider>;
}

function useImageSetter(): ImageSetter {
  const { setValue } = useFormContext<ProfileFormValues>();
  const provided = useContext(ImageSetterContext);
  // Fall back to a plain setValue so the fields still work if rendered without
  // the provider (e.g. in a focused test) — only orphan cleanup is lost.
  return (
    provided ??
    ((field: ImageField) => (url: string) => setValue(field, url, { shouldDirty: true }))
  );
}

export function ProfileSectionFields({
  section,
  userId,
}: {
  section: ProfileSection;
  userId: string;
}) {
  switch (section) {
    case "identity":
      return <IdentityFields userId={userId} />;
    case "story":
      return <StoryFields />;
    case "matching":
      return <MatchingFields />;
    case "contact":
      return <ContactFields />;
  }
}

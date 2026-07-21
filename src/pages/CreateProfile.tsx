import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import ImageUploadCrop, { storagePathFromUrl } from "@/components/ImageUploadCrop";
import { KeywordInput } from "@/components/directory/KeywordInput";
import { SEO } from "@/components/common/SEO";
import { ErrorState } from "@/components/common/ErrorState";
import { CardSkeleton } from "@/components/common/LoadingState";
import { useOwnProfile, useSaveProfile } from "@/hooks/queries/directory";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import {
  profileSchema,
  profileFormDefaults,
  normalizeProfileInput,
  type ProfileFormValues,
} from "@/lib/validation/profile";

const AFRICAN_COUNTRIES = [
  "Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cabo Verde","Cameroon","Central African Republic","Chad","Comoros","Congo (Brazzaville)","Congo (DRC)","Côte d'Ivoire","Djibouti","Egypt","Equatorial Guinea","Eritrea","Eswatini","Ethiopia","Gabon","Gambia","Ghana","Guinea","Guinea-Bissau","Kenya","Lesotho","Liberia","Libya","Madagascar","Malawi","Mali","Mauritania","Mauritius","Morocco","Mozambique","Namibia","Niger","Nigeria","Rwanda","São Tomé and Príncipe","Senegal","Seychelles","Sierra Leone","Somalia","South Africa","South Sudan","Sudan","Tanzania","Togo","Tunisia","Uganda","Zambia","Zimbabwe","Other",
];

const SECTORS = [
  "Agriculture & Agritech","Fashion & Apparel","Food & Beverage","Retail & E-commerce","Logistics & Supply Chain","Manufacturing","Construction & Real Estate","Financial Services & Fintech","Health & Wellness","Healthtech & Pharma","Education & Edtech","Media, Arts & Entertainment","Beauty & Personal Care","Hospitality & Tourism","Professional Services","Marketing & Creative","Technology & Software","Energy & Cleantech","Transportation & Mobility","Automotive","Telecommunications","Import / Export & Trade","Mining & Natural Resources","Non-profit & Social Enterprise","Other",
];

const CreateProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const save = useSaveProfile();

  const ownQuery = useOwnProfile(user?.id);
  const existing = ownQuery.data;
  const isEditing = !!existing;

  const replacedPaths = useRef<Set<string>>(new Set());
  const [discardOpen, setDiscardOpen] = useState(false);
  const hydrated = useRef(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setFocus,
    setValue,
    getValues,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileFormDefaults,
  });

  useUnsavedChanges(isDirty && !save.isPending);

  // Hydrate the form once the own-profile row arrives.
  useEffect(() => {
    if (!existing || hydrated.current) return;
    hydrated.current = true;
    reset({
      ...profileFormDefaults,
      business_name: (existing.business_name as string) ?? "",
      founder_name: (existing.founder_name as string) ?? "",
      country: (existing.country as string) ?? "",
      sector: (existing.sector as string) ?? "",
      short_description: (existing.short_description as string) ?? "",
      long_description: (existing.long_description as string) ?? "",
      website: (existing.website as string) ?? "",
      email: (existing.email as string) ?? "",
      phone: (existing.phone as string) ?? "",
      whatsapp: (existing.whatsapp as string) ?? "",
      instagram: (existing.instagram as string) ?? "",
      linkedin: (existing.linkedin as string) ?? "",
      twitter: (existing.twitter as string) ?? "",
      logo_url: (existing.logo_url as string) ?? "",
      founder_photo_url: (existing.founder_photo_url as string) ?? "",
      keywords: (existing.keywords as string[]) ?? [],
      show_email: (existing.show_email as boolean) ?? true,
      show_phone: (existing.show_phone as boolean) ?? true,
      show_whatsapp: (existing.show_whatsapp as boolean) ?? true,
    });
  }, [existing, reset]);

  const handleImage = (field: "logo_url" | "founder_photo_url") => (url: string, _path: string | null) => {
    const prev = getValues(field);
    if (prev && prev !== url) {
      const prevPath = storagePathFromUrl(prev);
      if (prevPath) replacedPaths.current.add(prevPath);
    }
    setValue(field, url, { shouldDirty: true });
  };

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    const payload = { ...normalizeProfileInput(values), user_id: user.id };
    try {
      const { slug } = await save.mutateAsync(payload);
      // Best-effort orphan cleanup — only AFTER a successful save (an abandoned edit keeps
      // its old image). Failures are ignored.
      const paths = [...replacedPaths.current].filter(Boolean);
      if (paths.length) {
        await supabase.storage.from("profile-media").remove(paths).catch(() => {});
        replacedPaths.current.clear();
      }
      toast.success("Profile published — this is what the world sees.");
      navigate(`/directory/${slug}`, { state: { justPublished: !isEditing } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      if (/duplicate key|already exists|23505/i.test(message)) {
        toast.error("You already have a profile — reload to edit it.");
      } else {
        toast.error(message);
      }
    }
  };

  const onInvalid = () => {
    toast.error("Fix the highlighted fields");
    const firstError = Object.keys(errors)[0] as keyof ProfileFormValues | undefined;
    if (firstError) setFocus(firstError);
  };

  const leave = () => navigate("/directory");
  const requestCancel = () => {
    if (isDirty) setDiscardOpen(true);
    else leave();
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-secondary px-6 py-16">
      <SEO title={isEditing ? "Edit your profile" : "Create your profile"} noindex />
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-border bg-card p-8 shadow-medium">
          <h1 className="mb-2 font-display text-3xl font-bold text-ink-strong">
            {isEditing ? "Edit your profile" : "Create your SME profile"}
          </h1>
          <p className="mb-8 text-muted-foreground">
            Your profile is public and searchable on the directory as soon as you save.
          </p>

          {ownQuery.isLoading ? (
            <div className="space-y-4">
              <CardSkeleton lines={4} />
              <CardSkeleton lines={4} />
            </div>
          ) : ownQuery.isError ? (
            <ErrorState
              title="Couldn't load your profile"
              message="We couldn't check whether you already have a profile. Try again."
              onRetry={() => ownQuery.refetch()}
            />
          ) : (
            <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-5" noValidate>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Business name *" error={errors.business_name?.message} name="business_name">
                  <Input {...register("business_name")} maxLength={120} aria-invalid={!!errors.business_name} aria-describedby={errors.business_name ? "err-business_name" : undefined} />
                </Field>
                <Field label="Founder name" error={errors.founder_name?.message} name="founder_name">
                  <Input {...register("founder_name")} maxLength={120} />
                </Field>
                <Field label="Country *" error={errors.country?.message} name="country">
                  <select {...register("country")} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm" aria-invalid={!!errors.country}>
                    <option value="">Select a country</option>
                    {AFRICAN_COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Sector / industry *" error={errors.sector?.message} name="sector">
                  <select {...register("sector")} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm" aria-invalid={!!errors.sector}>
                    <option value="">Select a sector</option>
                    {SECTORS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Short description (one-liner, up to 180 chars)" error={errors.short_description?.message} name="short_description">
                <Input {...register("short_description")} maxLength={180} />
              </Field>

              <Field label="About the business" error={errors.long_description?.message} name="long_description">
                <Textarea {...register("long_description")} maxLength={2000} rows={5} />
              </Field>

              <div>
                <Label htmlFor="keywords" className="mb-1.5 block">Keywords</Label>
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

              <h2 className="pt-4 font-display text-lg font-semibold text-ink-strong">Images</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <ImageUploadCrop label="Logo" value={watch("logo_url") ?? ""} onChange={handleImage("logo_url")} userId={user.id} aspect={1} shape="rect" folder="logo" />
                <ImageUploadCrop label="Founder photo" value={watch("founder_photo_url") ?? ""} onChange={handleImage("founder_photo_url")} userId={user.id} aspect={1} shape="round" folder="founder" />
              </div>

              <h2 className="pt-4 font-display text-lg font-semibold text-ink-strong">Contact</h2>
              <p className="text-sm text-muted-foreground">
                Visible details appear after a visitor taps "Show contact". You can turn any of
                these off anytime.
              </p>
              <div className="grid gap-5 md:grid-cols-2">
                <ContactField label="Public email" error={errors.email?.message} name="email" control={control} switchName="show_email">
                  <Input type="email" {...register("email")} maxLength={255} aria-invalid={!!errors.email} />
                </ContactField>
                <ContactField label="Phone" error={errors.phone?.message} name="phone" control={control} switchName="show_phone">
                  <Input {...register("phone")} maxLength={40} />
                </ContactField>
                <ContactField label="WhatsApp" error={errors.whatsapp?.message} name="whatsapp" control={control} switchName="show_whatsapp">
                  <Input {...register("whatsapp")} maxLength={40} />
                </ContactField>
                <Field label="Website" error={errors.website?.message} name="website">
                  <Input {...register("website")} maxLength={255} placeholder="https://..." aria-invalid={!!errors.website} />
                </Field>
              </div>

              <h2 className="pt-4 font-display text-lg font-semibold text-ink-strong">Social</h2>
              <div className="grid gap-5 md:grid-cols-3">
                <Field label="Instagram" error={errors.instagram?.message} name="instagram">
                  <Input {...register("instagram")} maxLength={120} placeholder="@handle" />
                </Field>
                <Field label="LinkedIn" error={errors.linkedin?.message} name="linkedin">
                  <Input {...register("linkedin")} maxLength={255} placeholder="https://linkedin.com/in/..." aria-invalid={!!errors.linkedin} />
                </Field>
                <Field label="X (Twitter)" error={errors.twitter?.message} name="twitter">
                  <Input {...register("twitter")} maxLength={120} placeholder="@handle" />
                </Field>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" variant="default" size="lg" className="min-h-[44px]" disabled={save.isPending}>
                  {save.isPending ? "Saving..." : isEditing ? "Save changes" : "Publish to directory"}
                </Button>
                <Button type="button" variant="outline" size="lg" className="min-h-[44px]" onClick={requestCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. If you leave now, they'll be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={leave}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function Field({
  label,
  error,
  name,
  children,
}: {
  label: string;
  error?: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
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
  control,
  switchName,
  children,
}: {
  label: string;
  error?: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  switchName: "show_email" | "show_phone" | "show_whatsapp";
  children: React.ReactNode;
}) {
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

export default CreateProfile;

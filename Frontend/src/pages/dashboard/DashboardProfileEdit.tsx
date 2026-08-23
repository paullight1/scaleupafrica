import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { supabase } from "@shared/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { Button } from "@shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import { SEO } from "@shared/components/common/SEO";
import { ErrorState } from "@shared/components/common/ErrorState";
import { CardSkeleton } from "@shared/components/common/LoadingState";
import { storagePathFromUrl } from "@/components/imageUploadCrop.utils";
import {
  ProfileSectionFields,
  ProfileImageSetterProvider,
} from "@/components/dashboard/ProfileFields";
import { SECTION_FIELDS } from "@/components/dashboard/profileFields.config";
import { useOwnProfile, useSaveProfile } from "@/hooks/queries/directory";
import { qk } from "@/hooks/queries/dashboard";
import { useQueryClient } from "@tanstack/react-query";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import {
  asProfileSection,
  DASHBOARD_PROFILE,
  PROFILE_SECTIONS,
  SECTION_META,
  WIZARD_STEPS,
  type ProfileSection,
} from "@/lib/dashboard/routes";
import {
  profileSchema,
  profileFormDefaults,
  normalizeProfileInput,
  type ProfileFormValues,
} from "@/lib/validation/profile";

export function DashboardProfileEdit() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const save = useSaveProfile();
  const [params] = useSearchParams();
  const ownQuery = useOwnProfile(user?.id);
  const existing = ownQuery.data;
  const isEditing = !!existing;
  const replacedPaths = useRef<Set<string>>(new Set());
  const [discardOpen, setDiscardOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const hydrated = useRef(false);

  const form = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema), defaultValues: profileFormDefaults });
  const { handleSubmit, reset, setFocus, setValue, getValues, trigger, formState: { errors, isDirty } } = form;
  useUnsavedChanges(isDirty && !save.isPending);

  useEffect(() => {
    document.title = isEditing ? "Edit your profile — Cresciva" : "Create your profile — Cresciva";
  }, [isEditing]);

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
      business_stage: (existing.business_stage as ProfileFormValues["business_stage"]) ?? null,
      funding_target_usd: existing.funding_target_usd == null ? null : Number(existing.funding_target_usd),
      preferred_funding_types: (existing.preferred_funding_types as string[]) ?? [],
      application_readiness: (existing.application_readiness as ProfileFormValues["application_readiness"]) ?? null,
      organisation_type: (existing.organisation_type as string) ?? "",
      operating_countries: (existing.operating_countries as string[]) ?? [],
      founding_year: existing.founding_year == null ? null : Number(existing.founding_year),
      show_email: (existing.show_email as boolean) ?? true,
      show_phone: (existing.show_phone as boolean) ?? true,
      show_whatsapp: (existing.show_whatsapp as boolean) ?? true,
    });
  }, [existing, reset]);

  useEffect(() => {
    if (!ownQuery.isSuccess || existing || hydrated.current) return;
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const businessName = typeof meta.business_name === "string" ? meta.business_name : "";
    const founderName = typeof meta.full_name === "string" ? meta.full_name : "";
    if (!businessName && !founderName) return;
    hydrated.current = true;
    reset({ ...profileFormDefaults, business_name: businessName, founder_name: founderName });
  }, [ownQuery.isSuccess, existing, user, reset]);

  const setImage = (field: "logo_url" | "founder_photo_url") => (url: string) => {
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
      await save.mutateAsync(payload);
      await qc.invalidateQueries({ queryKey: qk.myProfile(user.id) });
      const paths = [...replacedPaths.current].filter(Boolean);
      if (paths.length) {
        await supabase.storage.from("profile-media").remove(paths).catch(() => {});
        replacedPaths.current.clear();
      }
      reset(values);
      toast.success(isEditing ? "Profile updated." : "Profile published.");
      navigate(isEditing ? DASHBOARD_PROFILE : `${DASHBOARD_PROFILE}?published=1`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      if (/duplicate key|already exists|23505/i.test(message)) toast.error("You already have a profile — reload to edit it.");
      else toast.error(message);
    }
  };

  const onInvalid = () => {
    toast.error("Fix the highlighted fields");
    const firstError = Object.keys(errors)[0] as keyof ProfileFormValues | undefined;
    if (firstError) setFocus(firstError);
  };

  const leave = () => navigate(DASHBOARD_PROFILE);
  const requestCancel = () => { if (isDirty) setDiscardOpen(true); else leave(); };

  if (authLoading || !user) return null;
  if (ownQuery.isLoading) return <div className="space-y-4"><CardSkeleton lines={4} /><CardSkeleton lines={4} /></div>;
  if (ownQuery.isError) return <ErrorState title="Couldn't load your profile" message="We couldn't check whether you already have a profile. Try again." onRetry={() => ownQuery.refetch()} />;

  const requested = asProfileSection(params.get("section"));
  const wizard = !isEditing;
  const step = WIZARD_STEPS[stepIndex];
  const isLastStep = stepIndex === WIZARD_STEPS.length - 1;
  const visibleSections: ProfileSection[] = wizard ? [step] : requested ? [requested] : [...PROFILE_SECTIONS];

  async function nextStep() {
    const ok = await trigger(SECTION_FIELDS[step]);
    if (!ok) { onInvalid(); return; }
    setStepIndex((i) => Math.min(i + 1, WIZARD_STEPS.length - 1));
  }

  return (
    <div className="space-y-6">
      <SEO title={isEditing ? "Edit your profile" : "Create your profile"} noindex />
      <div>
        <Link to={DASHBOARD_PROFILE} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{isEditing ? "Back to my profile" : "Not now"}</Link>
        <h1 className="mt-3 font-display text-2xl font-semibold text-ink-strong md:text-3xl">{wizard ? "Create your profile" : SECTION_META[visibleSections[0]].title}</h1>
        {wizard ? <div className="mt-3 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={stepIndex + 1} aria-valuemin={1} aria-valuemax={WIZARD_STEPS.length} aria-label={`Step ${stepIndex + 1} of ${WIZARD_STEPS.length}`}><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${((stepIndex + 1) / WIZARD_STEPS.length) * 100}%` }} /></div><span className="shrink-0 text-sm text-muted-foreground tabular-nums">Step {stepIndex + 1} of {WIZARD_STEPS.length}</span></div> : <p className="mt-1 text-muted-foreground">{requested ? SECTION_META[requested].blurb : "Everything on your public profile, in one place."}</p>}
      </div>

      <FormProvider {...form}>
        <ProfileImageSetterProvider onSet={setImage}>
          <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-8">
            {visibleSections.map((section) => <section key={section} className="rounded-xl border border-border bg-card p-6 shadow-soft">{(!wizard && !requested) && <h2 className="mb-1 font-display text-lg font-semibold text-ink-strong">{SECTION_META[section].title}</h2>}{wizard && <p className="mb-5 text-sm text-muted-foreground">{SECTION_META[section].blurb}</p>}<ProfileSectionFields section={section} userId={user.id} /></section>)}
            <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 px-4 py-4 backdrop-blur md:-mx-6 md:px-6"><div className="flex flex-wrap items-center gap-3">{wizard && stepIndex > 0 && <Button type="button" variant="outline" size="lg" onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}><ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />Back</Button>}{wizard && !isLastStep ? <Button type="button" size="lg" onClick={nextStep}>Continue<ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" /></Button> : <Button type="submit" size="lg" disabled={save.isPending}>{save.isPending ? "Saving…" : <><Check className="mr-1.5 h-4 w-4" aria-hidden="true" />{isEditing ? "Save changes" : "Publish my profile"}</>}</Button>}{!wizard && <Button type="button" variant="ghost" size="lg" onClick={requestCancel}>Cancel</Button>}{isDirty && !save.isPending && <span className="ml-auto text-sm text-muted-foreground">Unsaved changes</span>}</div></div>
          </form>
        </ProfileImageSetterProvider>
      </FormProvider>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Discard your changes?</AlertDialogTitle><AlertDialogDescription>You have unsaved changes. If you leave now, they'll be lost.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={leave}>Discard</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

export default DashboardProfileEdit;

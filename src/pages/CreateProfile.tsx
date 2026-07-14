import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import ImageUploadCrop from "@/components/ImageUploadCrop";

const AFRICAN_COUNTRIES = [
  "Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cabo Verde","Cameroon","Central African Republic","Chad","Comoros","Congo (Brazzaville)","Congo (DRC)","Côte d'Ivoire","Djibouti","Egypt","Equatorial Guinea","Eritrea","Eswatini","Ethiopia","Gabon","Gambia","Ghana","Guinea","Guinea-Bissau","Kenya","Lesotho","Liberia","Libya","Madagascar","Malawi","Mali","Mauritania","Mauritius","Morocco","Mozambique","Namibia","Niger","Nigeria","Rwanda","São Tomé and Príncipe","Senegal","Seychelles","Sierra Leone","Somalia","South Africa","South Sudan","Sudan","Tanzania","Togo","Tunisia","Uganda","Zambia","Zimbabwe","Other"
];

const SECTORS = [
  "Agriculture & Agritech","Fashion & Apparel","Food & Beverage","Retail & E-commerce","Logistics & Supply Chain","Manufacturing","Construction & Real Estate","Financial Services & Fintech","Health & Wellness","Healthtech & Pharma","Education & Edtech","Media, Arts & Entertainment","Beauty & Personal Care","Hospitality & Tourism","Professional Services","Marketing & Creative","Technology & Software","Energy & Cleantech","Transportation & Mobility","Automotive","Telecommunications","Import / Export & Trade","Mining & Natural Resources","Non-profit & Social Enterprise","Other"
];

const schema = z.object({
  business_name: z.string().trim().min(1, "Required").max(120),
  founder_name: z.string().trim().max(120).optional().or(z.literal("")),
  country: z.string().min(1, "Required"),
  sector: z.string().min(1, "Required"),
  short_description: z.string().trim().max(180).optional().or(z.literal("")),
  long_description: z.string().trim().max(2000).optional().or(z.literal("")),
  website: z.string().trim().max(255).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
  instagram: z.string().trim().max(120).optional().or(z.literal("")),
  linkedin: z.string().trim().max(255).optional().or(z.literal("")),
  twitter: z.string().trim().max(120).optional().or(z.literal("")),
  logo_url: z.string().trim().max(500).optional().or(z.literal("")),
  founder_photo_url: z.string().trim().max(500).optional().or(z.literal("")),
});

type FormState = z.infer<typeof schema>;

const initial: FormState = {
  business_name: "", founder_name: "", country: "", sector: "",
  short_description: "", long_description: "", website: "", email: "",
  phone: "", whatsapp: "", instagram: "", linkedin: "", twitter: "",
  logo_url: "", founder_photo_url: "",
};

const CreateProfile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Create Profile | ScaleUp Africa Collective";
    if (!loading && !user) navigate("/auth?next=/directory/create", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setExistingId(data.id);
        setForm({
          business_name: data.business_name ?? "",
          founder_name: data.founder_name ?? "",
          country: data.country ?? "",
          sector: data.sector ?? "",
          short_description: data.short_description ?? "",
          long_description: data.long_description ?? "",
          website: data.website ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          whatsapp: data.whatsapp ?? "",
          instagram: data.instagram ?? "",
          linkedin: data.linkedin ?? "",
          twitter: data.twitter ?? "",
          logo_url: data.logo_url ?? "",
          founder_photo_url: data.founder_photo_url ?? "",
        });
      }
    })();
  }, [user]);

  const update = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    const payload = { ...parsed.data, user_id: user.id };
    const { error } = existingId
      ? await supabase.from("profiles").update(payload).eq("id", existingId)
      : await supabase.from("profiles").insert(payload as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(existingId ? "Profile updated" : "Profile published to the directory");
    navigate("/directory");
  };

  if (loading || !user) return null;

  return (
    <main className="min-h-screen bg-secondary py-16 px-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/directory" className="inline-flex items-center gap-2 text-muted-foreground hover:text-forest text-sm mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to directory
        </Link>
        <div className="rounded-3xl border border-border bg-card p-8 shadow-elevated">
          <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
            {existingId ? "Edit your profile" : "Create your SME profile"}
          </h1>
          <p className="text-muted-foreground mb-8">
            Your profile is public and searchable on the directory as soon as you save.
          </p>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Business name *"><Input value={form.business_name} onChange={update("business_name")} required maxLength={120} /></Field>
              <Field label="Founder name"><Input value={form.founder_name} onChange={update("founder_name")} maxLength={120} /></Field>
              <Field label="Country *">
                <select value={form.country} onChange={update("country")} required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Select a country</option>
                  {AFRICAN_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Sector / industry *">
                <select value={form.sector} onChange={update("sector")} required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Select a sector</option>
                  {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Short description (one-liner, up to 180 chars)">
              <Input value={form.short_description} onChange={update("short_description")} maxLength={180} />
            </Field>

            <Field label="About the business">
              <Textarea value={form.long_description} onChange={update("long_description")} maxLength={2000} rows={5} />
            </Field>

            <h2 className="font-serif text-lg font-semibold text-foreground pt-4">Images</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <ImageUploadCrop label="Logo" value={form.logo_url} onChange={(url) => setForm((f) => ({ ...f, logo_url: url }))} userId={user.id} aspect={1} shape="rect" folder="logo" />
              <ImageUploadCrop label="Founder photo" value={form.founder_photo_url} onChange={(url) => setForm((f) => ({ ...f, founder_photo_url: url }))} userId={user.id} aspect={1} shape="round" folder="founder" />
            </div>

            <h2 className="font-serif text-lg font-semibold text-foreground pt-4">Contact</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Website"><Input value={form.website} onChange={update("website")} maxLength={255} placeholder="https://..." /></Field>
              <Field label="Public email"><Input type="email" value={form.email} onChange={update("email")} maxLength={255} /></Field>
              <Field label="Phone"><Input value={form.phone} onChange={update("phone")} maxLength={40} /></Field>
              <Field label="WhatsApp"><Input value={form.whatsapp} onChange={update("whatsapp")} maxLength={40} /></Field>
            </div>

            <h2 className="font-serif text-lg font-semibold text-foreground pt-4">Social</h2>
            <div className="grid gap-5 md:grid-cols-3">
              <Field label="Instagram"><Input value={form.instagram} onChange={update("instagram")} maxLength={120} placeholder="@handle" /></Field>
              <Field label="LinkedIn"><Input value={form.linkedin} onChange={update("linkedin")} maxLength={255} /></Field>
              <Field label="X (Twitter)"><Input value={form.twitter} onChange={update("twitter")} maxLength={120} placeholder="@handle" /></Field>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" variant="gold" size="lg" disabled={saving}>
                {saving ? "Saving..." : existingId ? "Save changes" : "Publish to directory"}
              </Button>
              <Link to="/directory"><Button type="button" variant="outline" size="lg">Cancel</Button></Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <Label className="mb-1.5 block">{label}</Label>
    {children}
  </div>
);

export default CreateProfile;

import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CheckCircle2, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { submitContact } from "@/lib/email";
import { trackEvent } from "@shared/lib/analytics";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please tell us your name.").max(120),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Please add a little more detail.").max(2000),
});

type ContactValues = z.infer<typeof contactSchema>;

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  // Honeypot: hidden from humans and assistive tech, irresistible to naive bots.
  const honeypot = useRef<HTMLInputElement>(null);

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", company: "", message: "" },
  });

  const onSubmit = async (values: ContactValues) => {
    const result = await submitContact({
      name: values.name,
      email: values.email,
      company: values.company || undefined,
      message: values.message,
      hp: honeypot.current?.value ?? "",
    });

    if (result.ok === false) {
      // The server re-validates; surface its per-field messages on the inputs
      // rather than burying them all in one toast.
      const fields = result.error.fields;
      if (fields) {
        for (const [name, message] of Object.entries(fields)) {
          if (name in values) form.setError(name as keyof ContactValues, { message: String(message) });
        }
      }
      toast.error(
        result.error.code === "RATE_LIMITED"
          ? "You've sent a few messages already. Please try again a little later."
          : "Something went wrong sending your message. Please try again.",
      );
      return;
    }

    void trackEvent("lead_submit", { metadata: { source: "contact" } });
    setSubmitted(true);
    form.reset();
    toast.success("Thanks — your message is on its way.");
  };

  return (
    <>
      <SEO title="Contact" description="Get in touch with the Cresciva team." />
      <PageHeader
        eyebrow="Contact"
        title="Talk to the Cresciva team"
        description="Questions about membership, your business profile, partnerships, or funding intelligence? Send us a message."
      />

      <section className="bg-secondary px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
              <Mail className="mb-4 h-6 w-6 text-primary-dark" aria-hidden="true" />
              <h2 className="font-display text-xl font-bold text-ink-strong">Send a message</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We route messages to the team and reply to the email address you provide.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
              <MapPin className="mb-4 h-6 w-6 text-primary-dark" aria-hidden="true" />
              <h2 className="font-display text-xl font-bold text-ink-strong">Pan-African by design</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Cresciva serves SME founders across African markets and the diaspora supporting them.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-medium md:p-8">
            {submitted ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <CheckCircle2 className="mb-5 h-12 w-12 text-success-strong" aria-hidden="true" />
                <h2 className="font-display text-2xl font-bold text-ink-strong">Message received</h2>
                <p className="mt-3 max-w-md text-muted-foreground">
                  Thanks for reaching out. Your message has been captured and the team can follow up by email.
                </p>
                <Button className="mt-6" variant="outline" onClick={() => setSubmitted(false)}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Name</Label>
                    <Input id="contact-name" autoComplete="name" {...form.register("name")} />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email</Label>
                    <Input id="contact-email" type="email" autoComplete="email" {...form.register("email")} />
                    {form.formState.errors.email && (
                      <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-company">Company <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="contact-company" autoComplete="organization" {...form.register("company")} />
                  {form.formState.errors.company && (
                    <p className="text-sm text-destructive">{form.formState.errors.company.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-message">Message</Label>
                  <Textarea id="contact-message" rows={7} {...form.register("message")} />
                  {form.formState.errors.message && (
                    <p className="text-sm text-destructive">{form.formState.errors.message.message}</p>
                  )}
                </div>

                <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
                  <label htmlFor="contact-website">Website</label>
                  <input id="contact-website" ref={honeypot} tabIndex={-1} autoComplete="off" />
                </div>

                <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Sending…" : "Send message"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

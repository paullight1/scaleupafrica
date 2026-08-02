import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, MessageCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@shared/integrations/supabase/client";
import { trackEvent } from "@shared/lib/analytics";
import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";
import { Illustration } from "@shared/components/common/Illustration";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@shared/components/ui/form";

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please tell us your name.")
    .max(120, "That name is a little long."),
  email: z
    .string()
    .trim()
    .min(1, "An email address is required.")
    .email("Enter a valid email address."),
  company: z.string().trim().max(160, "That company name is a little long.").optional(),
  message: z
    .string()
    .trim()
    .min(10, "Please add a little more detail (at least 10 characters).")
    .max(2000, "Please keep your message under 2,000 characters."),
});

type ContactValues = z.infer<typeof contactSchema>;

const channels = [
  {
    icon: Mail,
    title: "Email us",
    description: "For general questions, partnerships, and support.",
    href: "mailto:hello@cresciva.com",
    cta: "Send an email",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp",
    description: "Prefer to chat? Reach the team on WhatsApp during business hours.",
    href: "https://wa.me/000000000",
    cta: "Open WhatsApp",
  },
];

const Contact = () => {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", company: "", message: "" },
  });

  const onSubmit = async (values: ContactValues) => {
    const { error } = await supabase.from("leads").insert({
      name: values.name,
      email: values.email,
      company: values.company || null,
      message: values.message,
      source: "contact",
      metadata: {},
    });

    if (error) {
      toast.error("Something went wrong sending your message. Please try again.");
      return;
    }

    void trackEvent("lead_submit", { metadata: { source: "contact" } });
    setSubmitted(true);
    form.reset();
    toast.success("Thanks — your message is on its way.");
  };

  return (
    <>
      <SEO
        title="Contact Us"
        description="Get in touch with the Cresciva team — questions, partnerships, or support for founders using the directory and Funding Radar."
      />

      {/* Hero band */}
      <section className="bg-navy px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <PageHeader
            onDark
            title="Talk to us."
            subtitle="Questions about your profile, the Funding Radar, or a partnership idea? Send us a note and a real person will get back to you."
          />
        </div>
      </section>

      <section className="bg-background px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.2fr_1fr]">
          {/* Form / success */}
          <div>
            {submitted ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center shadow-soft md:p-10">
                <Illustration name="mail-sent" className="mx-auto mb-6 h-28" />
                <h2 className="font-display text-xl font-bold text-ink-strong">
                  Message received
                </h2>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Thanks for reaching out. We read every message and typically reply within a
                  couple of business days.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button onClick={() => setSubmitted(false)} variant="outline">
                    Send another message
                  </Button>
                  <Button asChild>
                    <Link to="/resources">Browse the resources</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-6 shadow-soft md:p-8">
                <h2 className="font-display text-xl font-bold text-ink-strong">
                  Send us a message
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Fields marked with an asterisk (*) are required.
                </p>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your full name"
                              autoComplete="name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              inputMode="email"
                              placeholder="you@example.com"
                              autoComplete="email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company (optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your business name"
                              autoComplete="organization"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message *</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={6}
                              placeholder="How can we help?"
                              className="resize-y"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full sm:w-auto"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting ? "Sending…" : "Send message"}
                    </Button>
                  </form>
                </Form>
              </div>
            )}
          </div>

          {/* Alternative channels */}
          <aside className="space-y-6">
            <div>
              <h2 className="font-display text-lg font-bold text-ink-strong">
                Other ways to reach us
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Prefer not to use the form? These channels reach the same team.
              </p>
            </div>

            {channels.map((channel) => (
              <div
                key={channel.title}
                className="rounded-xl border border-border bg-card p-5 shadow-soft"
              >
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-dark">
                    <channel.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-bold text-ink-strong">
                      {channel.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {channel.description}
                    </p>
                    <a
                      href={channel.href}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-dark underline-offset-4 hover:underline"
                    >
                      {channel.cta}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </div>
            ))}

            <div className="rounded-xl bg-surface-subtle p-5">
              <h3 className="font-display text-base font-bold text-ink-strong">
                Looking for something specific?
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link
                    to="/resources"
                    className="text-primary-dark underline-offset-4 hover:underline"
                  >
                    Founder resources &amp; guides
                  </Link>
                </li>
                <li>
                  <Link
                    to="/funding"
                    className="text-primary-dark underline-offset-4 hover:underline"
                  >
                    The Funding Radar
                  </Link>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
};

export default Contact;

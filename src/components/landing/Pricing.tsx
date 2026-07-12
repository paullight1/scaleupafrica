import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Star, ArrowRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

const features = [
  "The Funding Radar (weekly curated grants and opportunities)",
  "Peer Circles access across the continent",
  "Eligibility to apply to the Accelerator Program",
  "Exclusive member resources and playbooks",
  "Pan-African founder network",
  "Direct email support",
];

const countries = [
  { code: "NG", name: "Nigeria", currency: "₦", annualPrice: 95000 },
  { code: "GH", name: "Ghana", currency: "₵", annualPrice: 1800 },
  { code: "KE", name: "Kenya", currency: "KSh", annualPrice: 26000 },
  { code: "ZA", name: "South Africa", currency: "R", annualPrice: 3800 },
  { code: "US", name: "United States", currency: "$", annualPrice: 200 },
  { code: "GB", name: "United Kingdom", currency: "£", annualPrice: 160 },
];

const Pricing = () => {
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);

  const handleCountryChange = (countryCode: string) => {
    const country = countries.find((c) => c.code === countryCode);
    if (country) setSelectedCountry(country);
  };

  const formatPrice = (price: number) => price.toLocaleString();

  return (
    <section id="pricing" className="bg-secondary py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="mb-4 inline-block font-semibold uppercase tracking-wider text-gold-dark">
            Membership
          </span>
          <h2 className="mb-6 font-serif text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
            Invest in Your <span className="text-forest">Growth Journey</span>
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            One annual membership, complete access. Simple, transparent, built for
            African founders ready to scale.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <span className="text-sm text-muted-foreground">Select your country:</span>
            <Select value={selectedCountry.code} onValueChange={handleCountryChange}>
              <SelectTrigger className="w-[200px] bg-card">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="bg-card">
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name} ({country.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        <div className="mx-auto mt-16 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl border-2 border-gold bg-card p-8 shadow-gold lg:p-10"
          >
            <div className="absolute right-0 top-0">
              <div className="flex items-center gap-1 rounded-bl-2xl bg-gold px-4 py-2 text-sm font-semibold text-forest-dark">
                <Star className="h-4 w-4 fill-current" />
                Annual Membership
              </div>
            </div>

            <div className="mb-8 mt-6">
              <h3 className="mb-2 font-serif text-2xl font-bold text-foreground">
                The Collective
              </h3>
              <p className="text-muted-foreground">
                Full-year access to funding intelligence, community, and Accelerator
                eligibility.
              </p>
            </div>

            <div className="mb-8 flex items-baseline gap-2">
              <span className="font-serif text-5xl font-bold text-foreground">
                {selectedCountry.currency}{formatPrice(selectedCountry.annualPrice)}
              </span>
              <span className="text-lg text-muted-foreground">/year</span>
            </div>

            <Button variant="gold" size="lg" className="mb-8 w-full">
              Join the Collective
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <ul className="space-y-4">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-forest" />
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mx-auto mt-12 max-w-xl text-center text-sm text-muted-foreground"
        >
          Immediate access to all features on join. Cancel anytime, no questions asked.
        </motion.p>
      </div>
    </section>
  );
};

export default Pricing;

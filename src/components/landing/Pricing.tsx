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
  "The Funding Radar (Weekly curated grants & opportunities)",
  "Sector-specific Peer Circles access",
  "Monthly Mastery Coaching sessions (live + recorded)",
  "Exclusive member resources & playbooks",
  "Pan-African founder network",
  "Direct email support",
];

const countries = [
  { code: "NG", name: "Nigeria", currency: "₦", monthlyPrice: 9500, annualPrice: 95000 },
  { code: "GH", name: "Ghana", currency: "₵", monthlyPrice: 180, annualPrice: 1800 },
  { code: "KE", name: "Kenya", currency: "KSh", monthlyPrice: 2600, annualPrice: 26000 },
  { code: "ZA", name: "South Africa", currency: "R", monthlyPrice: 380, annualPrice: 3800 },
  { code: "US", name: "United States", currency: "$", monthlyPrice: 20, annualPrice: 200 },
  { code: "GB", name: "United Kingdom", currency: "£", monthlyPrice: 16, annualPrice: 160 },
];

const Pricing = () => {
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);

  const handleCountryChange = (countryCode: string) => {
    const country = countries.find((c) => c.code === countryCode);
    if (country) {
      setSelectedCountry(country);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString();
  };

  const plans = [
    {
      name: "Monthly",
      price: `${selectedCountry.currency}${formatPrice(selectedCountry.monthlyPrice)}`,
      period: "/month",
      description: "Start scaling today with flexible month-to-month access.",
      popular: true,
      cta: "Start Monthly",
    },
    {
      name: "Annual",
      price: `${selectedCountry.currency}${formatPrice(selectedCountry.annualPrice)}`,
      period: "/year",
      description: "Best value—get 2 months free with annual commitment.",
      popular: false,
      cta: "Join Annually",
      savings: "Save 2 months",
    },
  ];

  return (
    <section id="pricing" className="bg-secondary py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="mb-4 inline-block font-semibold uppercase tracking-wider text-gold-dark">
            Membership Plans
          </span>
          <h2 className="mb-6 font-serif text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
            Invest in Your <span className="text-forest">Growth Journey</span>
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            One membership, complete access. Choose the plan that works for your business.
          </p>

          {/* Country Selector */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className="text-sm text-muted-foreground">Select your country:</span>
            <Select
              value={selectedCountry.code}
              onValueChange={handleCountryChange}
            >
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

        {/* Pricing Cards */}
        <div className="mx-auto mt-16 grid max-w-4xl gap-8 lg:grid-cols-2">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className={`relative overflow-hidden rounded-3xl border-2 p-8 transition-all duration-300 lg:p-10 ${
                plan.popular
                  ? "border-gold bg-card shadow-gold"
                  : "border-border bg-card shadow-soft hover:border-forest/30 hover:shadow-medium"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute right-0 top-0">
                  <div className="flex items-center gap-1 rounded-bl-2xl bg-gold px-4 py-2 text-sm font-semibold text-forest-dark">
                    <Star className="h-4 w-4 fill-current" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-8">
                <h3 className="mb-2 font-serif text-2xl font-bold text-foreground">
                  {plan.name}
                </h3>
                <p className="text-muted-foreground">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-8 flex items-baseline gap-2">
                <span className="font-serif text-5xl font-bold text-foreground">
                  {plan.price}
                </span>
                <span className="text-lg text-muted-foreground">{plan.period}</span>
                {plan.savings && (
                  <span className="ml-2 rounded-full bg-forest/10 px-3 py-1 text-sm font-semibold text-forest">
                    {plan.savings}
                  </span>
                )}
              </div>

              {/* CTA Button */}
              <Button
                variant={plan.popular ? "gold" : "default"}
                size="lg"
                className="mb-8 w-full"
              >
                {plan.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              {/* Features */}
              <ul className="space-y-4">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-forest" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Money Back Note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mx-auto mt-12 max-w-xl text-center text-sm text-muted-foreground"
        >
          All memberships include immediate access to all features. 
          Cancel anytime—no questions asked.
        </motion.p>
      </div>
    </section>
  );
};

export default Pricing;

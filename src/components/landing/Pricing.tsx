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
  "The Funding Radar (monthly curated grants and opportunities)",
  "WhatsApp Community: Pan-African SME directory",
  "Eligibility to apply to the Accelerator Program",
  "Exclusive member resources and playbooks",
  "Pan-African founder network",
];

// Annual membership priced at ~US$200 equivalent, with a local rate for Nigeria (base).
const countries = [
  // Africa
  { code: "NG", name: "Nigeria", currency: "₦", annualPrice: 95000 },
  { code: "DZ", name: "Algeria", currency: "DA", annualPrice: 27000 },
  { code: "AO", name: "Angola", currency: "Kz", annualPrice: 180000 },
  { code: "BJ", name: "Benin", currency: "CFA", annualPrice: 120000 },
  { code: "BW", name: "Botswana", currency: "P", annualPrice: 2700 },
  { code: "BF", name: "Burkina Faso", currency: "CFA", annualPrice: 120000 },
  { code: "BI", name: "Burundi", currency: "FBu", annualPrice: 570000 },
  { code: "CV", name: "Cabo Verde", currency: "$", annualPrice: 20000 },
  { code: "CM", name: "Cameroon", currency: "CFA", annualPrice: 120000 },
  { code: "CF", name: "Central African Republic", currency: "CFA", annualPrice: 120000 },
  { code: "TD", name: "Chad", currency: "CFA", annualPrice: 120000 },
  { code: "KM", name: "Comoros", currency: "CF", annualPrice: 90000 },
  { code: "CG", name: "Congo (Brazzaville)", currency: "CFA", annualPrice: 120000 },
  { code: "CD", name: "Congo (DRC)", currency: "FC", annualPrice: 550000 },
  { code: "CI", name: "Côte d'Ivoire", currency: "CFA", annualPrice: 120000 },
  { code: "DJ", name: "Djibouti", currency: "Fdj", annualPrice: 35000 },
  { code: "EG", name: "Egypt", currency: "E£", annualPrice: 9600 },
  { code: "GQ", name: "Equatorial Guinea", currency: "CFA", annualPrice: 120000 },
  { code: "ER", name: "Eritrea", currency: "Nfk", annualPrice: 3000 },
  { code: "SZ", name: "Eswatini", currency: "E", annualPrice: 3800 },
  { code: "ET", name: "Ethiopia", currency: "Br", annualPrice: 24000 },
  { code: "GA", name: "Gabon", currency: "CFA", annualPrice: 120000 },
  { code: "GM", name: "Gambia", currency: "D", annualPrice: 14000 },
  { code: "GH", name: "Ghana", currency: "₵", annualPrice: 1800 },
  { code: "GN", name: "Guinea", currency: "FG", annualPrice: 1700000 },
  { code: "GW", name: "Guinea-Bissau", currency: "CFA", annualPrice: 120000 },
  { code: "KE", name: "Kenya", currency: "KSh", annualPrice: 26000 },
  { code: "LS", name: "Lesotho", currency: "L", annualPrice: 3800 },
  { code: "LR", name: "Liberia", currency: "L$", annualPrice: 38000 },
  { code: "LY", name: "Libya", currency: "LD", annualPrice: 970 },
  { code: "MG", name: "Madagascar", currency: "Ar", annualPrice: 900000 },
  { code: "MW", name: "Malawi", currency: "MK", annualPrice: 350000 },
  { code: "ML", name: "Mali", currency: "CFA", annualPrice: 120000 },
  { code: "MR", name: "Mauritania", currency: "UM", annualPrice: 8000 },
  { code: "MU", name: "Mauritius", currency: "₨", annualPrice: 9000 },
  { code: "MA", name: "Morocco", currency: "MAD", annualPrice: 2000 },
  { code: "MZ", name: "Mozambique", currency: "MT", annualPrice: 13000 },
  { code: "NA", name: "Namibia", currency: "N$", annualPrice: 3800 },
  { code: "NE", name: "Niger", currency: "CFA", annualPrice: 120000 },
  { code: "RW", name: "Rwanda", currency: "RF", annualPrice: 270000 },
  { code: "ST", name: "São Tomé and Príncipe", currency: "Db", annualPrice: 4500 },
  { code: "SN", name: "Senegal", currency: "CFA", annualPrice: 120000 },
  { code: "SC", name: "Seychelles", currency: "SR", annualPrice: 2800 },
  { code: "SL", name: "Sierra Leone", currency: "Le", annualPrice: 4500 },
  { code: "SO", name: "Somalia", currency: "Sh", annualPrice: 115000 },
  { code: "ZA", name: "South Africa", currency: "R", annualPrice: 3800 },
  { code: "SS", name: "South Sudan", currency: "SSP", annualPrice: 900000 },
  { code: "SD", name: "Sudan", currency: "SDG", annualPrice: 120000 },
  { code: "TZ", name: "Tanzania", currency: "TSh", annualPrice: 520000 },
  { code: "TG", name: "Togo", currency: "CFA", annualPrice: 120000 },
  { code: "TN", name: "Tunisia", currency: "DT", annualPrice: 620 },
  { code: "UG", name: "Uganda", currency: "USh", annualPrice: 750000 },
  { code: "ZM", name: "Zambia", currency: "ZK", annualPrice: 5200 },
  { code: "ZW", name: "Zimbabwe", currency: "US$", annualPrice: 200 },
  // Rest of the world
  { code: "US", name: "United States", currency: "$", annualPrice: 200 },
  { code: "GB", name: "United Kingdom", currency: "£", annualPrice: 160 },
  { code: "EU", name: "Eurozone", currency: "€", annualPrice: 185 },
  { code: "CA", name: "Canada", currency: "C$", annualPrice: 275 },
  { code: "AU", name: "Australia", currency: "A$", annualPrice: 300 },
  { code: "NZ", name: "New Zealand", currency: "NZ$", annualPrice: 330 },
  { code: "CH", name: "Switzerland", currency: "CHF", annualPrice: 175 },
  { code: "NO", name: "Norway", currency: "kr", annualPrice: 2100 },
  { code: "SE", name: "Sweden", currency: "kr", annualPrice: 2100 },
  { code: "DK", name: "Denmark", currency: "kr", annualPrice: 1380 },
  { code: "AE", name: "United Arab Emirates", currency: "AED", annualPrice: 735 },
  { code: "SA", name: "Saudi Arabia", currency: "SR", annualPrice: 750 },
  { code: "QA", name: "Qatar", currency: "QR", annualPrice: 730 },
  { code: "IL", name: "Israel", currency: "₪", annualPrice: 730 },
  { code: "TR", name: "Türkiye", currency: "₺", annualPrice: 7000 },
  { code: "IN", name: "India", currency: "₹", annualPrice: 16800 },
  { code: "PK", name: "Pakistan", currency: "₨", annualPrice: 55000 },
  { code: "BD", name: "Bangladesh", currency: "৳", annualPrice: 24000 },
  { code: "CN", name: "China", currency: "¥", annualPrice: 1450 },
  { code: "HK", name: "Hong Kong", currency: "HK$", annualPrice: 1560 },
  { code: "SG", name: "Singapore", currency: "S$", annualPrice: 270 },
  { code: "MY", name: "Malaysia", currency: "RM", annualPrice: 940 },
  { code: "ID", name: "Indonesia", currency: "Rp", annualPrice: 3200000 },
  { code: "PH", name: "Philippines", currency: "₱", annualPrice: 11500 },
  { code: "TH", name: "Thailand", currency: "฿", annualPrice: 7200 },
  { code: "VN", name: "Vietnam", currency: "₫", annualPrice: 5000000 },
  { code: "JP", name: "Japan", currency: "¥", annualPrice: 30000 },
  { code: "KR", name: "South Korea", currency: "₩", annualPrice: 275000 },
  { code: "BR", name: "Brazil", currency: "R$", annualPrice: 1100 },
  { code: "MX", name: "Mexico", currency: "MX$", annualPrice: 3800 },
  { code: "AR", name: "Argentina", currency: "AR$", annualPrice: 200000 },
  { code: "CL", name: "Chile", currency: "CLP", annualPrice: 190000 },
  { code: "CO", name: "Colombia", currency: "COL$", annualPrice: 820000 },
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

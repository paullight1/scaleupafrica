import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import Solution from "@/components/landing/Solution";
import Pricing from "@/components/landing/Pricing";
import Disclaimer from "@/components/landing/Disclaimer";
import FAQ from "@/components/landing/FAQ";

const Index = () => {
  return (
    <div className="overflow-x-hidden">
      <Hero />
      <section id="problem">
        <Problem />
      </section>
      <section id="solution">
        <Solution />
      </section>
      <Disclaimer />
      <Pricing />
      <section id="faq">
        <FAQ />
      </section>
    </div>
  );
};

export default Index;

import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import Solution from "@/components/landing/Solution";
import Industries from "@/components/landing/Industries";
import Pricing from "@/components/landing/Pricing";
import Disclaimer from "@/components/landing/Disclaimer";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <main className="overflow-x-hidden">
      <Header />
      <Hero />
      <section id="problem">
        <Problem />
      </section>
      <section id="solution">
        <Solution />
      </section>
      <section id="industries">
        <Industries />
      </section>
      <Pricing />
      <Disclaimer />
      <section id="faq">
        <FAQ />
      </section>
      <Footer />
    </main>
  );
};

export default Index;
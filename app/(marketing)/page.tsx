import { infos } from "@/config/landing";
import BentoGrid from "@/components/sections/bentogrid";
import Features from "@/components/sections/features";
import HeroLanding from "@/components/sections/hero-landing";
import InfoLanding from "@/components/sections/info-landing";
import PreviewLanding from "@/components/sections/preview-landing";
import ComparisonSection from "@/components/sections/comparison-section";

export default function IndexPage() {
  return (
    <>
      <HeroLanding />
      <PreviewLanding />
      <BentoGrid />
      <InfoLanding data={infos[0]} reverse={true} />
      <Features />
      <ComparisonSection />
    </>
  );
}


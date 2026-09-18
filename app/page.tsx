import Coverage from "@/components/landing/Coverage";
import Faq from "@/components/landing/Faq";
import Features from "@/components/landing/Features";
import FinalCta from "@/components/landing/FinalCta";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import ReportPreview from "@/components/landing/ReportPreview";
import Transparency from "@/components/landing/Transparency";
import { PROGRAMS } from "@/data/programs";

export default function Home() {
  // 數字直接由資料檔計算，新增校系後首頁會自動更新，不會與實際涵蓋範圍脫節
  const programCount = PROGRAMS.length;
  const schoolCount = new Set(PROGRAMS.map((p) => p.school)).size;

  return (
    <>
      <Hero programCount={programCount} schoolCount={schoolCount} />
      <Features programCount={programCount} />
      <HowItWorks />
      <ReportPreview />
      <Coverage />
      <Transparency />
      <Faq />
      <FinalCta />
    </>
  );
}

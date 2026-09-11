"use client";

import SectionLabel from "@/app/components/dashboard/SectionLabel";
import {
  CausalAnalysis,
  JudgmentPanel,
  TopEvents,
} from "@/app/components/btc/DecisionPanels";
import type {
  CausalData,
  JudgmentState,
  NewsItem,
} from "@/app/types/btc-dashboard";
import type { Dispatch, SetStateAction } from "react";

interface DecisionSectionProps {
  causal: CausalData | null;
  judgment: JudgmentState;
  news: NewsItem[];
  setJudgment: Dispatch<SetStateAction<JudgmentState>>;
}

export default function DecisionSection({
  causal,
  judgment,
  news,
  setJudgment,
}: DecisionSectionProps) {
  return (
    <section>
      <SectionLabel
        numeral="II–IV"
        title="Events · causal · judgment"
        subtitle="Read from left. Decide on the right."
      />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-3">
          <TopEvents items={news} />
        </div>
        <div className="lg:col-span-5">
          <CausalAnalysis data={causal} />
        </div>
        <div className="lg:col-span-4">
          <JudgmentPanel state={judgment} setState={setJudgment} />
        </div>
      </div>
    </section>
  );
}

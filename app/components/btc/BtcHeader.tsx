"use client";

import { Circle } from "lucide-react";
import { NavLinks } from "@/app/components/DashboardNav";
import LiveClock from "@/app/components/dashboard/LiveClock";

const Header = ({
  price,
  change24h,
  onRefresh,
  refreshing,
}: {
  price: string;
  change24h: string;
  onRefresh: () => void;
  refreshing: boolean;
}) => (
  <header className="hairline-b">
    <div className="max-w-[1440px] mx-auto px-8 py-5 flex items-center justify-between">
      <div className="flex items-baseline gap-6">
        <h1 className="font-display text-paper text-[30px] leading-none tracking-tight">BTC<span className="font-display-italic text-amber-sand"> · </span><span className="font-display-italic">Decision</span> Desk</h1>
        <span className="caps-sm text-faint hidden md:inline">AI organizes · humans decide</span>
      </div>
      <div className="flex items-center gap-6">
        <nav className="flex items-center gap-1">
          <NavLinks current="btc" />
        </nav>
        <div className="text-right">
          <div className="caps-sm text-faint">Spot</div>
          <div className="font-mono-data text-paper text-[15px]">
            {price}{" "}
            <span className={`text-[12px] ${(change24h ?? "+").startsWith("+") ? "text-neutral-sage" : "text-alert-extreme"}`}>
              {change24h}
            </span>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <div className="caps-sm text-faint">UTC</div>
          <div className="font-mono-data text-paper-2 text-[12px]">
            <LiveClock utc includeDate />
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="caps-sm text-faint hover:text-paper transition-colors disabled:opacity-40"
        >
          {refreshing ? "refreshing…" : "↺ refresh"}
        </button>
        <div className="flex items-center gap-1.5 pl-4 border-l hairline">
          <Circle size={7} fill="#8DA078" stroke="none" className="pulse-dot" />
          <span className="caps-sm text-neutral-sage">Live</span>
        </div>
      </div>
    </div>
  </header>
);

export default Header;

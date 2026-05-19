"use client";

import { Check } from "lucide-react";
import { COUNTRIES, type CountryKey } from "@/constants/countries";

type RegionDropdownProps = {
  selected: CountryKey | null;
  onSelect: (key: CountryKey) => void;
};

export function RegionDropdown({ selected, onSelect }: RegionDropdownProps) {
  return (
    <div className="bg-white rounded-xl border border-black/[0.09] shadow-lg shadow-black/[0.06] overflow-hidden">
      <div className="px-3 pt-3 pb-2 border-b border-black/[0.06]">
        <p className="text-[10px] font-medium uppercase tracking-widest text-[#999]">
          Select Region
        </p>
      </div>
      <div className="px-1.5 py-1.5 space-y-0.5">
        {(Object.keys(COUNTRIES) as CountryKey[]).map((key) => {
          const { code, label, color } = COUNTRIES[key];
          const isActive = selected === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={`w-full flex items-center justify-between px-2 py-2 rounded-lg transition-all duration-100 text-left ${
                isActive
                  ? "bg-[#E1F5EE]/80 ring-1 ring-inset ring-[#5DCAA5]/20"
                  : "hover:bg-[#f7f7f5]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`inline-flex items-center justify-center w-9 h-[22px] rounded-md text-[10px] font-bold tracking-wider flex-shrink-0 ${color}`}
                >
                  {code}
                </span>
                <div className="flex flex-col items-start gap-0.5">
                  <span
                    className={`text-[11px] font-semibold leading-none ${isActive ? "text-[#0F6E56]" : "text-[#111]"}`}
                  >
                    {code}
                  </span>
                  <span className="text-[10px] text-[#999] leading-none">
                    {label}
                  </span>
                </div>
              </div>
              {isActive && (
                <Check className="h-3.5 w-3.5 text-[#1D9E75] flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

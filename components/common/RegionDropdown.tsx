"use client";

import { Check } from "lucide-react";
import { COUNTRIES, type CountryKey } from "@/constants/countries";

type RegionDropdownProps = {
  selected: CountryKey | null;
  onSelect: (key: CountryKey) => void;
};

export function RegionDropdown({ selected, onSelect }: RegionDropdownProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-xl shadow-black/[0.06] overflow-hidden">
      <div className="px-3 pt-3 pb-2 border-b border-gray-100">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
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
                  ? "bg-blue-50/80 ring-1 ring-inset ring-blue-100"
                  : "hover:bg-gray-50"
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
                    className={`text-[11px] font-semibold leading-none ${isActive ? "text-blue-700" : "text-gray-800"}`}
                  >
                    {code}
                  </span>
                  <span className="text-[10px] text-gray-400 leading-none">
                    {label}
                  </span>
                </div>
              </div>
              {isActive && (
                <Check className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

import React from 'react';
import { Home } from 'lucide-react';
import { HouseholdProfile } from '@/shared/nirvaatTypes';

interface Props {
  profile: HouseholdProfile;
  onChangeProfile: (next: HouseholdProfile) => void;
  onFilterModeChange: (mode: 'none' | 'diy_cr_box' | 'hepa') => void;
}

export const DwellingForm: React.FC<Props> = ({ profile, onChangeProfile, onFilterModeChange }) => {
  return (
    <section className="aurora-surface rounded-2xl p-5 space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Home className="h-4 w-4 text-teal-700" aria-hidden="true" />
          <span>Home Setup &amp; Constraints</span>
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          Changes immediately update the live deterministic plan on the Today tab.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 text-xs">
        <label className="space-y-1">
          <span className="font-medium text-slate-700">Dwelling type</span>
          <select
            value={profile.home.type}
            onChange={(e) =>
              onChangeProfile({
                ...profile,
                home: { ...profile.home, type: e.target.value as HouseholdProfile['home']['type'] },
              })
            }
            className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-slate-900"
          >
            <option value="apartment">Apartment / Flat</option>
            <option value="independent_house">Independent House</option>
            <option value="single_room">Single-Room Dwelling</option>
            <option value="shared_flat">Shared Flat</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="font-medium text-slate-700">Size band</span>
          <select
            value={profile.home.size_band}
            onChange={(e) =>
              onChangeProfile({
                ...profile,
                home: { ...profile.home, size_band: e.target.value as HouseholdProfile['home']['size_band'] },
              })
            }
            className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-slate-900"
          >
            <option value="small_under_40m2">Small (&lt; 40 m²)</option>
            <option value="medium_40_85m2">Medium (40–85 m²)</option>
            <option value="large_over_85m2">Large (&gt; 85 m²)</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="font-medium text-slate-700">Cooking fuel</span>
          <select
            value={profile.home.cooking_fuel}
            onChange={(e) =>
              onChangeProfile({
                ...profile,
                home: { ...profile.home, cooking_fuel: e.target.value as HouseholdProfile['home']['cooking_fuel'] },
              })
            }
            className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-slate-900"
          >
            <option value="lpg_gas">LPG Cylinder</option>
            <option value="piped_gas">Piped Gas</option>
            <option value="induction_electric">Induction / Electric</option>
            <option value="biomass_solid">Solid Fuel / Biomass</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="font-medium text-slate-700">Budget band</span>
          <select
            value={profile.constraints.budget_band}
            onChange={(e) =>
              onChangeProfile({
                ...profile,
                constraints: {
                  ...profile.constraints,
                  budget_band: e.target.value as HouseholdProfile['constraints']['budget_band'],
                },
              })
            }
            className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-slate-900"
          >
            <option value="free_only">Free actions only</option>
            <option value="low_cost">Low-cost (DIY / tape / masks)</option>
            <option value="moderate">Moderate (Purifier feasible)</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="font-medium text-slate-700">Air cleaner at home</span>
          <select
            value={profile.home.purifier.type ?? (profile.home.purifier.has ? 'hepa' : 'none')}
            onChange={(e) => {
              const val = e.target.value as 'none' | 'hepa' | 'diy_cr_box';
              onFilterModeChange(val);
              onChangeProfile({
                ...profile,
                home: {
                  ...profile.home,
                  purifier: {
                    has: val !== 'none',
                    type: val,
                    cadr_m3_hr: val === 'hepa' ? 320 : val === 'diy_cr_box' ? 280 : 0,
                  },
                },
              });
            }}
            className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-slate-900"
          >
            <option value="none">None</option>
            <option value="diy_cr_box">DIY Box Fan + MERV-13</option>
            <option value="hepa">Commercial HEPA Purifier</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="font-medium text-slate-700">Commute mode</span>
          <select
            value={profile.commute.mode}
            onChange={(e) =>
              onChangeProfile({
                ...profile,
                commute: { ...profile.commute, mode: e.target.value as HouseholdProfile['commute']['mode'] },
              })
            }
            className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-slate-900"
          >
            <option value="walking">Walking</option>
            <option value="two_wheeler">Two-wheeler / Scooter</option>
            <option value="public_transit">Bus / Metro</option>
            <option value="car">Car (closed windows)</option>
            <option value="work_from_home">Stay at Home</option>
          </select>
        </label>
      </div>
    </section>
  );
};

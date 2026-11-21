export type ActionId =
  | 'time_shift_commute'
  | 'close_windows_inversion'
  | 'ventilate_afternoon_window'
  | 'seal_gaps'
  | 'run_purifier_presleep'
  | 'diy_filter'
  | 'n95_on_commute'
  | 'cook_with_hood_window'
  | 'avoid_incense';

export interface ActionDefinition {
  id: ActionId;
  title: string;
  lever: 'timing' | 'place_route' | 'protection' | 'source_control';
  cost: 'free' | 'low' | 'medium' | 'high';
  evidence: 'strong' | 'moderate' | 'emerging';
  description: string;
}

export const ACTION_LIBRARY: Record<ActionId, ActionDefinition> = {
  time_shift_commute: {
    id: 'time_shift_commute',
    title: 'Shift outdoor trip to afternoon window',
    lever: 'timing',
    cost: 'free',
    evidence: 'moderate',
    description: 'Moves outdoor commute/errand from morning inversion peak to cleanest afternoon hours.',
  },
  close_windows_inversion: {
    id: 'close_windows_inversion',
    title: 'Close exterior windows overnight & mornings',
    lever: 'protection',
    cost: 'free',
    evidence: 'strong',
    description: 'Prevents high night/morning inversion plumes from flushing straight indoors.',
  },
  ventilate_afternoon_window: {
    id: 'ventilate_afternoon_window',
    title: 'Flush indoor air during afternoon dip',
    lever: 'timing',
    cost: 'free',
    evidence: 'moderate',
    description: 'Opens windows briefly for 20–30 minutes only during the lowest outdoor PM2.5 afternoon hours.',
  },
  seal_gaps: {
    id: 'seal_gaps',
    title: 'Seal bedroom door & window gaps',
    lever: 'protection',
    cost: 'free',
    evidence: 'moderate',
    description: 'Uses rolled damp towels or low-cost weatherstripping to halve drafty infiltration λ.',
  },
  run_purifier_presleep: {
    id: 'run_purifier_presleep',
    title: 'Run HEPA purifier pre-sleep & overnight',
    lever: 'protection',
    cost: 'low',
    evidence: 'strong',
    description: 'Starts bedroom HEPA 1 hour before bedtime with the door closed.',
  },
  diy_filter: {
    id: 'diy_filter',
    title: 'Run DIY MERV-13 box-fan filter overnight',
    lever: 'protection',
    cost: 'low',
    evidence: 'strong',
    description: 'Uses a taped MERV-13 furnace filter on a box fan in the closed sleeping room.',
  },
  n95_on_commute: {
    id: 'n95_on_commute',
    title: 'Wear fit-checked N95/KF94 outdoors (ages 2+)',
    lever: 'protection',
    cost: 'low',
    evidence: 'strong',
    description: 'Pinches nose wire and seals cheek gaps during outdoor commute/work hours.',
  },
  cook_with_hood_window: {
    id: 'cook_with_hood_window',
    title: 'Close kitchen door, cover pans & exhaust smoke',
    lever: 'source_control',
    cost: 'free',
    evidence: 'strong',
    description: 'Isolates and vents cooking PM2.5 plumes away from sleeping/living spaces.',
  },
  avoid_incense: {
    id: 'avoid_incense',
    title: 'Pause indoor incense, dhoop & mosquito coils',
    lever: 'source_control',
    cost: 'free',
    evidence: 'strong',
    description: 'Eliminates high indoor submicron combustion plumes in closed winter rooms.',
  },
};

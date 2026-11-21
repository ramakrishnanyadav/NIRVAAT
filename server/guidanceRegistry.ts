import { RegionConfig, GuidanceEntry } from '@nirvaat/contracts';

export const PRESET_REGIONS: RegionConfig[] = [
  {
    city: 'Delhi NCR',
    neighborhood: 'Anand Vihar · East Grid',
    grid_id: '28.65_77.31',
    latitude: 28.65,
    longitude: 77.31,
    emergency_number: '112',
    official_source: 'CPCB Sameer / SAFAR India',
    active_policy: 'GRAP Stage IV Winter Emergency Measures',
  },
  {
    city: 'Delhi NCR',
    neighborhood: 'RK Puram · South Grid',
    grid_id: '28.56_77.18',
    latitude: 28.56,
    longitude: 77.18,
    emergency_number: '112',
    official_source: 'CPCB Sameer / SAFAR India',
    active_policy: 'GRAP Stage IV Winter Emergency Measures',
  },
  {
    city: 'Lahore',
    neighborhood: 'Gulberg · Central Grid',
    grid_id: '31.52_74.35',
    latitude: 31.52,
    longitude: 74.35,
    emergency_number: '1122',
    official_source: 'Punjab EPA Smog Monitoring',
    active_policy: 'Winter Smog School & Outdoor Restriction',
  },
  {
    city: 'Kathmandu',
    neighborhood: 'Lalitpur · Valley Basin',
    grid_id: '27.68_85.32',
    latitude: 27.68,
    longitude: 85.32,
    emergency_number: '102',
    official_source: 'Nepal DoE Air Quality Portal',
    active_policy: 'Morning Valley Inversion Advisory',
  },
  {
    city: 'Salt Lake City',
    neighborhood: 'Salt Lake Valley · UT',
    grid_id: '40.76_-111.89',
    latitude: 40.76,
    longitude: -111.89,
    emergency_number: '911',
    official_source: 'Utah DAQ Inversion Advisory',
    active_policy: 'Mandatory Winter Burning Restriction',
  },
];

export const GUIDANCE_LIBRARY: GuidanceEntry[] = [
  {
    id: 'guide_pediatric_under2',
    topic: 'infant_pediatric_safety',
    title: 'Infant Air Protection (Ages Under 2)',
    evidence: 'strong',
    summary:
      'Infants and children under age 2 must NEVER wear tight-fitting N95, KN95, or cloth masks due to suffocation risk and high respiratory resistance.',
    do_this: [
      'Prioritize clean indoor air in the sleeping room using HEPA or DIY MERV-13 air cleaning.',
      'Place a rolled damp towel along drafty bedroom door cracks to slow infiltration.',
      'Shift outdoor pram trips to afternoon dispersion hours (12:00–16:00) when outdoor PM2.5 dips.',
    ],
    avoid_this: [
      'Never place any mask or respirator over an infant’s mouth and nose.',
      'Avoid running ozone-generating air cleaners, ionizers, or incense/dhoop in baby rooms.',
    ],
    source: 'American Academy of Pediatrics (AAP) / WHO Air Quality and Children',
    sensitive_groups: ['infant_under_2', 'child_2_12'],
  },
  {
    id: 'guide_diy_cr_box',
    topic: 'low_cost_purification',
    title: 'DIY Corsi-Rosenthal Box Filtration for Renters & Low Budgets',
    evidence: 'strong',
    summary:
      'A 20-inch standard box fan securely taped to one or four MERV-13 furnace filters delivers 250–350 m³/h clean air delivery rate (CADR) at a fraction of commercial HEPA unit costs.',
    do_this: [
      'Use genuine MERV-13 rated pleats and seal all corner seams with duct tape or painter tape.',
      'Place in the center of the occupied room at least 0.5 m away from walls.',
    ],
    avoid_this: [
      'Do not use MERV-8 or fiberglass furnace filters, which fail to capture submicron PM2.5.',
      'Do not run on high speed if the motor becomes hot or vibrates excessively.',
    ],
    source: 'EPA Indoor Air Quality Research / Corsi et al. (2021)',
    sensitive_groups: ['all', 'renters', 'low_income'],
  },
  {
    id: 'guide_outdoor_workers',
    topic: 'outdoor_worker_safety',
    title: 'Outdoor Worker & Commuter Protection Within Job Constraints',
    evidence: 'moderate',
    summary:
      'Workers who cannot stay indoors can cut inhaled fine-particle dose by switching to lower-exertion pacing, avoiding high-traffic curb lanes, and wearing a tight-sealing N95/KN95.',
    do_this: [
      'Take rest breaks indoors or inside enclosed cabs/shops rather than roadside curbs.',
      'Shift physically heaviest lifting or brisk movement away from peak morning/evening traffic hours when schedule permits.',
    ],
    avoid_this: [
      'Do not advise outdoor workers to simply "stay home" without addressing shift realities.',
      'Avoid loose surgical masks for full-shift roadside exposure; replace damp or clogged N95s.',
    ],
    source: 'NIOSH / ILO Occupational Ambient PM2.5 Guidance',
    sensitive_groups: ['outdoor_worker', 'asthma', 'heart_disease'],
  },
  {
    id: 'guide_pregnancy_elderly',
    topic: 'pregnancy_elderly_cardiopulmonary',
    title: 'Protecting Pregnancy, Older Adults & Cardiopulmonary Conditions',
    evidence: 'strong',
    summary:
      'Fine particles (PM2.5) cross into the bloodstream and increase inflammatory stress during pregnancy and in adults with asthma, COPD, or cardiovascular disease.',
    do_this: [
      'Prioritize clean sleeping air (closed bedroom + HEPA or DIY filter) since 8–10 hours of overnight protection removes ~35–45% of daily total dose.',
      'Keep prescribed reliever inhalers or regular medications accessible and follow your clinician’s existing action plan without altering doses.',
    ],
    avoid_this: [
      'Never stop, start, or adjust prescribed medications based on air-quality alerts without a clinician.',
      'Do not delay emergency medical care if chest tightness, severe breathlessness, confusion, or unrelieved wheeze occurs.',
    ],
    source: 'AHA / ACOG / GOLD COPD Environmental Exposure Guidance',
    sensitive_groups: ['pregnancy', 'older_adult_65_plus', 'asthma', 'copd', 'heart_disease'],
  },
];

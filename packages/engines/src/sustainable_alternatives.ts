/**
 * Sustainable Alternatives Library
 * Systemic and household-level low-emission choices with direct community emissions impact,
 * personal exposure avoided, cost, evidence grade, and equity considerations.
 */

export interface SustainableAlternative {
  id: string;
  titleEn: string;
  titleHi: string;
  category: 'mobility' | 'cooking_energy' | 'waste_reduction' | 'work_lifestyle';
  descriptionEn: string;
  descriptionHi: string;
  personal_exposure_impact: string;
  community_emissions_reduction: string;
  cost: 'free' | 'low' | 'moderate';
  evidence_grade: 'strong' | 'moderate' | 'emerging';
  evidence_citation: string;
  equity_note: string;
  applicability: {
    dwelling_types?: string[];
    commute_modes?: string[];
    fuel_types?: string[];
  };
}

export const SUSTAINABLE_ALTERNATIVES: SustainableAlternative[] = [
  {
    id: 'public_transit_over_car',
    titleEn: 'Shift Commute to Metro, Bus or Shared Transit',
    titleHi: 'मेट्रो, बस या साझा परिवहन का उपयोग करें',
    category: 'mobility',
    descriptionEn: 'Replace single-occupancy private vehicle or motorcycle trips with electrified metro or CNG buses during severe smog peaks.',
    descriptionHi: 'गंभीर स्मॉग के दौरान निजी कार या मोटरसाइकिल की जगह मेट्रो या बस का उपयोग करें।',
    personal_exposure_impact: '-20% to -35% commute inhalation (air-filtered cabin vs roadside plume)',
    community_emissions_reduction: 'Cuts ~65% to 85% per-passenger-km tailpipe PM2.5 and NOx emissions',
    cost: 'low',
    evidence_grade: 'strong',
    evidence_citation: 'Goel & Guttikunda (2015), Atmospheric Environment; Delhi Metro Air-Quality Impact Studies',
    equity_note: 'Affordable for most commuters; requires reliable last-mile pedestrian footpaths and feeder connectivity.',
    applicability: {
      commute_modes: ['car', 'two_wheeler'],
    },
  },
  {
    id: 'wfh_inversion_peak',
    titleEn: 'Work from Home (WFH) on High-Inversion Days',
    titleHi: 'गंभीर प्रदूषण वाले दिनों में घर से काम (WFH) करें',
    category: 'work_lifestyle',
    descriptionEn: 'Negotiate or schedule remote work days during GRAP-IV or winter thermal inversion episodes to eliminate roadside transit exposure entirely.',
    descriptionHi: 'सर्दियों के इनवर्जन के दौरान सड़क यात्रा से बचने के लिए वर्क फ्रॉम होम चुनें।',
    personal_exposure_impact: '-30% to -50% daily dose (eliminates outdoor transit spike entirely)',
    community_emissions_reduction: 'Zero personal transport emissions; reduces arterial road congestion and idling plumes',
    cost: 'free',
    evidence_grade: 'strong',
    evidence_citation: 'CPCB GRAP Taskforce Technical Report; ICMR-PHFI Winter Smog Burden Analysis (2021)',
    equity_note: 'Readily accessible to desk and knowledge workers; inequitable for informal and outdoor workers who require government smog leave protections.',
    applicability: {
      commute_modes: ['car', 'two_wheeler', 'public_transit', 'walking'],
    },
  },
  {
    id: 'induction_electric_cooking',
    titleEn: 'Transition from Solid Biomass/LPG to Induction Cooking',
    titleHi: 'बायोमास/एलपीजी की जगह इंडक्शन कुकिंग अपनाएं',
    category: 'cooking_energy',
    descriptionEn: 'Use clean electric induction cooktops for boiling, tea, and stews to eliminate indoor combustion gases and particulate spikes.',
    descriptionHi: 'इनडोर धुएं और दहन को खत्म करने के लिए इलेक्ट्रिक इंडक्शन चूल्हे का उपयोग करें।',
    personal_exposure_impact: '-40% to -70% kitchen PM2.5 peak concentrations; avoids ultrafine carbon',
    community_emissions_reduction: 'Eliminates household indoor and localized chimney flue combustion emissions',
    cost: 'moderate',
    evidence_grade: 'strong',
    evidence_citation: 'WHO Indoor Air Quality Guidelines: Household Fuel Combustion (2014); Gordon et al., Lancet Resp Med',
    equity_note: 'Requires initial appliance capital (₹2,000–₹3,500) and reliable electricity tariffs; renters face kitchen electrical socket constraints.',
    applicability: {
      fuel_types: ['biomass_solid', 'lpg_gas', 'piped_gas'],
    },
  },
  {
    id: 'zero_waste_burning',
    titleEn: 'Zero Open Burning & Segregated Neighborhood Composting',
    titleHi: 'कचरा या पत्ते न जलाएं · खाद और सुरक्षित निपटान अपनाएं',
    category: 'waste_reduction',
    descriptionEn: 'Strictly prohibit burning garden leaves, plastic, or municipal waste in street corners; report neighborhood smoldering fires to municipal helplines (Sameer / 311).',
    descriptionHi: 'पत्ते, प्लास्टिक या कचरा खुले में न जलाएं; नगर निगम के समीर ऐप पर तुरंत रिपोर्ट करें।',
    personal_exposure_impact: 'Eliminates acute localized ground-level spikes exceeding 800 µg/m³ near dwellings',
    community_emissions_reduction: 'Prevents toxic dioxins, furans, black carbon, and polycyclic aromatic hydrocarbons (PAHs)',
    cost: 'free',
    evidence_grade: 'strong',
    evidence_citation: 'CPCB Guidelines on Municipal Solid Waste Burning (2020); Kumar et al., Nature Sustainability',
    equity_note: 'Crucial for street vendors, security guards, and low-income colonies where night heating fires are common; requires municipal supply of warm shelters and electric heaters.',
    applicability: {},
  },
  {
    id: 'carpooling_neighborhood',
    titleEn: 'RWA & School Shared Carpooling Circles',
    titleHi: 'स्कूल और पड़ोस के लिए साझा कारपूलिंग बनाएं',
    category: 'mobility',
    descriptionEn: 'Form verified parent carpools or neighborhood ride-sharing pools for school drops and office commutes to cut idling queues at gates.',
    descriptionHi: 'स्कूल छोड़ने और ऑफिस जाने के लिए पड़ोसियों के साथ मिलकर कारपूल बनाएं।',
    personal_exposure_impact: '-15% to -25% commute duration and localized exposure at school gates',
    community_emissions_reduction: 'Reduces up to 60% of cold-start idling vehicle congestion outside residential gates',
    cost: 'free',
    evidence_grade: 'moderate',
    evidence_citation: 'TERI Urban Transport Decarbonization Roadmap; CSE School Clean Air Assessment',
    equity_note: 'Frees up family time and lowers fuel costs; requires community trust and coordination across neighborhood RWAs.',
    applicability: {
      commute_modes: ['car', 'two_wheeler'],
    },
  },
];

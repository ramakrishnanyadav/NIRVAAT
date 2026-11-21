export type UiLang = 'en' | 'hi';

export interface UiStrings {
  brand: string;
  nav: {
    today: string;
    forecast: string;
    household: string;
    community: string;
    learn: string;
    audit: string;
    emergency: string;
  };
  actions: {
    newPlan: string;
    commandPalette: string;
    getPlan: string;
    generating: string;
    savePlan: string;
    saved: string;
    retrySave: string;
    urgentHelp: string;
  };
  today: {
    headline: string;
    subtitle: string;
    promptPlaceholder: string;
    quickScenariosLabel: string;
    situationHeading: string;
    planHeading: string;
    moreOptionsHeading: string;
    mythHeading: string;
    safetyHeading: string;
    emptyTitle: string;
    emptyBody: string;
    exposureBudgetTitle: string;
    withPlanLabel: string;
    withoutPlanLabel: string;
    freeLabel: string;
    howCalculated: string;
  };
  degradation: {
    tier_A: string;
    tier_B: string;
    tier_C: string;
    tier_D: string;
  };
  emergency: {
    title: string;
    subtitle: string;
    callNow: string;
    interimTitle: string;
    interimBody: string;
    redFlagsTitle: string;
    backToPlanner: string;
  };
}

export const STRINGS: Record<UiLang, UiStrings> = {
  en: {
    brand: 'NIRVAAT',
    nav: {
      today: 'Today',
      forecast: 'Forecast',
      household: 'Household',
      community: 'Community',
      learn: 'Learn',
      audit: 'Audit & Settings',
      emergency: 'Urgent Help',
    },
    actions: {
      newPlan: 'New Plan',
      commandPalette: 'Quick Jump',
      getPlan: 'Build Plan',
      generating: 'Checking live data & modeling impact…',
      savePlan: 'Save Plan',
      saved: 'Saved',
      retrySave: 'Retry Save',
      urgentHelp: 'Urgent Help',
    },
    today: {
      headline: 'Clearer air decisions for your household today',
      subtitle:
        'Live atmospheric data and your home setup turned into three practical, affordable steps—never medical guesswork or raw AQI noise.',
      promptPlaceholder:
        'Ask about today’s routine, school walk, opening windows tonight, cooking smoke, or outdoor shift…',
      quickScenariosLabel: 'Common winter smog decisions',
      situationHeading: 'Next 12 hours',
      planHeading: 'Your top actions',
      moreOptionsHeading: 'If you can do more',
      mythHeading: 'Evidence check',
      safetyHeading: 'Safety reminder',
      emptyTitle: 'Ready when you need a calm decision',
      emptyBody:
        'Choose a scenario above or type what your family is planning today. Every plan includes at least one free step and shows the estimated PM2.5 difference.',
      exposureBudgetTitle: 'Daily indoor-outdoor dose budget',
      withPlanLabel: 'With plan',
      withoutPlanLabel: 'Baseline',
      freeLabel: 'Free step',
      howCalculated: 'Inspect calculation',
    },
    degradation: {
      tier_A: 'Live data & quantified counterfactuals active',
      tier_B: 'Impact estimator unavailable — qualitative effect sizes shown',
      tier_C: 'General guidance, no live data — verify with local official portal',
      tier_D: 'Tools unavailable — safety-only guidance active',
    },
    emergency: {
      title: 'Urgent breathing or chest warning signs',
      subtitle:
        'Stop planning air-quality routines. Severe symptoms require immediate clinical evaluation.',
      callNow: 'Seek urgent medical care now',
      interimTitle: 'One safe step while waiting for help',
      interimBody:
        'Move calmly to the cleanest available indoor room (away from kitchen smoke or open traffic windows) and stay with the person.',
      redFlagsTitle: 'Call emergency services immediately for any of these signs',
      backToPlanner: 'Return to Planner',
    },
  },
  hi: {
    brand: 'निर्वात',
    nav: {
      today: 'आज की योजना',
      forecast: 'पूर्वानुमान',
      household: 'परिवार व घर',
      community: 'सामुदायिक सुरक्षा',
      learn: 'जानकारी',
      audit: 'ऑडिट व सेटिंग्स',
      emergency: 'आपात मदद',
    },
    actions: {
      newPlan: 'नई योजना',
      commandPalette: 'खोजें',
      getPlan: 'योजना बनाएं',
      generating: 'लाइव डेटा और प्रभाव की जांच हो रही है…',
      savePlan: 'सहेजें',
      saved: 'सहेजा गया',
      retrySave: 'पुनः सहेजें',
      urgentHelp: 'आपात मदद',
    },
    today: {
      headline: 'आज आपके परिवार के लिए साफ हवा के सही फैसले',
      subtitle:
        'लाइव वायु गुणवत्ता और आपके घर की स्थिति के आधार पर तीन सरल, किफायती कदम—बिना घबराहट या जटिल आंकड़ों के।',
      promptPlaceholder:
        'स्कूल जाने के समय, रात में खिड़कियां खोलने, रसोई के धुएं या बाहर काम के बारे में पूछें…',
      quickScenariosLabel: 'सर्दियों के स्मॉग से जुड़े आम सवाल',
      situationHeading: 'अगले 12 घंटे',
      planHeading: 'आज के मुख्य कदम',
      moreOptionsHeading: 'यदि आप और कर सकें',
      mythHeading: 'तथ्य जांच',
      safetyHeading: 'सुरक्षा नोट',
      emptyTitle: 'सही निर्णय के लिए तैयार',
      emptyBody:
        'ऊपर से कोई स्थिति चुनें या अपने परिवार की आज की योजना लिखें। हर योजना में कम से कम एक मुफ्त कदम शामिल होता है।',
      exposureBudgetTitle: 'दैनिक PM2.5 एक्सपोज़र अनुमान',
      withPlanLabel: 'योजना के साथ',
      withoutPlanLabel: 'बिना बदलाव',
      freeLabel: 'निःशुल्क कदम',
      howCalculated: 'गणना देखें',
    },
    degradation: {
      tier_A: 'लाइव डेटा और सटीक तुलना उपलब्ध',
      tier_B: 'प्रभाव मॉडल अनुपलब्ध — केवल गुणात्मक स्तर दिखाया गया है',
      tier_C: 'सामान्य मार्गदर्शन, लाइव डेटा नहीं — स्थानीय आधिकारिक पोर्टल देखें',
      tier_D: 'उपकरण अनुपलब्ध — केवल सुरक्षा मार्गदर्शन सक्रिय',
    },
    emergency: {
      title: 'तुरंत चिकित्सा सहायता के चेतावनी संकेत',
      subtitle:
        'गंभीर लक्षण होने पर वायु-गुणवत्ता योजना रोक दें। तुरंत डॉक्टर या आपातकालीन सेवा से संपर्क करें।',
      callNow: 'तुरंत आपातकालीन चिकित्सा सहायता लें',
      interimTitle: 'मदद आने तक एक सुरक्षित कदम',
      interimBody:
        'व्यक्ति को घर के सबसे साफ कमरे में ले जाएं (रसोई के धुएं और खुली सड़क की खिड़की से दूर) और उनके साथ रहें।',
      redFlagsTitle: 'इनमें से कोई भी लक्षण दिखने पर तुरंत कॉल करें',
      backToPlanner: 'योजना पर लौटें',
    },
  },
};

export const RED_FLAG_LIST = {
  en: [
    'Severe or worsening breathlessness or gasping for air',
    'Chest pain or tightness',
    'Blue or grey tint around lips or fingernails',
    'Fainting, extreme drowsiness, or sudden confusion',
    'Infant or toddler showing fast breathing, nostril flaring, or ribs pulling in',
    'Wheezing that does not settle after using their own prescribed reliever',
    'Coughing up blood',
  ],
  hi: [
    'सांस लेने में गंभीर या बढ़ती कठिनाई',
    'सीने में दर्द या जकड़न',
    'होंठों या नाखूनों का नीला या भूरा पड़ना',
    'बेहोशी, अत्यधिक सुस्ती या अचानक भ्रम',
    'शिशु या छोटे बच्चे में तेज सांस, नाक फूलना या पसलियां धंसना',
    'अपनी निर्धारित रिलीवर दवा लेने के बाद भी घरघराहट शांत न होना',
    'खांसी में खून आना',
  ],
};

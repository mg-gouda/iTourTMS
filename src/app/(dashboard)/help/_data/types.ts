export type HelpStep = {
  step: number;
  title: string;
  description: string;
};

export type HelpSection = {
  id: string;
  title: string;
  description: string;
  features: string[];
  steps?: HelpStep[];
  screenshot?: string;
};

export type HelpModule = {
  slug: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  overview: string;
  sections: HelpSection[];
};

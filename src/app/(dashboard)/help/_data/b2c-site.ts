import type { HelpModule } from "./types";

export const b2cSiteHelp: HelpModule = {
  slug: "b2c-site",
  name: "B2C Website",
  icon: "Globe",
  color: "cyan",
  description: "Public website CMS — branding, hero slides, pages, blog, FAQ, testimonials, and markup rules.",
  overview:
    "The B2C Website module is a full content management system (CMS) for your public-facing hotel booking website. You control the branding, homepage content, static pages, blog, FAQ, testimonials, and customer enquiry management — all from within the TMS dashboard. The website also includes a live hotel search and booking engine powered by your contracted rates.",
  sections: [
    {
      id: "branding",
      title: "Branding",
      description:
        "Customize the visual identity of your B2C website including the logo, color scheme, and typography.",
      features: [
        "Upload company logo (shown in header and footer)",
        "Set primary and secondary brand colors",
        "Choose font family for headings and body text",
        "Configure site title and tagline",
        "Set default market for geo-IP fallback",
        "Preview changes before publishing",
      ],
      steps: [
        { step: 1, title: "Open Branding", description: "Go to B2C Website → Content → Branding." },
        { step: 2, title: "Upload Logo", description: "Click the logo upload area and select your company logo (PNG or SVG recommended)." },
        { step: 3, title: "Set Colors", description: "Enter your brand's primary and secondary hex color codes." },
        { step: 4, title: "Save", description: "Click Save. Changes are visible on the B2C site immediately." },
      ],
    },
    {
      id: "hero-slides",
      title: "Hero Slides",
      description:
        "Manage the homepage hero carousel. Each slide has a background image, headline, subtitle, and call-to-action button.",
      features: [
        "Multiple slides with ordering control",
        "Per-slide image upload",
        "Headline and subtitle text",
        "CTA button label and destination URL",
        "Active/inactive toggle per slide",
        "Display order drag-and-drop",
      ],
      steps: [
        { step: 1, title: "Open Hero Slides", description: "Go to B2C Website → Content → Hero Slides." },
        { step: 2, title: "Add a Slide", description: "Click New Slide. Upload the background image, enter the headline, and set the CTA button text and link." },
        { step: 3, title: "Reorder", description: "Drag slides to change their display order on the carousel." },
        { step: 4, title: "Activate", description: "Toggle the Active switch to make a slide visible on the website." },
      ],
    },
    {
      id: "pages",
      title: "Static Pages",
      description:
        "Create and manage static content pages (About Us, Contact, Terms & Conditions, Privacy Policy, etc.).",
      features: [
        "Rich text page editor",
        "Custom URL slug per page",
        "SEO meta title and description",
        "Active/inactive status",
        "Page listed in site navigation automatically when active",
      ],
    },
    {
      id: "blog",
      title: "Blog",
      description:
        "Publish destination guides, travel tips, and news articles to attract organic traffic and engage visitors.",
      features: [
        "Article editor with rich text formatting",
        "Category tagging",
        "Featured image per article",
        "Publication date scheduling",
        "Author attribution",
        "SEO title and meta description",
        "Active/inactive publish control",
      ],
    },
    {
      id: "faq-testimonials",
      title: "FAQ & Testimonials",
      description:
        "Build trust with site visitors by maintaining a comprehensive FAQ section and showcasing customer testimonials.",
      features: [
        "FAQ entries with question, answer, and category",
        "Ordering control for FAQs",
        "Testimonials with customer name, rating, and photo",
        "Destination/hotel tag on testimonials",
        "Active/inactive toggle",
      ],
    },
    {
      id: "newsletter-inquiries",
      title: "Newsletter & Inquiries",
      description:
        "Manage newsletter subscribers collected from the website footer opt-in, and handle customer contact form submissions.",
      features: [
        "Newsletter subscriber list with opt-in date",
        "Export subscriber list to CSV",
        "Contact form inquiry inbox",
        "Inquiry status (New, In Progress, Resolved)",
        "Reply to inquiries via email link",
      ],
    },
    {
      id: "markup-rules",
      title: "Markup Rules",
      description:
        "Configure the pricing markup applied on top of net contract rates before showing prices to B2C customers.",
      features: [
        "Scope levels: Global → Destination → Hotel (highest specificity wins)",
        "Markup type: percentage or fixed amount",
        "Period tiers — override markup for specific date ranges (e.g., peak season)",
        "Priority-based conflict resolution",
        "Real-time markup preview",
      ],
      steps: [
        { step: 1, title: "Create a Markup Rule", description: "Go to B2C Website → Pricing → Markup Rules → New Rule." },
        { step: 2, title: "Select Scope", description: "Choose Global (all hotels), Destination-specific, or Hotel-specific. Higher specificity takes priority." },
        { step: 3, title: "Set Markup", description: "Enter the markup value and choose Percentage or Fixed Amount." },
        { step: 4, title: "Add Period Tiers", description: "Optionally add date-range overrides for seasonal markup adjustments." },
        { step: 5, title: "Save", description: "The markup is applied immediately to all B2C searches within the defined scope." },
      ],
    },
  ],
};

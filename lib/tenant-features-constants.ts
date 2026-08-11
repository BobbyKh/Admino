/**
 * Client-safe feature catalog (no `server-only`).
 * Import this in client components; the server logic lives in tenant-features.ts.
 */

export const TENANT_FEATURES = [
  "pages",
  "navigation",
  "layout",
  "settings",
  "bookings",
  "messages",
  "menu",
  "gallery",
  "media",
  "services",
  "blog",
  "commerce",
  "ai_theme_generator",
  "ai_block_assistant",
  "ai_site_builder",
  "ai_site_auditor",
  "ai_chatbot_rag",
  "ai_forecasting",
] as const;

export type TenantFeature = (typeof TENANT_FEATURES)[number];

export type FeatureCategory = "Site Management" | "Content" | "Commerce" | "AI Tools";

export interface TenantFeatureMeta {
  key: TenantFeature;
  label: string;
  description: string;
  category: FeatureCategory;
}

export const TENANT_FEATURE_METADATA: Record<TenantFeature, TenantFeatureMeta> = {
  pages: {
    key: "pages",
    label: "Pages & Blocks",
    description: "Manage custom site pages and page blocks",
    category: "Site Management",
  },
  navigation: {
    key: "navigation",
    label: "Navigation Links",
    description: "Manage top-level site navigation menus",
    category: "Site Management",
  },
  layout: {
    key: "layout",
    label: "Header & Footer Layout",
    description: "Customize header branding and footer layout",
    category: "Site Management",
  },
  settings: {
    key: "settings",
    label: "Site Settings",
    description: "General site metadata and configuration",
    category: "Site Management",
  },
  bookings: {
    key: "bookings",
    label: "Bookings & Reservations",
    description: "Manage table or appointment reservations",
    category: "Content",
  },
  messages: {
    key: "messages",
    label: "Contact Messages",
    description: "Receive and manage visitor contact messages",
    category: "Content",
  },
  menu: {
    key: "menu",
    label: "Menu & Offerings",
    description: "Manage food items and category menus",
    category: "Content",
  },
  gallery: {
    key: "gallery",
    label: "Photo Gallery",
    description: "Upload and showcase photo galleries",
    category: "Content",
  },
  media: {
    key: "media",
    label: "Media Library",
    description: "Upload and organize site asset files",
    category: "Content",
  },
  services: {
    key: "services",
    label: "Services Catalog",
    description: "Showcase service offerings and pricing",
    category: "Content",
  },
  blog: {
    key: "blog",
    label: "Blog Posts",
    description: "Publish news, updates, and blog articles",
    category: "Content",
  },
  commerce: {
    key: "commerce",
    label: "E-Commerce",
    description: "Manage products, orders, and payment setup",
    category: "Commerce",
  },
  ai_theme_generator: {
    key: "ai_theme_generator",
    label: "AI Theme Generator",
    description: "Generate color palettes and typography using AI",
    category: "AI Tools",
  },
  ai_block_assistant: {
    key: "ai_block_assistant",
    label: "AI Block Assistant",
    description: "Generate content and layout blocks using AI",
    category: "AI Tools",
  },
  ai_site_builder: {
    key: "ai_site_builder",
    label: "AI Site Builder",
    description: "Conversational agent that builds and edits entire pages with AI",
    category: "AI Tools",
  },
  ai_site_auditor: {
    key: "ai_site_auditor",
    label: "AI Site Auditor",
    description: "Automated site audit for SEO, accessibility, and content health",
    category: "AI Tools",
  },
  ai_chatbot_rag: {
    key: "ai_chatbot_rag",
    label: "AI Chatbot (Site Knowledge)",
    description: "Answer visitor questions from your site content (RAG)",
    category: "AI Tools",
  },
  ai_forecasting: {
    key: "ai_forecasting",
    label: "AI Demand Forecasting",
    description: "Predict future sales and restock needs from order history",
    category: "AI Tools",
  },
};

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  "Site Management",
  "Content",
  "Commerce",
  "AI Tools",
];

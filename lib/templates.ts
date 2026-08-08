/**
 * Site Template Presets for quick site provisioning and theme defaults.
 */

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  category: "blank" | "ecommerce" | "restaurant" | "agency" | "portfolio";
  defaultPages: Array<{
    title: string;
    slug: string;
    blocks: Array<{
      type: string;
      title: string;
      config: Record<string, unknown>;
    }>;
  }>;
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: "blank",
    name: "Blank Canvas",
    description: "Start from scratch with a clean home page.",
    category: "blank",
    defaultPages: [
      {
        title: "Home",
        slug: "home",
        blocks: [
          {
            type: "hero",
            title: "Welcome to your site",
            config: {
              title: "Welcome to your new website",
              subtitle: "Build modern, fast pages using our drag-and-drop builder.",
              ctaPrimary: "Explore Features",
              ctaPrimaryLink: "#features",
            },
          },
        ],
      },
    ],
  },
  {
    id: "ecommerce",
    name: "Modern E-Commerce",
    description: "Storefront layout with featured products, CTA banners, and reviews.",
    category: "ecommerce",
    defaultPages: [
      {
        title: "Home",
        slug: "home",
        blocks: [
          {
            type: "hero",
            title: "Storefront Hero",
            config: {
              title: "Discover Quality Products",
              subtitle: "Handpicked items delivered to your doorstep.",
              ctaPrimary: "Shop Catalog",
              ctaPrimaryLink: "/products",
            },
          },
          {
            type: "productGrid",
            title: "Featured Products",
            config: {
              title: "Featured Items",
              subtitle: "Best sellers of the season",
              source: "all",
              columns: "3",
            },
          },
          {
            type: "newsletter",
            title: "Join Newsletter",
            config: {
              title: "Get 10% Off Your First Order",
              subtitle: "Subscribe to receive special offers and product updates.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "restaurant",
    name: "Dining & Resort",
    description: "Hospitality theme with menu highlights, photo gallery, and reservation booking.",
    category: "restaurant",
    defaultPages: [
      {
        title: "Home",
        slug: "home",
        blocks: [
          {
            type: "hero",
            title: "Resort Hero",
            config: {
              title: "Experience Exceptional Hospitality",
              subtitle: "Delicious cuisine and peaceful atmosphere.",
              ctaPrimary: "Reserve a Table",
              ctaPrimaryLink: "/book",
            },
          },
          {
            type: "menuPreview",
            title: "Menu Highlights",
            config: {
              title: "Chef's Specials",
              subtitle: "Crafted with fresh local ingredients",
            },
          },
          {
            type: "bookingForm",
            title: "Table Reservations",
            config: {
              title: "Book Your Table",
              subtitle: "Reserve online in seconds",
            },
          },
        ],
      },
    ],
  },
  {
    id: "agency",
    name: "Digital Agency",
    description: "Services showcase, stats, client testimonials, and contact form.",
    category: "agency",
    defaultPages: [
      {
        title: "Home",
        slug: "home",
        blocks: [
          {
            type: "hero",
            title: "Agency Banner",
            config: {
              title: "We Build Digital Experiences That Scale",
              subtitle: "Design, development, and growth strategy for modern brands.",
              ctaPrimary: "Our Services",
              ctaPrimaryLink: "/services",
            },
          },
          {
            type: "services",
            title: "Services List",
            config: {
              title: "What We Do",
              subtitle: "End-to-end digital solutions",
            },
          },
          {
            type: "stats",
            title: "Key Metrics",
            config: {
              title: "Proven Results",
              items: [
                { value: "150+", label: "Projects Delivered" },
                { value: "99%", label: "Client Satisfaction" },
              ],
            },
          },
        ],
      },
    ],
  },
];

export function getTemplatePreset(id: string): TemplatePreset {
  return TEMPLATE_PRESETS.find((t) => t.id === id) ?? TEMPLATE_PRESETS[0];
}

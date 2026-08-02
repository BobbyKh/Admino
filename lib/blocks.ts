/**
 * Block Type Registry — defines all available block types for the page builder.
 * Each block type has: name, icon, group, defaultConfig, and optional configSchema.
 *
 * This is a code-based registry (not DB-stored) for type safety and validation.
 */
import {
  Type,
  Image,
  Video,
  GalleryHorizontalEnd,
  LayoutGrid,
  MousePointerClick,
  Newspaper,
  Quote,
  MapPin,
  Code2,
  FormInput,
  Minus,
  Star,
  MessageSquare,
  CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Block Config Types ──────────────────────────────────────────────────────

export interface HeroConfig {
  title: string;
  subtitle: string;
  badge: string;
  image: string;
  ctaPrimary: string;
  ctaPrimaryLink: string;
  ctaSecondary: string;
  ctaSecondaryLink: string;
}

export interface TextConfig {
  content: string;           // HTML content
  alignment: "left" | "center" | "right";
  maxWidth: string;          // e.g. "720px", "100%"
}

export interface ImageConfig {
  src: string;
  alt: string;
  caption: string;
  width: string;             // e.g. "100%", "600px"
  objectFit: "cover" | "contain" | "fill";
  link: string;              // optional click-through URL
}

export interface VideoConfig {
  url: string;               // YouTube/Vimeo URL or direct video URL
  title: string;
  poster: string;
  autoplay: boolean;
  loop: boolean;
}

export interface GalleryConfig {
  columns: 2 | 3 | 4;
  gap: string;               // e.g. "16px"
  showCaptions: boolean;
  lightbox: boolean;
  categoryFilter: boolean;
}

export interface FeaturesConfig {
  title: string;
  subtitle: string;
  columns: 2 | 3 | 4;
  items: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
}

export interface CtaConfig {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  buttonStyle: "primary" | "secondary" | "outline";
  backgroundImage: string;
  layout: "centered" | "left-aligned" | "split";
}

export interface MenuPreviewConfig {
  title: string;
  subtitle: string;
  columns: 2 | 3 | 4;
  showPrices: boolean;
  showCategories: boolean;
}

export interface ContactFormConfig {
  title: string;
  subtitle: string;
  fields: string[];          // which fields to show
  submitText: string;
  successMessage: string;
}

export interface MapConfig {
  query: string;             // Google Maps query or embed URL
  height: string;
  zoom: number;
  showMarker: boolean;
}

export interface TestimonialConfig {
  title: string;
  testimonials: Array<{
    name: string;
    role: string;
    content: string;
    avatar: string;
    rating: number;
  }>;
  layout: "carousel" | "grid";
}

export interface BookingFormConfig {
  title: string;
  subtitle: string;
  showTimeSlots: boolean;
  maxGuests: number;
  occasions: string[];
}

export interface DividerConfig {
  style: "solid" | "dashed" | "dotted" | "gradient";
  color: string;
  spacing: string;           // e.g. "40px"
}

export interface CustomHtmlConfig {
  html: string;
}

export interface SpacerConfig {
  height: string;            // e.g. "80px"
}

export interface ColumnsConfig {
  columns: Array<{
    width: string;           // e.g. "50%", "1fr"
    blocks: string[];        // nested block IDs (future)
  }>;
  gap: string;
}

// ─── Block Type Definition ───────────────────────────────────────────────────

export interface BlockType {
  type: string;
  label: string;
  description: string;
  icon: LucideIcon;
  group: "layout" | "content" | "media" | "commerce" | "interactive";
  defaultConfig: Record<string, unknown>;
}

// ─── Block Type Registry ─────────────────────────────────────────────────────

export const BLOCK_TYPES: BlockType[] = [
  // Layout
  {
    type: "hero",
    label: "Hero Banner",
    description: "Full-width hero with background image, title, and CTAs",
    icon: Star,
    group: "layout",
    defaultConfig: {
      title: "Welcome",
      subtitle: "Your subtitle here",
      badge: "",
      image: "",
      ctaPrimary: "Get Started",
      ctaPrimaryLink: "/",
      ctaSecondary: "",
      ctaSecondaryLink: "",
    } satisfies HeroConfig,
  },
  {
    type: "columns",
    label: "Columns",
    description: "Multi-column layout container",
    icon: LayoutGrid,
    group: "layout",
    defaultConfig: {
      columns: [{ width: "50%", blocks: [] }, { width: "50%", blocks: [] }],
      gap: "24px",
    } satisfies ColumnsConfig,
  },
  {
    type: "divider",
    label: "Divider",
    description: "Horizontal line separator",
    icon: Minus,
    group: "layout",
    defaultConfig: {
      style: "solid",
      color: "var(--border)",
      spacing: "40px",
    } satisfies DividerConfig,
  },
  {
    type: "spacer",
    label: "Spacer",
    description: "Empty space between blocks",
    icon: Minus,
    group: "layout",
    defaultConfig: {
      height: "80px",
    } satisfies SpacerConfig,
  },

  // Content
  {
    type: "text",
    label: "Text / Rich Text",
    description: "HTML text block with formatting",
    icon: Type,
    group: "content",
    defaultConfig: {
      content: "<p>Enter your text here...</p>",
      alignment: "left",
      maxWidth: "720px",
    } satisfies TextConfig,
  },
  {
    type: "features",
    label: "Features Grid",
    description: "Icon + title + description cards",
    icon: LayoutGrid,
    group: "content",
    defaultConfig: {
      title: "Our Features",
      subtitle: "Why choose us",
      columns: 3,
      items: [
        { icon: "leaf", title: "Feature 1", description: "Description here" },
        { icon: "star", title: "Feature 2", description: "Description here" },
        { icon: "heart", title: "Feature 3", description: "Description here" },
      ],
    } satisfies FeaturesConfig,
  },
  {
    type: "testimonials",
    label: "Testimonials",
    description: "Customer reviews and ratings",
    icon: MessageSquare,
    group: "content",
    defaultConfig: {
      title: "What Our Customers Say",
      testimonials: [
        { name: "Customer Name", role: "Business Owner", content: "Great experience!", avatar: "", rating: 5 },
      ],
      layout: "carousel",
    } satisfies TestimonialConfig,
  },
  {
    type: "customHtml",
    label: "Custom HTML",
    description: "Raw HTML/CSS/JS embed",
    icon: Code2,
    group: "content",
    defaultConfig: {
      html: "<div>Your HTML here</div>",
    } satisfies CustomHtmlConfig,
  },

  // Media
  {
    type: "image",
    label: "Image",
    description: "Single image with optional caption",
    icon: Image,
    group: "media",
    defaultConfig: {
      src: "",
      alt: "",
      caption: "",
      width: "100%",
      objectFit: "cover",
      link: "",
    } satisfies ImageConfig,
  },
  {
    type: "video",
    label: "Video",
    description: "YouTube/Vimeo embed or native video",
    icon: Video,
    group: "media",
    defaultConfig: {
      url: "",
      title: "",
      poster: "",
      autoplay: false,
      loop: false,
    } satisfies VideoConfig,
  },
  {
    type: "gallery",
    label: "Gallery",
    description: "Filterable image grid",
    icon: GalleryHorizontalEnd,
    group: "media",
    defaultConfig: {
      columns: 3,
      gap: "16px",
      showCaptions: true,
      lightbox: true,
      categoryFilter: true,
    } satisfies GalleryConfig,
  },

  // Commerce
  {
    type: "menuPreview",
    label: "Menu Preview",
    description: "Featured items from the menu",
    icon: Newspaper,
    group: "commerce",
    defaultConfig: {
      title: "Popular Dishes",
      subtitle: "From our kitchen",
      columns: 4,
      showPrices: true,
      showCategories: true,
    } satisfies MenuPreviewConfig,
  },
  {
    type: "cta",
    label: "Call to Action",
    description: "Promotional banner with button",
    icon: MousePointerClick,
    group: "commerce",
    defaultConfig: {
      title: "Ready to get started?",
      subtitle: "Join us today",
      buttonText: "Book Now",
      buttonLink: "/book",
      buttonStyle: "primary",
      backgroundImage: "",
      layout: "centered",
    } satisfies CtaConfig,
  },

  // Interactive
  {
    type: "contactForm",
    label: "Contact Form",
    description: "Embedded contact form",
    icon: FormInput,
    group: "interactive",
    defaultConfig: {
      title: "Get in Touch",
      subtitle: "We'd love to hear from you",
      fields: ["name", "email", "subject", "message"],
      submitText: "Send Message",
      successMessage: "Thank you! We'll get back to you soon.",
    } satisfies ContactFormConfig,
  },
  {
    type: "map",
    label: "Map",
    description: "Google Maps embed",
    icon: MapPin,
    group: "interactive",
    defaultConfig: {
      query: "",
      height: "400px",
      zoom: 15,
      showMarker: true,
    } satisfies MapConfig,
  },
  {
    type: "bookingForm",
    label: "Booking Form",
    description: "Table reservation form",
    icon: CalendarDays,
    group: "interactive",
    defaultConfig: {
      title: "Reserve a Table",
      subtitle: "Book your dining experience",
      showTimeSlots: true,
      maxGuests: 20,
      occasions: ["Birthday", "Anniversary", "Business", "Other"],
    } satisfies BookingFormConfig,
  },
];

// ─── Registry Helpers ────────────────────────────────────────────────────────

export function getBlockType(type: string): BlockType | undefined {
  return BLOCK_TYPES.find((b) => b.type === type);
}

export function getDefaultConfig(type: string): Record<string, unknown> {
  return getBlockType(type)?.defaultConfig ?? {};
}

export function getBlockTypesByGroup(): Record<string, BlockType[]> {
  return BLOCK_TYPES.reduce((acc, block) => {
    if (!acc[block.group]) acc[block.group] = [];
    acc[block.group].push(block);
    return acc;
  }, {} as Record<string, BlockType[]>);
}

export const BLOCK_GROUP_LABELS: Record<string, string> = {
  layout: "Layout",
  content: "Content",
  media: "Media",
  commerce: "Commerce",
  interactive: "Interactive",
};

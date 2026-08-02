/**
 * Block Type Registry — defines all available block types for the page builder.
 */
import {
  Type,
  Image,
  Video,
  GalleryHorizontalEnd,
  LayoutGrid,
  MousePointerClick,
  Newspaper,
  MapPin,
  Code2,
  FormInput,
  Minus,
  Star,
  MessageSquare,
  CalendarDays,
  ShoppingCart,
  Users,
  BarChart3,
  Mail,
  Clock,
  Layers,
  AlertCircle,
  ChevronRight,
  CreditCard,
  CheckCircle,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface BlockType {
  type: string;
  label: string;
  description: string;
  icon: LucideIcon;
  group: "layout" | "content" | "media" | "commerce" | "interactive";
  defaultConfig: Record<string, unknown>;
}

export const BLOCK_TYPES: BlockType[] = [
  // ═══ Layout ═══
  {
    type: "hero",
    label: "Hero Banner",
    description: "Full-width hero with background image, title, and CTAs",
    icon: Star,
    group: "layout",
    defaultConfig: { title: "Welcome", subtitle: "Your subtitle here", badge: "", image: "", ctaPrimary: "Get Started", ctaPrimaryLink: "/", ctaSecondary: "", ctaSecondaryLink: "" },
  },
  {
    type: "spacer",
    label: "Spacer",
    description: "Empty vertical space between blocks",
    icon: Minus,
    group: "layout",
    defaultConfig: { height: "80px" },
  },
  {
    type: "divider",
    label: "Divider",
    description: "Horizontal line separator",
    icon: Minus,
    group: "layout",
    defaultConfig: { style: "solid", color: "var(--border)", width: "100%" },
  },
  {
    type: "columns",
    label: "Columns",
    description: "Multi-column layout container",
    icon: LayoutGrid,
    group: "layout",
    defaultConfig: { columns: [{ width: "50%" }, { width: "50%" }], gap: "24px" },
  },

  // ═══ Content ═══
  {
    type: "text",
    label: "Text / Rich Text",
    description: "HTML text block with formatting",
    icon: Type,
    group: "content",
    defaultConfig: { content: "<p>Enter your text here...</p>", alignment: "left", maxWidth: "720px" },
  },
  {
    type: "richText",
    label: "Rich Text",
    description: "HTML content block with prose styling",
    icon: FileText,
    group: "content",
    defaultConfig: { html: "<h2>Your heading</h2><p>Your content here.</p>" },
  },
  {
    type: "imageText",
    label: "Image + Text",
    description: "Side-by-side image and text layout",
    icon: Image,
    group: "content",
    defaultConfig: { layout: "left", image: "", badge: "", title: "Add a Title", text: "Add your text content here.", buttonText: "", buttonLink: "" },
  },
  {
    type: "features",
    label: "Features Grid",
    description: "Icon + title + description cards",
    icon: LayoutGrid,
    group: "content",
    defaultConfig: { title: "Our Features", subtitle: "Why choose us", badge: "", items: [{ icon: "leaf", title: "Feature 1", text: "Description" }, { icon: "star", title: "Feature 2", text: "Description" }] },
  },
  {
    type: "testimonial",
    label: "Testimonials",
    description: "Customer reviews and ratings",
    icon: MessageSquare,
    group: "content",
    defaultConfig: { title: "What People Say", badge: "", items: [{ name: "John D.", role: "CEO", text: "Amazing service!", rating: 5 }] },
  },
  {
    type: "faq",
    label: "FAQ Accordion",
    description: "Frequently asked questions with expand/collapse",
    icon: FileText,
    group: "content",
    defaultConfig: { title: "Frequently Asked Questions", badge: "", items: [{ question: "What is this?", answer: "This is a FAQ item." }] },
  },
  {
    type: "stats",
    label: "Stats / Numbers",
    description: "Large number counters with labels",
    icon: BarChart3,
    group: "content",
    defaultConfig: { title: "By the Numbers", badge: "", items: [{ value: "500+", label: "Happy Customers" }, { value: "10+", label: "Years Experience" }] },
  },
  {
    type: "timeline",
    label: "Timeline",
    description: "Vertical timeline with numbered steps",
    icon: Clock,
    group: "content",
    defaultConfig: { title: "Our Timeline", badge: "", items: [{ title: "Step 1", description: "Description", date: "2024" }] },
  },
  {
    type: "steps",
    label: "Steps",
    description: "How-it-works numbered steps",
    icon: ChevronRight,
    group: "content",
    defaultConfig: { title: "How It Works", badge: "", items: [{ title: "Sign Up", description: "Create your account" }, { title: "Configure", description: "Set things up" }, { title: "Launch", description: "Go live" }] },
  },
  {
    type: "tabs",
    label: "Tabs",
    description: "Tabbed content switcher",
    icon: Layers,
    group: "content",
    defaultConfig: { title: "", badge: "", items: [{ label: "Tab 1", content: "<p>Content 1</p>" }, { label: "Tab 2", content: "<p>Content 2</p>" }] },
  },
  {
    type: "alert",
    label: "Alert / Banner",
    description: "Info, success, warning, or error alert",
    icon: AlertCircle,
    group: "content",
    defaultConfig: { variant: "info", title: "Heads up!", text: "This is an important message." },
  },
  {
    type: "services",
    label: "Services List",
    description: "Service cards with check icons",
    icon: CheckCircle,
    group: "content",
    defaultConfig: { title: "Our Services", subtitle: "What we offer", badge: "", items: [{ title: "Web Design", description: "Beautiful, modern websites" }, { title: "Development", description: "Robust web applications" }] },
  },
  {
    type: "team",
    label: "Team Members",
    description: "Team member cards with photos",
    icon: Users,
    group: "content",
    defaultConfig: { title: "Meet the Team", badge: "", items: [{ name: "Jane Smith", role: "CEO", bio: "Visionary leader" }, { name: "Bob Jones", role: "CTO", bio: "Tech expert" }] },
  },
  {
    type: "pricing",
    label: "Pricing Table",
    description: "Pricing tier comparison cards",
    icon: CreditCard,
    group: "content",
    defaultConfig: { title: "Pricing Plans", subtitle: "Choose the right plan for you", badge: "", items: [{ name: "Basic", price: "$9", period: "mo", features: ["Feature 1", "Feature 2"] }, { name: "Pro", price: "$29", period: "mo", features: ["Feature 1", "Feature 2", "Feature 3"], highlighted: true }] },
  },
  {
    type: "customHtml",
    label: "Custom HTML",
    description: "Raw HTML/CSS/JS embed",
    icon: Code2,
    group: "content",
    defaultConfig: { html: "<div>Your HTML here</div>" },
  },

  // ═══ Media ═══
  {
    type: "image",
    label: "Image",
    description: "Single image with optional caption",
    icon: Image,
    group: "media",
    defaultConfig: { src: "", alt: "", caption: "", width: "100%", objectFit: "cover", link: "" },
  },
  {
    type: "video",
    label: "Video",
    description: "YouTube/Vimeo embed or native video",
    icon: Video,
    group: "media",
    defaultConfig: { url: "", title: "", poster: "", autoplay: false, loop: false },
  },
  {
    type: "gallery",
    label: "Gallery",
    description: "Image grid from gallery",
    icon: GalleryHorizontalEnd,
    group: "media",
    defaultConfig: { columns: 3, gap: "16px" },
  },
  {
    type: "galleryLightbox",
    label: "Gallery + Lightbox",
    description: "Image grid with click-to-expand lightbox",
    icon: Layers,
    group: "media",
    defaultConfig: { title: "Gallery", badge: "", items: [{ src: "", alt: "", caption: "" }] },
  },
  {
    type: "slider",
    label: "Image Slider",
    description: "Auto-rotating image carousel",
    icon: Image,
    group: "media",
    defaultConfig: { height: "500px", items: [{ image: "", title: "", subtitle: "" }] },
  },

  // ═══ Commerce ═══
  {
    type: "menuPreview",
    label: "Menu Preview",
    description: "Featured items from the menu",
    icon: Newspaper,
    group: "commerce",
    defaultConfig: { title: "Featured Items", subtitle: "" },
  },
  {
    type: "cta",
    label: "Call to Action",
    description: "Promotional banner with button",
    icon: MousePointerClick,
    group: "commerce",
    defaultConfig: { title: "Ready to get started?", subtitle: "Join us today", heroCtaPrimary: "Get Started", heroCtaPrimaryLink: "/" },
  },
  {
    type: "ctaBanner",
    label: "CTA Banner",
    description: "Full-width colored call-to-action banner",
    icon: MousePointerClick,
    group: "commerce",
    defaultConfig: { title: "Ready to Get Started?", subtitle: "Join thousands of happy customers.", buttonText: "Sign Up Free", buttonLink: "/", button2Text: "", button2Link: "", icon: "" },
  },
  {
    type: "productGrid",
    label: "Product Grid",
    description: "Product cards with images and add-to-cart",
    icon: ShoppingCart,
    group: "commerce",
    defaultConfig: { title: "Our Products", subtitle: "", badge: "", columns: "3", items: [{ name: "Product 1", price: "$29", image: "", description: "Great product", badge: "New" }] },
  },
  {
    type: "newsletter",
    label: "Newsletter Signup",
    description: "Email subscription form",
    icon: Mail,
    group: "commerce",
    defaultConfig: { title: "Subscribe to Our Newsletter", subtitle: "Stay updated with our latest news.", buttonText: "Subscribe", placeholder: "Enter your email", successMessage: "Thank you for subscribing!" },
  },

  // ═══ Interactive ═══
  {
    type: "contactForm",
    label: "Contact Form",
    description: "Contact/inquiry form with fields",
    icon: FormInput,
    group: "interactive",
    defaultConfig: { title: "Get in Touch", subtitle: "We'd love to hear from you.", badge: "", address: "", phone: "", email: "", showPhone: "true", showSubject: "true", buttonText: "Send Message", successMessage: "Thank you! We'll get back to you soon." },
  },
  {
    type: "authForm",
    label: "Auth Form (Login/Signup)",
    description: "Login or signup form with toggle",
    icon: FormInput,
    group: "interactive",
    defaultConfig: { mode: "login", title: "Welcome Back", subtitle: "Log in to your account", submitText: "Sign In", switchText: "Sign up", switchLink: "#", forgotLink: "Forgot password?" },
  },
  {
    type: "map",
    label: "Map",
    description: "Google Maps embed with info",
    icon: MapPin,
    group: "interactive",
    defaultConfig: { query: "", title: "Find Us", badge: "", address: "", hours: "", phone: "" },
  },
  {
    type: "bookingForm",
    label: "Booking Form",
    description: "Table reservation form",
    icon: CalendarDays,
    group: "interactive",
    defaultConfig: { title: "Reserve a Table", subtitle: "Book your experience" },
  },
  {
    type: "infoCard",
    label: "Info Card",
    description: "Hours, location, and contact info card",
    icon: Clock,
    group: "interactive",
    defaultConfig: { title: "Quick Info", badge: "", hours: "", location: "", price: "", rating: "", capacity: "" },
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
  interactive: "Forms & Interactive",
};

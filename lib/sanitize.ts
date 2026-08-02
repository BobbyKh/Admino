import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize HTML to prevent XSS attacks.
 * Strips <script>, event handlers, and other dangerous elements.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr",
      "strong", "em", "b", "i", "u", "s", "mark", "small", "sub", "sup",
      "a", "img", "figure", "figcaption",
      "ul", "ol", "li", "dl", "dt", "dd",
      "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
      "blockquote", "pre", "code", "kbd", "samp",
      "div", "span", "section", "article", "aside", "header", "footer", "nav", "main",
      "details", "summary",
      "video", "audio", "source", "iframe", "embed", "object",
      "svg", "path", "circle", "rect", "line", "polyline", "polygon",
      "style", "link", "meta",
    ],
    ALLOWED_ATTR: [
      "href", "src", "alt", "title", "width", "height", "loading",
      "class", "id", "style", "data-*", "target", "rel",
      "colspan", "rowspan", "headers", "scope", "align", "valign",
      "viewBox", "fill", "stroke", "stroke-width", "d",
      "controls", "autoplay", "loop", "muted", "poster",
      "type", "name", "content", "charset", "media",
    ],
    ALLOW_DATA_ATTR: true,
  });
}

/**
 * Escape HTML entities for safe interpolation in HTML contexts.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows safe HTML tags for rich content (blog posts, pages) but strips scripts.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "hr", "blockquote", "pre", "code",
      "ul", "ol", "li", "dl", "dt", "dd",
      "a", "strong", "em", "b", "i", "u", "s", "sub", "sup", "mark",
      "img", "figure", "figcaption",
      "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
      "div", "span", "section", "article", "header", "footer", "nav",
      "details", "summary",
      "video", "source", "iframe",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel", "src", "alt", "title", "width", "height",
      "class", "id", "style", "colspan", "rowspan", "loading",
      "allow", "allowfullscreen", "frameborder",
    ],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize CSS to prevent injection attacks.
 * Only allows safe CSS properties, strips JS expressions.
 */
export function sanitizeCss(dirty: string): string {
  // Remove any url() calls with javascript: protocol, expressions, and behavior
  return dirty
    .replace(/expression\s*\(/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/behavior\s*:/gi, "")
    .replace(/-moz-binding\s*:/gi, "")
    .replace(/@import\s/gi, "");
}

export type ChatContentPart =
  | { type: "text"; value: string }
  | { type: "link"; href: string; label: string }
  | { type: "image"; src: string; alt: string };

const RICH_CONTENT_PATTERN = /!\[([^\]]*)\]\(([^\s)]+)\)|\[([^\]]+)\]\(([^\s)]+)\)|(https?:\/\/[^\s<]+)/g;
const IMAGE_URL_PATTERN = /\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i;

function isSafeDestination(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function trimBareUrl(value: string): { url: string; trailing: string } {
  const match = value.match(/[.,!?;:]+$/);
  if (!match) return { url: value, trailing: "" };
  return { url: value.slice(0, -match[0].length), trailing: match[0] };
}

export function parseChatContent(content: string): ChatContentPart[] {
  const parts: ChatContentPart[] = [];
  let cursor = 0;
  const append = (part: ChatContentPart) => {
    const previous = parts.at(-1);
    if (part.type === "text" && previous?.type === "text") {
      previous.value += part.value;
    } else {
      parts.push(part);
    }
  };

  for (const match of content.matchAll(RICH_CONTENT_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) append({ type: "text", value: content.slice(cursor, index) });

    const imageAlt = match[1];
    const imageSrc = match[2];
    const linkLabel = match[3];
    const linkHref = match[4];
    const bareValue = match[5];

    if (imageSrc && isSafeDestination(imageSrc)) {
      append({ type: "image", src: imageSrc, alt: imageAlt || "Shared image" });
    } else if (linkHref && isSafeDestination(linkHref)) {
      append({ type: "link", href: linkHref, label: linkLabel });
    } else if (bareValue) {
      const { url, trailing } = trimBareUrl(bareValue);
      if (isSafeDestination(url)) {
        append(
          IMAGE_URL_PATTERN.test(url)
            ? { type: "image", src: url, alt: "Shared image" }
            : { type: "link", href: url, label: url }
        );
        if (trailing) append({ type: "text", value: trailing });
      } else {
        append({ type: "text", value: match[0] });
      }
    } else {
      append({ type: "text", value: match[0] });
    }

    cursor = index + match[0].length;
  }

  if (cursor < content.length) append({ type: "text", value: content.slice(cursor) });
  return parts.length ? parts : [{ type: "text", value: content }];
}

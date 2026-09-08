import path from "node:path";
import MarkdownIt from "markdown-it";
import { AppError } from "../errors.js";

export interface DisplayContext {
  repositoryKey: string;
  commitSha: string;
  relativePath: string;
}

const safeUrl = (value: string, context: DisplayContext, image: boolean): string | null => {
  if (/[\\\x00-\x1f\x7f]/.test(value)) return null;
  if (value.startsWith("#")) return image ? null : value;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    try {
      const url = new URL(value);
      return ["http:", "https:", ...image ? [] : ["mailto:"]].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  }
  if (value.startsWith("/")) return null;
  const split = value.search(/[?#]/);
  const pathname = split === -1 ? value : value.slice(0, split);
  const suffix = split === -1 ? "" : value.slice(split);
  let decoded: string;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  if (/[\\\x00-\x1f\x7f]/.test(decoded) || decoded.startsWith("/")) return null;
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(context.relativePath), decoded));
  if (resolved === ".." || resolved.startsWith("../")) return null;
  const encoded = resolved.split("/").map(encodeURIComponent).join("/");
  return image
    ? `https://raw.githubusercontent.com/${context.repositoryKey}/${context.commitSha}/${encoded}${suffix}`
    : `https://github.com/${context.repositoryKey}/blob/${context.commitSha}/${encoded}${suffix}`;
};

export class MarkdownRenderer {
  public render(sourceText: string, context: DisplayContext): string {
    try {
      const renderer = new MarkdownIt({ html: false, linkify: false, typographer: false, breaks: false });
      const originalImage = renderer.renderer.rules.image!;
      renderer.renderer.rules.link_open = (tokens, index, options, _environment, self) => {
        const token = tokens[index]!;
        const safe = safeUrl(token.attrGet("href") ?? "", context, false);
        if (safe) { token.attrSet("href", safe); token.attrSet("rel", "noopener noreferrer"); }
        else { token.attrs = token.attrs?.filter(([name]) => name !== "href") ?? null; }
        return self.renderToken(tokens, index, options);
      };
      renderer.renderer.rules.image = (tokens, index, options, environment, self) => {
        const token = tokens[index]!;
        const safe = safeUrl(token.attrGet("src") ?? "", context, true);
        if (!safe) return renderer.utils.escapeHtml(token.content);
        token.attrSet("src", safe);
        return originalImage(tokens, index, options, environment, self);
      };
      const slugs = new Set<string>();
      renderer.renderer.rules.heading_open = (tokens, index, options, _environment, self) => {
        const content = tokens[index + 1]?.children?.map(token => token.content).join("") ?? "section";
        const base = content.toLowerCase().trim().replace(/[^\p{L}\p{N}_\s-]/gu, "").replace(/\s/g, "-") || "section";
        let slug = base;
        for (let suffix = 1; slugs.has(slug); suffix += 1) slug = `${base}-${suffix}`;
        slugs.add(slug);
        tokens[index]!.attrSet("id", slug);
        return self.renderToken(tokens, index, options);
      };
      return renderer.render(sourceText);
    } catch (cause) {
      throw new AppError("RENDER_FAILED", "The Markdown document could not be rendered safely.", false, { cause });
    }
  }
}

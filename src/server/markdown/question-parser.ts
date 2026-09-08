import MarkdownIt from "markdown-it";
import type { Option, ParseResult, ParsedQuestion, SourceDocument, Warning } from "../../shared/types.js";
import { makeCanonicalIdentity, makeIdentityDigest, makeQuestionKey } from "../domain/identity.js";

interface SourceLine {
  text: string;
  start: number;
  end: number;
  lineNumber: number;
  topLevel: boolean;
}

const warning = (document: SourceDocument, lineNumber: number, message: string, code: Warning["code"] = "MALFORMED_QUESTION"): Warning => ({
  code,
  documentKey: document.documentKey,
  lineNumber,
  message
});

const makeLines = (bytes: Buffer): SourceLine[] => {
  const lines: SourceLine[] = [];
  let start = 0;
  for (let offset = 0; offset <= bytes.length; offset += 1) {
    if (offset !== bytes.length && bytes[offset] !== 10 && bytes[offset] !== 13) continue;
    const bom = start === 0 && bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])) ? 3 : 0;
    const text = bytes.subarray(start + bom, offset).toString("utf8");
    lines.push({ text, start: start + bom, end: offset, lineNumber: lines.length + 1, topLevel: true });
    if (bytes[offset] === 13 && bytes[offset + 1] === 10) offset += 1;
    start = offset + 1;
  }
  const parser = new MarkdownIt({ html: true });
  const tokens = parser.parse(lines.map(line => line.text).join("\n"), {});
  for (const token of tokens) {
    if (["fence", "code_block", "html_block", "blockquote_open", "bullet_list_open", "ordered_list_open"].includes(token.type) && token.map) {
      for (let index = token.map[0]; index < token.map[1]; index += 1) if (lines[index]) lines[index]!.topLevel = false;
    }
  }
  return lines;
};

const isBoundaryHeading = (line: SourceLine): boolean => line.topLevel && /^#{1,2}\s+/.test(line.text);

const trimOuterBlankLines = (value: string): string => value.replace(/^(?:[ \t]*\r?\n)+|(?:\r?\n[ \t]*)+$/g, "").trim();

export class QuestionParser {
  public parse(document: SourceDocument): ParseResult {
    const lines = makeLines(document.sourceBytes);
    const warnings: Warning[] = [];
    const tokens = new MarkdownIt({ html: true }).parse(lines.map(line => line.text).join("\n"), {});
    for (const token of tokens) {
      if (token.type !== "fence" || !token.map) continue;
      const last = lines[token.map[1] - 1]?.text ?? "";
      const close = new RegExp(`^ {0,3}${token.markup[0]}{${token.markup.length},}[ \t]*$`);
      if (token.map[1] - token.map[0] < 2 || !close.test(last)) warnings.push(warning(document, token.map[0] + 1, "An unclosed code fence was excluded from question parsing."));
    }
    const parsed: ParsedQuestion[] = [];
    const starts = lines.filter((line) => line.topLevel && /^##\s+Question(?:\s|$)/i.test(line.text));

    for (const start of starts) {
      const header = start.text.match(/^##\s+Question\s+([0-9]+)\s*$/);
      if (!header) {
        warnings.push(warning(document, start.lineNumber, "Question headings must use exactly '## Question <number>'."));
        continue;
      }
      const endLineIndex = lines.findIndex((line) => line.lineNumber > start.lineNumber && isBoundaryHeading(line));
      const section = lines.slice(start.lineNumber, endLineIndex === -1 ? lines.length : endLineIndex);
      const optionsAt = section.filter((line) => line.topLevel && /^[A-Z]\)\s+/.test(line.text));
      const answersAt = section.filter((line) => line.topLevel && /^\[Answer\]:/.test(line.text));
      if (section.some(line => line.topLevel && /^[A-Za-z]\)/.test(line.text) && !/^[A-Z]\)[ \t]+\S/.test(line.text))) {
        warnings.push(warning(document, start.lineNumber, "Options must use an uppercase letter and non-empty content."));
        continue;
      }
      if (optionsAt.length < 2 || answersAt.length !== 1) {
        warnings.push(warning(document, start.lineNumber, "A question needs at least two options and exactly one [Answer]: line."));
        continue;
      }
      const answer = answersAt[0]!;
      if (optionsAt.some((line) => line.lineNumber > answer.lineNumber)) {
        warnings.push(warning(document, start.lineNumber, "Options must appear before the [Answer]: line."));
        continue;
      }
      const firstOptionIndex = section.findIndex((line) => line.lineNumber === optionsAt[0]!.lineNumber);
      const prompt = trimOuterBlankLines(section.slice(0, firstOptionIndex).map((line) => line.text).join("\n"));
      const options: Option[] = optionsAt.map((option, index) => {
        const optionIndex = section.findIndex((line) => line.lineNumber === option.lineNumber);
        const next = index + 1 < optionsAt.length
          ? section.findIndex((line) => line.lineNumber === optionsAt[index + 1]!.lineNumber)
          : section.findIndex((line) => line.lineNumber === answer.lineNumber);
        return { letter: option.text[0]!, content: trimOuterBlankLines([option.text.replace(/^[A-Z]\)[ \t]+/, ""), ...section.slice(optionIndex + 1, next).map((line) => line.text)].join("\n")) };
      });
      if (!prompt || options.some((option) => !option.content) || new Set(options.map((option) => option.letter)).size !== options.length) {
        warnings.push(warning(document, start.lineNumber, "Question prompt and option letters/content must be unique and non-empty."));
        continue;
      }
      const answerMatch = answer.text.match(/^\[Answer\]:(.*)$/)!;
      const sourceAnswer = answerMatch[1]!;
      const colonBytes = Buffer.byteLength("[Answer]", "utf8");
      const afterColon = sourceAnswer.match(/^[ \t]*/)?.[0] ?? "";
      const canonicalIdentity = makeCanonicalIdentity(header[1]!, prompt, options);
      const identityDigest = makeIdentityDigest(canonicalIdentity);
      parsed.push({
        questionKey: makeQuestionKey(document.documentKey, identityDigest),
        documentKey: document.documentKey,
        documentPath: document.relativePath,
        number: header[1]!,
        prompt,
        options,
        sourceAnswer,
        canonicalIdentity,
        identityVersion: 1,
        identityDigest,
        answerSpan: {
          lineStart: answer.start,
          lineEnd: answer.end,
          colonOffset: answer.start + colonBytes,
          insertOffset: answer.start + colonBytes + 1 + Buffer.byteLength(afterColon, "utf8"),
          valueStart: answer.start + colonBytes + 1,
          valueEnd: answer.end
        },
        lineNumber: answer.lineNumber
      });
      const normalized = sourceAnswer.trim();
      if (normalized && !options.some((option) => option.letter === normalized)) {
        warnings.push(warning(document, answer.lineNumber, "The source answer is preserved but does not match an option.", "SOURCE_ANSWER_INVALID"));
      }
    }

    const duplicates = new Map<string, ParsedQuestion[]>();
    for (const question of parsed) duplicates.set(question.canonicalIdentity, [...(duplicates.get(question.canonicalIdentity) ?? []), question]);
    const questions = parsed.filter((question) => (duplicates.get(question.canonicalIdentity)?.length ?? 0) === 1);
    for (const group of duplicates.values()) {
      if (group.length > 1) {
        for (const question of group) warnings.push(warning(document, question.lineNumber, "Duplicate question content is ambiguous and was excluded.", "AMBIGUOUS_QUESTION"));
      }
    }
    return { questions, warnings };
  }
}

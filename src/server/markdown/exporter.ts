import path from "node:path";
import type { DownloadFile, ParsedQuestion, SavedDecision, SourceDocument } from "../../shared/types.js";
import { makeSourceDigest } from "../domain/identity.js";
import { AppError } from "../errors.js";

export class MarkdownExporter {
  public export(document: SourceDocument, questions: ParsedQuestion[], decisions: SavedDecision[]): DownloadFile {
    if (makeSourceDigest(document.sourceBytes) !== document.sourceVersion.sourceDigest) throw new AppError("EXPORT_MISMATCH", "The source bytes changed; reconnect before exporting.", false);
    const byQuestion = new Map(decisions.map((decision) => [decision.questionKey, decision]));
    const edits: Array<{ offset: number; value: Buffer }> = [];
    for (const question of questions) {
      const decision = byQuestion.get(question.questionKey);
      if (!decision || question.sourceAnswer.trim() || !decision.uniqueAtDecision || decision.canonicalIdentity !== question.canonicalIdentity || decision.documentPath !== document.relativePath || question.documentKey !== document.documentKey) continue;
      if (!question.options.some((option) => option.letter === decision.selectedLetter)) continue;
      const span = question.answerSpan;
      if (![span.lineStart, span.lineEnd, span.colonOffset, span.insertOffset, span.valueStart, span.valueEnd].every(Number.isSafeInteger) || span.lineStart < 0 || span.colonOffset !== span.lineStart + 8 || span.valueStart !== span.colonOffset + 1 || span.valueEnd !== span.lineEnd || span.lineEnd > document.sourceBytes.length || span.insertOffset !== span.valueEnd || span.valueStart > span.valueEnd || document.sourceBytes.subarray(span.lineStart, span.colonOffset).toString("utf8") !== "[Answer]" || !/^[ \t]*$/.test(document.sourceBytes.subarray(span.valueStart, span.insertOffset).toString("utf8"))) {
        throw new AppError("EXPORT_MISMATCH", "The document answer positions are invalid.", false);
      }
      const sourceValue = document.sourceBytes.subarray(question.answerSpan.valueStart, question.answerSpan.valueEnd).toString("utf8");
      if (sourceValue !== question.sourceAnswer || document.sourceBytes.subarray(question.answerSpan.colonOffset, question.answerSpan.colonOffset + 1).toString("utf8") !== ":") {
        throw new AppError("EXPORT_MISMATCH", "The document changed; reconnect before exporting.", false);
      }
      const prefix = question.answerSpan.insertOffset === question.answerSpan.valueStart ? " " : "";
      edits.push({ offset: question.answerSpan.insertOffset, value: Buffer.from(`${prefix}${decision.selectedLetter}`, "utf8") });
    }
    const offsets = new Set<number>();
    if (edits.some((edit) => edit.offset < 0 || edit.offset > document.sourceBytes.length || offsets.has(edit.offset) || !offsets.add(edit.offset))) {
      throw new AppError("EXPORT_MISMATCH", "The document answer positions are invalid.", false);
    }
    let output = document.sourceBytes;
    for (const edit of edits.sort((left, right) => right.offset - left.offset)) {
      output = Buffer.concat([output.subarray(0, edit.offset), edit.value, output.subarray(edit.offset)]);
    }
    const name = path.posix.basename(document.relativePath).replace(/[\\/\0-\x1f\x7f]/g, "") || "document.md";
    return { fileName: name, content: output, contentType: "text/markdown; charset=utf-8" };
  }
}

import { randomUUID } from "node:crypto";
import type { AnswerSelection, CommitResult, ConnectionInput, DocumentKey, DocumentView, DownloadFile, EffectiveQuestion, ParsedQuestion, ReviewContext, SavedDecision, SnapshotId, WorkspaceView, Warning } from "../shared/types.js";
import { nowIso } from "./domain/identity.js";
import { AppError } from "./errors.js";
import { GitHubSource } from "./github-source.js";
import { LocalGitSource } from "./local-git-source.js";
import { MarkdownExporter } from "./markdown/exporter.js";
import { MarkdownRenderer } from "./markdown/renderer.js";
import { QuestionParser } from "./markdown/question-parser.js";
import { DecisionStore } from "./storage/decision-store.js";

export class PlanRepoService {
  private context: ReviewContext | null = null;
  private serial: Promise<void> = Promise.resolve();

  public constructor(
    private readonly source: GitHubSource,
    private readonly localSource: LocalGitSource,
    private readonly parser: QuestionParser,
    private readonly renderer: MarkdownRenderer,
    private readonly store: DecisionStore,
    private readonly exporter: MarkdownExporter
  ) {}

  public getRecentConnection(): ConnectionInput | null {
    const connection = this.store.getRecentConnection();
    return connection ? connection.repositoryKey.startsWith("local:") ? { sourceType: "local", localPath: connection.repositoryUrl ?? "", folderPath: connection.folderPath } : { repositoryUrl: connection.repositoryUrl ?? "", folderPath: connection.folderPath } : null;
  }

  public async connect(input: ConnectionInput): Promise<WorkspaceView> {
    return this.enqueue(async () => {
      const active = input.sourceType === "local" ? this.localSource : this.source;
      const scope = active.validateConnection(input);
      const bundle = await active.loadMarkdown(scope);
      const parseResults = new Map(bundle.documents.map((document) => [document.documentKey, this.parser.parse(document)]));
      const next = { snapshotId: randomUUID(), sourceBundle: bundle, parseResults };
      const workspace = this.workspace(next);
      this.store.saveRecentConnection({ repositoryKey: scope.repositoryKey, repositoryUrl: scope.canonicalUrl, folderPath: scope.folderPath });
      this.context = next;
      return workspace;
    });
  }

  public getWorkspace(snapshotId: SnapshotId): WorkspaceView {
    return this.workspace(this.requireContext(snapshotId));
  }

  public getDocument(snapshotId: SnapshotId, documentKey: DocumentKey): DocumentView {
    const context = this.requireContext(snapshotId);
    const document = context.sourceBundle.documents.find((candidate) => candidate.documentKey === documentKey);
    const parsed = context.parseResults.get(documentKey);
    if (!document || !parsed) throw new AppError("DOCUMENT_NOT_FOUND", "The selected document is not in the active workspace.", false);
    const effectiveQuestions = this.effective(context, documentKey);
    return {
      documentKey,
      safeHtml: this.renderer.render(document.sourceBytes.toString("utf8"), { repositoryKey: document.repositoryKey, commitSha: document.sourceVersion.commitSha, relativePath: document.relativePath }),
      effectiveQuestions,
      warnings: [...parsed.warnings, ...this.mergeWarnings(context, documentKey)]
    };
  }

  public async commitAnswers(snapshotId: SnapshotId, selections: AnswerSelection[]): Promise<CommitResult> {
    return this.enqueue(async () => {
      const context = this.requireContext(snapshotId);
      if (!selections.length || new Set(selections.map((selection) => selection.questionKey)).size !== selections.length) {
        throw new AppError("INVALID_SELECTION", "Select one valid answer for each question before confirming.", false);
      }
      const questions = new Map([...context.parseResults.values()].flatMap((result) => result.questions).map((question) => [question.questionKey, question]));
      const decisions = this.decisions(context, selections, questions);
      const saved = this.store.saveDecisions(context.sourceBundle.scope.repositoryKey, decisions);
      return { decisions: saved.map((decision) => ({ questionKey: decision.questionKey, documentKey: decision.documentKey, selectedLetter: decision.selectedLetter, decidedAt: decision.decidedAt })), workspace: this.workspace(context) };
    });
  }

  public exportDocument(snapshotId: SnapshotId, documentKey: DocumentKey): DownloadFile {
    const context = this.requireContext(snapshotId);
    const document = context.sourceBundle.documents.find((candidate) => candidate.documentKey === documentKey);
    const parsed = context.parseResults.get(documentKey);
    if (!document || !parsed) throw new AppError("DOCUMENT_NOT_FOUND", "The selected document is not in the active workspace.", false);
    const saved = this.store.listDecisions(context.sourceBundle.scope.repositoryKey, [document.relativePath]).map((decision) => ({ ...decision, documentKey }));
    return this.exporter.export(document, parsed.questions, saved);
  }

  private decisions(context: ReviewContext, selections: AnswerSelection[], questions: Map<string, ParsedQuestion>): SavedDecision[] {
    const timestamp = nowIso();
    return selections.map((selection) => {
      const question = questions.get(selection.questionKey);
      if (!question || question.sourceAnswer.trim() || !/^[A-Z]$/.test(selection.optionLetter) || !question.options.some((option) => option.letter === selection.optionLetter)) {
        throw new AppError("INVALID_SELECTION", "One or more selected answers are no longer valid.", false);
      }
      const document = context.sourceBundle.documents.find((candidate) => candidate.documentKey === question.documentKey)!;
      return {
        documentKey: question.documentKey,
        documentPath: question.documentPath,
        questionKey: question.questionKey,
        identityVersion: 1,
        identityDigest: question.identityDigest,
        canonicalIdentity: question.canonicalIdentity,
        selectedLetter: selection.optionLetter,
        decidedAt: timestamp,
        sourceVersionAtDecision: document.sourceVersion,
        uniqueAtDecision: true
      };
    });
  }

  private workspace(context: ReviewContext): WorkspaceView {
    const effective = context.sourceBundle.documents.flatMap((document) => this.effective(context, document.documentKey));
    return {
      snapshotId: context.snapshotId,
      connection: context.sourceBundle.scope.repositoryKey.startsWith("local:") ? { sourceType: "local", localPath: context.sourceBundle.scope.canonicalUrl, folderPath: context.sourceBundle.scope.folderPath } : { sourceType: "github", repositoryUrl: context.sourceBundle.scope.canonicalUrl, folderPath: context.sourceBundle.scope.folderPath },
      documents: context.sourceBundle.documents.map((document) => {
        const questions = effective.filter((question) => question.documentKey === document.documentKey);
        return { documentKey: document.documentKey, relativePath: document.relativePath, unresolvedCount: questions.filter((question) => question.status === "unresolved").length, completedCount: questions.filter((question) => question.status !== "unresolved").length };
      }),
      unresolvedQuestions: effective.filter((question) => question.status === "unresolved"),
      warnings: [...context.parseResults.values()].flatMap((result) => result.warnings).concat(context.sourceBundle.documents.flatMap(document => this.mergeWarnings(context, document.documentKey)))
    };
  }

  private effective(context: ReviewContext, documentKey: DocumentKey): EffectiveQuestion[] {
    const document = context.sourceBundle.documents.find((candidate) => candidate.documentKey === documentKey)!;
    const saved = this.store.listDecisions(context.sourceBundle.scope.repositoryKey, [document.relativePath]).map((decision) => ({ ...decision, documentKey }));
    return (context.parseResults.get(documentKey)?.questions ?? []).map((question) => {
      const sourceAnswer = question.sourceAnswer.trim();
      const decision = saved.find((candidate) => candidate.questionKey === question.questionKey && candidate.canonicalIdentity === question.canonicalIdentity && candidate.uniqueAtDecision && question.options.some(option => option.letter === candidate.selectedLetter));
      if (sourceAnswer) return { ...this.viewQuestion(question), status: "source_answered", effectiveAnswer: sourceAnswer, answerOrigin: "source" };
      if (decision) return { ...this.viewQuestion(question), status: "local_confirmed", effectiveAnswer: decision.selectedLetter, answerOrigin: "local" };
      return { ...this.viewQuestion(question), status: "unresolved", effectiveAnswer: null, answerOrigin: "none" };
    });
  }

  private mergeWarnings(context: ReviewContext, documentKey: DocumentKey): Warning[] {
    const document = context.sourceBundle.documents.find(candidate => candidate.documentKey === documentKey)!;
    const questions = context.parseResults.get(documentKey)?.questions ?? [];
    const warnings: Warning[] = [];
    for (const decision of this.store.listDecisions(context.sourceBundle.scope.repositoryKey, [document.relativePath])) {
      const question = questions.find(candidate => candidate.questionKey === decision.questionKey && candidate.canonicalIdentity === decision.canonicalIdentity && candidate.options.some(option => option.letter === decision.selectedLetter));
      if (!question) warnings.push({ code: "UNMATCHED_DECISION", documentKey, lineNumber: 1, message: "이 문서에 현재 질문과 연결되지 않는 저장 결정이 있습니다. 기존 결정은 보존됩니다." });
      else if (question.sourceAnswer.trim() && question.sourceAnswer.trim() !== decision.selectedLetter) warnings.push({ code: "DECISION_CONFLICT", documentKey, lineNumber: question.lineNumber, message: "원문 답변과 로컬 결정이 다릅니다. 원문 답변을 우선하며 로컬 결정은 보존됩니다." });
    }
    return warnings;
  }

  private viewQuestion(question: ParsedQuestion): Omit<EffectiveQuestion, "status" | "effectiveAnswer" | "answerOrigin"> {
    return { questionKey: question.questionKey, documentKey: question.documentKey, documentPath: question.documentPath, number: question.number, prompt: question.prompt, options: question.options };
  }

  private requireContext(snapshotId: SnapshotId): ReviewContext {
    if (!this.context || this.context.snapshotId !== snapshotId) throw new AppError("STALE_CONTEXT", "Reconnect to refresh the active documents.", false);
    return this.context;
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.serial.then(operation, operation);
    this.serial = next.then(() => undefined, () => undefined);
    return next;
  }
}

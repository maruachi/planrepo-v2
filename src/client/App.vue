<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { ConnectionInput, DocumentView, WorkspaceView } from "../shared/types.js";
import { api, ApiError } from "./api.js";
import ConnectionForm from "./components/ConnectionForm.vue";
import DocumentList from "./components/DocumentList.vue";
import DocumentViewer from "./components/DocumentViewer.vue";
import DecisionQueue from "./components/DecisionQueue.vue";
import ConfirmBar from "./components/ConfirmBar.vue";
import ExportButton from "./components/ExportButton.vue";
import WarningPanel from "./components/WarningPanel.vue";
import StatusMessage from "./components/StatusMessage.vue";

const recent = ref<ConnectionInput | null>(null);
const workspace = ref<WorkspaceView | null>(null);
const selected = ref("");
const documentView = ref<DocumentView | null>(null);
const pending = ref<Record<string, string>>({});
const operation = ref("");
const documentLoading = ref(false);
const documentError = ref("");
const message = ref("공개 GitHub 또는 로컬 Git 저장소를 연결해 문서를 검토하세요.");
const failed = ref(false);
const busy = computed(() => operation.value !== "");
const selectedCount = computed(() => Object.keys(pending.value).length);
const selectedPath = computed(() => workspace.value?.documents.find(document => document.documentKey === selected.value)?.relativePath ?? "");
let documentSequence = 0;
const errorMessage = (error: unknown): string => error instanceof ApiError ? `${error.message}${error.code === 'STALE_CONTEXT' ? ' 저장소를 다시 연결하세요.' : ''}${error.retryable ? ' 다시 시도할 수 있습니다.' : ''}` : "작업을 완료하지 못했습니다. 다시 시도하세요.";
const status = (text: string, error = false) => { message.value = text; failed.value = error; };

async function openDocument(key: string) {
  if (!workspace.value) return;
  const snapshot = workspace.value.snapshotId;
  const sequence = ++documentSequence;
  selected.value = key;
  documentView.value = null;
  documentLoading.value = true;
  documentError.value = "";
  const current = () => sequence === documentSequence && workspace.value?.snapshotId === snapshot && selected.value === key;
  try { const view = await api.document(snapshot, key); if (current()) documentView.value = view; }
  catch (error) { if (current()) documentError.value = errorMessage(error); }
  finally { if (current()) documentLoading.value = false; }
}

async function connect(input: ConnectionInput) {
  if (busy.value) return;
  operation.value = "connect";
  status("저장소의 Markdown 문서를 읽는 중…");
  try {
    const result = await api.connect(input);
    ++documentSequence;
    workspace.value = result;
    pending.value = {};
    selected.value = "";
    documentView.value = null;
    documentError.value = "";
    documentLoading.value = false;
    recent.value = result.connection;
    status(result.documents.length ? `${result.documents.length}개 문서 연결 · 미결정 질문 ${result.unresolvedQuestions.length}개` : "연결 완료 · Markdown 문서 없음");
    if (result.documents[0]) await openDocument(result.documents[0].documentKey);
  } catch (error) { status(errorMessage(error), true); }
  finally { operation.value = ""; }
}

function selectAnswer(key: string, letter: string) {
  if (!busy.value && workspace.value?.unresolvedQuestions.some(question => question.questionKey === key && question.options.some(option => option.letter === letter))) pending.value = { ...pending.value, [key]: letter };
}
function applyWorkspace(result: WorkspaceView) {
  workspace.value = result;
  const unresolved = new Set(result.unresolvedQuestions.map(question => question.questionKey));
  pending.value = Object.fromEntries(Object.entries(pending.value).filter(([key]) => unresolved.has(key)));
}
async function confirm() {
  if (busy.value || !workspace.value || !selectedCount.value) return;
  const snapshot = workspace.value.snapshotId;
  operation.value = "confirm";
  status("선택한 답변을 저장하는 중…");
  try {
    const result = await api.confirm(snapshot, Object.entries(pending.value).map(([questionKey, optionLetter]) => ({ questionKey, optionLetter })));
    if (workspace.value?.snapshotId !== snapshot) return;
    applyWorkspace(result.workspace);
    status(`${result.decisions.length}개 답변을 로컬에 확정했습니다.`);
    if (selected.value) await openDocument(selected.value);
  } catch (error) { status(errorMessage(error), true); }
  finally { operation.value = ""; }
}
async function refresh() {
  if (busy.value || !workspace.value) return;
  const snapshot = workspace.value.snapshotId;
  operation.value = "refresh";
  try {
    const result = await api.workspace(snapshot);
    if (workspace.value?.snapshotId !== snapshot) return;
    applyWorkspace(result);
    status("저장된 결정 상태를 다시 확인했습니다.");
    if (selected.value) await openDocument(selected.value);
  } catch (error) { status(errorMessage(error), true); }
  finally { operation.value = ""; }
}
async function download() {
  if (busy.value || !workspace.value || !selected.value) return;
  operation.value = "download";
  try {
    const file = await api.download(workspace.value.snapshotId, selected.value);
    const url = URL.createObjectURL(file.blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = file.fileName;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status("확정된 답변을 반영한 Markdown을 다운로드했습니다.");
  } catch (error) { status(errorMessage(error), true); }
  finally { operation.value = ""; }
}
onMounted(async () => {
  operation.value = "initialize";
  try { recent.value = (await api.recent()).recentConnection; }
  catch (error) { status(errorMessage(error), true); }
  finally { operation.value = ""; }
});
</script>
<template>
  <main>
    <header class="app-header"><div><span class="eyebrow">문서에서 다음 결정으로</span><h1>PlanRepo<span class="brand-dot">.</span></h1></div><span class="local-badge">● 로컬 워크스페이스</span></header>
    <ConnectionForm :recent="recent" :busy="busy" @connect="connect" />
    <StatusMessage :message="message" :error="failed" />
    <template v-if="workspace">
      <div class="workspace-info"><span>{{ workspace.connection.repositoryUrl }} <strong>/ {{ workspace.connection.folderPath || '(루트)' }}</strong></span><button class="text-button" data-testid="workspace-refresh-button" :disabled="busy" @click="refresh">저장 상태 다시 확인</button></div>
      <WarningPanel :warnings="workspace.warnings" :documents="workspace.documents" :disabled="busy" @open="openDocument" />
      <div class="workspace-grid">
        <DocumentList :documents="workspace.documents" :selected="selected" :disabled="busy" @open="openDocument" />
        <DocumentViewer :view="documentView" :loading="documentLoading" :error="documentError" :path="selectedPath"><ExportButton :disabled="busy || !selected" :downloading="operation === 'download'" @download="download" /></DocumentViewer>
        <DecisionQueue :questions="workspace.unresolvedQuestions" :pending="pending" :disabled="busy" @select="selectAnswer" @open="openDocument"><ConfirmBar :count="selectedCount" :busy="busy" :saving="operation === 'confirm'" @confirm="confirm" /></DecisionQueue>
      </div>
    </template>
    <section v-else class="welcome-panel"><span class="eyebrow">검토의 시작</span><h2>문서를 읽고,<br>결정을 남기세요.</h2><p>여러 문서의 미응답 질문을 한곳에서 확인하고<br>답변을 확정한 Markdown을 내려받으세요.</p><div class="steps"><span>01 저장소 연결</span><span>02 답변 선택 · 확정</span><span>03 Markdown 다운로드</span></div></section>
  </main>
</template>

<script setup lang="ts">
import type { DocumentView } from "../../shared/types.js";
defineProps<{ view: DocumentView | null; loading: boolean; error: string; path: string }>();
</script>
<template>
  <section class="viewer" aria-label="선택한 문서" :aria-busy="loading">
    <div class="section-heading"><h2>{{ path || '문서 열람' }}</h2><span class="eyebrow">원문</span></div>
    <p v-if="loading" role="status">문서를 읽는 중…</p>
    <p v-else-if="error" role="alert" class="error">{{ error }}</p>
    <template v-else-if="view">
      <article class="markdown-body" data-testid="document-viewer-content" v-html="view.safeHtml"></article>
      <section v-if="view.effectiveQuestions.length" class="decision-status" aria-label="문서 결정 상태">
        <h3>결정 상태</h3><p class="hint">본문은 조회한 원문입니다. 로컬에 확정된 답변은 다운로드에 반영됩니다.</p>
        <p v-for="question in view.effectiveQuestions" :key="question.questionKey">질문 {{ question.number }} · {{ question.status === 'local_confirmed' ? '로컬에 확정됨' : question.status === 'source_answered' ? '원문 답변' : '미결정' }}<strong v-if="question.effectiveAnswer"> — {{ question.effectiveAnswer }}</strong></p>
      </section>
    </template>
    <p v-else class="empty">목록에서 검토할 문서를 선택하세요.</p>
    <slot></slot>
  </section>
</template>

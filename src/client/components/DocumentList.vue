<script setup lang="ts">
import type { DocumentSummary } from "../../shared/types.js";
defineProps<{ documents: DocumentSummary[]; selected: string; disabled: boolean }>();
defineEmits<{ open: [key: string] }>();
</script>
<template>
  <nav class="document-list" aria-label="문서 목록">
    <h2>문서 <span class="count">{{ documents.length }}</span></h2>
    <p v-if="!documents.length" class="empty">Markdown 문서 없음</p>
    <button v-for="document in documents" :key="document.documentKey" data-testid="document-list-open-button" :data-document-key="document.documentKey" :class="{ active: selected === document.documentKey }" :aria-current="selected === document.documentKey ? 'page' : undefined" :disabled="disabled" @click="$emit('open', document.documentKey)">
      <span class="document-path">{{ document.relativePath }}</span><small>미결정 {{ document.unresolvedCount }} · 완료 {{ document.completedCount }}</small>
    </button>
  </nav>
</template>

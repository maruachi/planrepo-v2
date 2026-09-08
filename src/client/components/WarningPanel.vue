<script setup lang="ts">
import type { DocumentSummary, Warning } from "../../shared/types.js";
defineProps<{ warnings: Warning[]; documents: DocumentSummary[]; disabled: boolean }>();
defineEmits<{ open: [key: string] }>();
</script>
<template><section v-if="warnings.length" class="warnings" aria-label="문서 경고"><h2>확인이 필요한 항목 {{ warnings.length }}개</h2><ul><li v-for="(warning, index) in warnings" :key="index"><button class="text-button" data-testid="warning-panel-document-button" :disabled="disabled" @click="$emit('open', warning.documentKey)">{{ documents.find(document => document.documentKey === warning.documentKey)?.relativePath }} · {{ warning.lineNumber }}행</button> — {{ warning.message }}</li></ul></section></template>

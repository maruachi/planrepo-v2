<script setup lang="ts">
defineProps<{ disabled: boolean; downloading: boolean }>();
defineEmits<{ download: [] }>();
</script>
<template><div class="export-bar"><button data-testid="export-button-download-button" :disabled="disabled || downloading" @click="$emit('download')">{{ downloading ? '다운로드 중…' : 'Markdown 다운로드 ↓' }}</button><small>확정된 답변만 포함</small></div></template>

<script setup lang="ts">
defineProps<{ count: number; busy: boolean; saving: boolean }>();
defineEmits<{ confirm: [] }>();
</script>
<template><div class="confirm-bar"><span aria-live="polite">{{ count }}개 선택</span><button class="primary" data-testid="confirm-bar-submit-button" :disabled="busy || count === 0" @click="$emit('confirm')">{{ saving ? '저장 중…' : '선택 답변 일괄 확정' }}</button></div></template>

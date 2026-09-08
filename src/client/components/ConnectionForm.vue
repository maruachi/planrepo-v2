<script setup lang="ts">
import { ref, watch } from "vue";
import type { ConnectionInput } from "../../shared/types.js";
const props = defineProps<{ recent: ConnectionInput | null; busy: boolean }>();
const emit = defineEmits<{ connect: [input: ConnectionInput] }>();
const repositoryUrl = ref("");
const folderPath = ref("");
watch(() => props.recent, (input) => { if (input) { repositoryUrl.value = input.repositoryUrl; folderPath.value = input.folderPath; } }, { immediate: true });
</script>
<template>
  <form class="connection-form" data-testid="connection-form" @submit.prevent="emit('connect', { repositoryUrl, folderPath })">
    <label>공개 GitHub 저장소<input v-model="repositoryUrl" data-testid="connection-form-repository-input" type="url" required placeholder="https://github.com/owner/repository" :disabled="busy"></label>
    <label>문서 폴더<input v-model="folderPath" data-testid="connection-form-folder-input" placeholder="aidlc-docs (빈 값은 루트)" :disabled="busy"></label>
    <button class="primary" data-testid="connection-form-submit-button" :disabled="busy || !repositoryUrl.trim()">{{ busy ? '처리 중…' : '저장소 연결' }}</button>
    <p class="hint">기본 브랜치의 하위 폴더까지 읽습니다. 재연결에 성공하면 미확정 선택이 초기화됩니다.</p>
  </form>
</template>

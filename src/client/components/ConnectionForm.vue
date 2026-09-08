<script setup lang="ts">
import { ref, watch } from "vue";
import type { ConnectionInput } from "../../shared/types.js";
const props = defineProps<{ recent: ConnectionInput | null; busy: boolean }>();
const emit = defineEmits<{ connect: [input: ConnectionInput] }>();
const repositoryUrl = ref("");
const localPath = ref("");
const folderPath = ref("");
const sourceType = ref<"github" | "local">("github");
watch(() => props.recent, (input) => { if (input) { sourceType.value = input.sourceType ?? "github"; repositoryUrl.value = input.repositoryUrl ?? ""; localPath.value = input.localPath ?? ""; folderPath.value = input.folderPath; } }, { immediate: true });
</script>
<template>
  <form class="connection-form" data-testid="connection-form" @submit.prevent="emit('connect', sourceType === 'github' ? { sourceType, repositoryUrl, folderPath } : { sourceType, localPath, folderPath })">
    <label>문서 소스<select v-model="sourceType" data-testid="connection-form-source-type-select" :disabled="busy"><option value="github">공개 GitHub</option><option value="local">로컬 Git</option></select></label>
    <label v-if="sourceType === 'github'">공개 GitHub 저장소<input v-model="repositoryUrl" data-testid="connection-form-repository-input" type="url" required placeholder="https://github.com/owner/repository" :disabled="busy"></label>
    <label v-else>로컬 저장소 루트<input v-model="localPath" data-testid="connection-form-local-path-input" required placeholder="/absolute/path/to/repository" :disabled="busy"></label>
    <label>문서 폴더<input v-model="folderPath" data-testid="connection-form-folder-input" placeholder="aidlc-docs (빈 값은 루트)" :disabled="busy"></label>
    <button class="primary" data-testid="connection-form-submit-button" :disabled="busy || (sourceType === 'github' ? !repositoryUrl.trim() : !localPath.trim())">{{ busy ? '처리 중…' : '저장소 연결' }}</button>
    <p class="hint">GitHub는 기본 브랜치, 로컬 Git은 현재 HEAD의 하위 폴더까지 읽습니다.</p>
  </form>
</template>

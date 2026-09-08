<script setup lang="ts">
import type { EffectiveQuestion } from "../../shared/types.js";
import DecisionQueueItem from "./DecisionQueueItem.vue";
defineProps<{ questions: EffectiveQuestion[]; pending: Record<string, string>; disabled: boolean }>();
defineEmits<{ select: [key: string, letter: string]; open: [key: string] }>();
</script>
<template>
  <section class="queue" aria-label="전체 미결정 질문">
    <div class="section-heading"><h2>결정 대기열 <span class="count">{{ questions.length }}</span></h2><span class="eyebrow">전체 문서</span></div>
    <p v-if="!questions.length" class="empty">유효한 미결정 질문이 없습니다. 문서 경고가 있으면 함께 확인하세요.</p>
    <DecisionQueueItem v-for="question in questions" :key="question.questionKey" :question="question" :selected="pending[question.questionKey]" :disabled="disabled" @select="(key, letter) => $emit('select', key, letter)" @open="$emit('open', $event)" />
    <slot></slot>
  </section>
</template>

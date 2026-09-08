<script setup lang="ts">
import type { EffectiveQuestion } from "../../shared/types.js";
defineProps<{ question: EffectiveQuestion; selected: string | undefined; disabled: boolean }>();
defineEmits<{ select: [key: string, letter: string]; open: [key: string] }>();
</script>
<template>
  <fieldset class="question-card" :disabled="disabled" :data-question-key="question.questionKey">
    <legend>질문 {{ question.number }}</legend>
    <button type="button" class="text-button" data-testid="decision-queue-document-button" :data-question-key="question.questionKey" @click="$emit('open', question.documentKey)">{{ question.documentPath }}</button>
    <p class="question-prompt">{{ question.prompt }}</p>
    <label v-for="option in question.options" :key="option.letter" class="option" :class="{ chosen: selected === option.letter }">
      <input type="radio" data-testid="decision-queue-option-radio" :data-question-key="question.questionKey" :data-option-letter="option.letter" :name="question.questionKey" :value="option.letter" :checked="selected === option.letter" @change="$emit('select', question.questionKey, option.letter)"><span><strong>{{ option.letter }}</strong> {{ option.content }}</span>
    </label>
  </fieldset>
</template>

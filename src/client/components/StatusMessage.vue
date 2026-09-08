<script setup lang="ts">
defineProps<{ message: string; error: boolean }>();
</script>
<template><p class="status-message" :class="{ error }" :role="error ? 'alert' : 'status'" aria-live="polite" data-testid="status-message-text">{{ message }}</p></template>

<template>
  <div
    class="skeleton-card"
    :style="{ height }"
  ></div>
</template>

<script setup>
  defineProps({
    height: {
      type: String,
      default: '18px',
    },
  });
</script>

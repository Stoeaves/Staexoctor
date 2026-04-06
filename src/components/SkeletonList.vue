<template>
  <div class="list">
    <div
      v-for="i in count"
      :key="i"
      class="list-item"
    >
      <div
        class="skeleton-card"
        style="height: 20px; width: 40%; margin-bottom: 10px"
      ></div>
      <div
        class="skeleton-card"
        style="height: 14px; width: 85%; margin-bottom: 8px"
      ></div>
      <div
        class="skeleton-card"
        style="height: 14px; width: 60%"
      ></div>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    count: {
      type: Number,
      default: 5,
    },
  });
</script>

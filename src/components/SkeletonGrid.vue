<template>
  <div class="grid">
    <div
      v-for="i in count"
      :key="i"
      class="image-card"
    >
      <div
        class="skeleton-card"
        style="height: 180px; border-radius: 0"
      ></div>
      <div class="image-info">
        <div
          class="skeleton-card"
          style="height: 18px; width: 60%; margin-bottom: 8px"
        ></div>
        <div
          class="skeleton-card"
          style="height: 14px; width: 90%; margin-bottom: 8px"
        ></div>
        <div
          class="skeleton-card"
          style="height: 14px; width: 40%"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    count: {
      type: Number,
      default: 6,
    },
  });
</script>

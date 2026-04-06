<template>
  <div class="panel">
    <div class="empty">
      <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px">{{ title }}</div>
      <div>{{ desc }}</div>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    title: String,
    desc: String,
  });
</script>

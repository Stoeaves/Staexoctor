<template>
  <div
    class="panel site-switcher-panel"
    style="padding: 14px"
  >
    <div class="label">当前站点</div>
    <select
      class="select"
      v-model="selected"
      @change="changeSite"
    >
      <option value="">请选择站点</option>
      <option
        v-for="site in appStore.sites"
        :key="site.id"
        :value="site.id"
      >
        {{ site.remark || site.blogRepoName }}
      </option>
    </select>
  </div>
</template>

<script setup>
  import { computed } from 'vue';
  import { appStore, setCurrentSiteId } from '../store/app';
  import { showInfo } from '../utils/helpers';

  const emit = defineEmits(['changed']);

  const selected = computed({
    get: () => appStore.currentSiteId,
    set: (val) => setCurrentSiteId(val),
  });

  function changeSite() {
    showInfo('站点已切换，正在预加载文章与图片');
    emit('changed');
  }
</script>

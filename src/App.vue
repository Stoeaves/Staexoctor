<template>
  <div class="app-shell">
    <div
      v-show="globalLoading"
      class="global-loading-bar"
    ></div>

    <router-view />

    <ConfirmDialog
      v-if="appStore.routeLeaveConfirm.visible"
      title="离开确认"
      :message="appStore.routeLeaveConfirm.message"
      :danger="false"
      @confirm="confirmRouteLeave"
      @cancel="cancelRouteLeave"
    />
  </div>
</template>

<script setup>
  import { useRouter } from 'vue-router';
  import ConfirmDialog from './components/ConfirmDialog.vue';
  import { globalLoading, appStore, closeRouteLeaveConfirm } from './store/app';
  import { allowNextRouteLeave } from './router';

  const router = useRouter();

  function confirmRouteLeave() {
    const target = appStore.routeLeaveConfirm.target;
    closeRouteLeaveConfirm();

    if (target) {
      window.__STAEXOCTOR_EDITOR_DIRTY__ = false;
      allowNextRouteLeave();
      router.push(target);
    }
  }

  function cancelRouteLeave() {
    closeRouteLeaveConfirm();
  }
</script>

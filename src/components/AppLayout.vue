<template>
  <div class="page-wrap">
    <div class="layout">
      <aside class="sidebar desktop-only">
        <div class="brand">Staexoctor</div>
        <SiteSwitcher @changed="handleSiteChanged" />
        <div
          class="nav"
          style="margin-top: 18px"
        >
          <router-link
            class="nav-item"
            to="/dashboard"
            active-class="active"
            >概览</router-link
          >
          <router-link
            class="nav-item"
            to="/articles"
            active-class="active"
            >文章</router-link
          >
          <router-link
            class="nav-item"
            to="/images"
            active-class="active"
            >图片</router-link
          >
          <router-link
            class="nav-item"
            to="/sites"
            active-class="active"
            >站点</router-link
          >
          <router-link
            class="nav-item"
            to="/settings"
            active-class="active"
            >设置</router-link
          >
          <a
            class="nav-item"
            href="javascript:void(0)"
            @click="logout"
            >退出登录</a
          >
        </div>
      </aside>

      <main class="main">
        <div class="mobile-topbar mobile-only panel">
          <div class="mobile-topbar-head">
            <div
              class="brand"
              style="margin: 0"
            >
              Staexoctor
            </div>

            <button
              class="mobile-icon-btn"
              @click="menuOpen = !menuOpen"
              :aria-label="menuOpen ? '收起菜单' : '展开菜单'"
              :title="menuOpen ? '收起菜单' : '展开菜单'"
            >
              <svg
                v-if="!menuOpen"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="mobile-icon-svg"
              >
                <line
                  x1="3"
                  y1="6"
                  x2="21"
                  y2="6"
                ></line>
                <line
                  x1="3"
                  y1="12"
                  x2="21"
                  y2="12"
                ></line>
                <line
                  x1="3"
                  y1="18"
                  x2="21"
                  y2="18"
                ></line>
              </svg>

              <svg
                v-else
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="mobile-icon-svg"
              >
                <line
                  x1="18"
                  y1="6"
                  x2="6"
                  y2="18"
                ></line>
                <line
                  x1="6"
                  y1="6"
                  x2="18"
                  y2="18"
                ></line>
              </svg>
            </button>
          </div>

          <div
            v-show="menuOpen"
            class="mobile-menu-wrap"
          >
            <SiteSwitcher @changed="handleSiteChanged" />
            <div class="mobile-nav-selects">
              <select
                class="select"
                :value="$route.path"
                @change="goRoute($event.target.value)"
              >
                <option value="/dashboard">概览</option>
                <option value="/articles">文章</option>
                <option value="/images">图片</option>
                <option value="/sites">站点</option>
                <option value="/settings">设置</option>
              </select>

              <button
                class="btn danger"
                @click="logout"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>

        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
  import { onMounted, ref, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import SiteSwitcher from './SiteSwitcher.vue';
  import { clearToken } from '../utils/auth';
  import { appStore, resetSiteCaches, setCurrentSiteId } from '../store/app';
  import { api } from '../api/request';
  import { preloadSiteData } from '../utils/preload';
  import { showError } from '../utils/helpers';

  const router = useRouter();
  const route = useRoute();
  const menuOpen = ref(false);

  onMounted(async () => {
    await ensureSitesLoaded();
    await ensureDefaultSiteSelected();
    await preloadCurrentSite();
  });

  watch(
    () => appStore.currentSiteId,
    async (id, oldId) => {
      if (!id || id === oldId) return;
      await preloadCurrentSite();
    },
  );

  async function ensureSitesLoaded() {
    try {
      if (appStore.loaded.sites) return;
      const res = await api.getSites();
      appStore.sites = res.data || [];
      appStore.loaded.sites = true;
    } catch (err) {
      showError(err.message);
    }
  }

  async function ensureDefaultSiteSelected() {
    if (!appStore.currentSiteId && appStore.sites[0]) {
      setCurrentSiteId(appStore.sites[0].id);
    }
  }

  async function preloadCurrentSite() {
    if (!appStore.currentSiteId) return;
    await preloadSiteData(appStore.currentSiteId);
  }

  async function handleSiteChanged() {
    resetSiteCaches();
    await preloadCurrentSite();
  }

  function goRoute(path) {
    menuOpen.value = false;
    if (route.path !== path) {
      router.push(path);
    }
  }

  function logout() {
    clearToken();
    localStorage.removeItem('staexoctor_current_site_id');
    router.push('/login');
  }
</script>

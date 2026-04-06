import { createRouter, createWebHashHistory } from 'vue-router';
import InitView from '../views/InitView.vue';
import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';
import ArticlesView from '../views/ArticlesView.vue';
import EditorView from '../views/EditorView.vue';
import ImagesView from '../views/ImagesView.vue';
import SettingsView from '../views/SettingsView.vue';
import SitesView from '../views/SitesView.vue';
import { getToken } from '../utils/auth';
import { openRouteLeaveConfirm } from '../store/app';

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/init', component: InitView },
  { path: '/login', component: LoginView },
  { path: '/dashboard', component: DashboardView },
  { path: '/articles', component: ArticlesView },
  { path: '/editor', component: EditorView },
  { path: '/images', component: ImagesView },
  { path: '/settings', component: SettingsView },
  { path: '/sites', component: SitesView },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

let bypassRouteLeaveGuard = false;

export function allowNextRouteLeave() {
  bypassRouteLeaveGuard = true;
}

router.beforeEach(async (to, from, next) => {
  if (bypassRouteLeaveGuard) {
    bypassRouteLeaveGuard = false;
    next();
    return;
  }

  if (from.path === '/editor' && to.path !== '/editor') {
    const dirty = window.__STAEXOCTOR_EDITOR_DIRTY__;
    if (dirty) {
      openRouteLeaveConfirm(to.fullPath);
      next(false);
      return;
    }
  }

  if (to.path === '/init' || to.path === '/login') {
    next();
    return;
  }

  const initialized = localStorage.getItem('staexoctor_initialized');
  if (initialized !== '1') {
    next('/init');
    return;
  }

  const token = getToken();
  if (!token) {
    next('/login');
    return;
  }

  next();
});

export default router;

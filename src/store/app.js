import { reactive, ref, computed } from 'vue';

export const appStore = reactive({
  settings: {},
  sites: [],
  currentSiteId: localStorage.getItem('staexoctor_current_site_id') || '',
  articles: [],
  images: [],
  draftVersion: 0,
  listLoading: {
    articles: false,
    images: false,
  },
  loaded: {
    settings: false,
    sites: false,
    articlesForSite: '',
    imagesForSite: '',
  },
  routeLeaveConfirm: {
    visible: false,
    target: null,
    message: '当前内容尚未保存到远程，确定离开吗？',
  },
});

export const editorState = reactive({
  currentPath: '',
  currentName: '',
  currentContent: '',
  currentStatus: 'published',
  currentSource: 'remote',
});

export const requestCounter = ref(0);

export const globalLoading = computed(() => requestCounter.value > 0);

export function beginRequest() {
  requestCounter.value++;
}

export function endRequest() {
  requestCounter.value = Math.max(0, requestCounter.value - 1);
}

export function setCurrentSiteId(id) {
  appStore.currentSiteId = id;
  localStorage.setItem('staexoctor_current_site_id', id);
}

export function resetSiteCaches() {
  appStore.articles = [];
  appStore.images = [];
  appStore.loaded.articlesForSite = '';
  appStore.loaded.imagesForSite = '';
  appStore.listLoading.articles = false;
  appStore.listLoading.images = false;
  appStore.draftVersion++;
}

export function touchDraftVersion() {
  appStore.draftVersion++;
}

export function openRouteLeaveConfirm(target, message = '当前内容尚未保存到远程，确定离开吗？') {
  appStore.routeLeaveConfirm.visible = true;
  appStore.routeLeaveConfirm.target = target;
  appStore.routeLeaveConfirm.message = message;
}

export function closeRouteLeaveConfirm() {
  appStore.routeLeaveConfirm.visible = false;
  appStore.routeLeaveConfirm.target = null;
}

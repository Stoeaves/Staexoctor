import { api } from '../api/request';
import { appStore } from '../store/app';

let articlesLoadingFor = '';
let imagesLoadingFor = '';
let preloadTipLock = false;

function showPreloadTip() {
  if (preloadTipLock) return;
  preloadTipLock = true;
  window.cocoMessage?.info('正在预加载文章与图片...');
  setTimeout(() => {
    preloadTipLock = false;
  }, 1200);
}

export async function preloadSiteData(siteId, silent = false) {
  if (!siteId) return;

  const shouldLoadArticles = appStore.loaded.articlesForSite !== siteId && articlesLoadingFor !== siteId;
  const shouldLoadImages = appStore.loaded.imagesForSite !== siteId && imagesLoadingFor !== siteId;

  if (!silent && (shouldLoadArticles || shouldLoadImages)) {
    showPreloadTip();
  }

  const tasks = [];

  if (shouldLoadArticles) {
    articlesLoadingFor = siteId;
    appStore.listLoading.articles = true;

    tasks.push(
      api
        .getArticles(siteId)
        .then((res) => {
          appStore.articles = res.data || [];
          appStore.loaded.articlesForSite = siteId;
        })
        .finally(() => {
          if (articlesLoadingFor === siteId) articlesLoadingFor = '';
          appStore.listLoading.articles = false;
        }),
    );
  }

  if (shouldLoadImages) {
    imagesLoadingFor = siteId;
    appStore.listLoading.images = true;

    tasks.push(
      api
        .getImages(siteId)
        .then((res) => {
          appStore.images = res.data || [];
          appStore.loaded.imagesForSite = siteId;
        })
        .finally(() => {
          if (imagesLoadingFor === siteId) imagesLoadingFor = '';
          appStore.listLoading.images = false;
        }),
    );
  }

  await Promise.allSettled(tasks);
}

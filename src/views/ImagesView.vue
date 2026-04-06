<template>
  <AppLayout>
    <div class="panel">
      <div class="panel-title">图片管理</div>
      <div class="panel-desc">上传、浏览、复制 CDN 链接、删除图片，支持多图批量上传与批量删除。</div>

      <template v-if="!appStore.currentSiteId">
        <div class="empty">请先选择站点</div>
      </template>

      <template v-else>
        <ImageUploader @upload="uploadImages" />

        <div style="height: 18px"></div>

        <div
          class="row wrap"
          style="margin-bottom: 16px"
        >
          <input
            v-model="keyword"
            class="input"
            style="max-width: 280px"
            placeholder="搜索图片文件名"
          />

          <select
            v-model="sortType"
            class="select"
            style="max-width: 200px"
          >
            <option value="latest">按最新上传</option>
            <option value="name-asc">文件名 A-Z</option>
            <option value="name-desc">文件名 Z-A</option>
          </select>

          <button
            class="btn secondary"
            @click="toggleSelectAll"
            :disabled="filteredImages.length === 0"
          >
            {{ isAllSelected ? '取消全选' : '全选' }}
          </button>

          <button
            class="btn secondary"
            @click="copyAllUrls"
            :disabled="filteredImages.length === 0"
          >
            复制全部链接
          </button>

          <button
            class="btn secondary"
            @click="copyAllMarkdown"
            :disabled="filteredImages.length === 0"
          >
            复制全部 Markdown
          </button>

          <button
            class="btn danger"
            @click="askRemoveSelected"
            :disabled="selectedPaths.size === 0"
          >
            批量删除（{{ selectedPaths.size }}）
          </button>
        </div>

        <SkeletonGrid
          v-if="appStore.listLoading.images"
          :count="6"
        />

        <div
          v-else-if="filteredImages.length === 0"
          class="empty"
        >
          暂无图片
        </div>

        <div
          v-else
          class="grid"
        >
          <div
            v-for="item in filteredImages"
            :key="item.path"
            class="image-card selectable-image-card"
            :class="{ selected: selectedPaths.has(item.path) }"
          >
            <div class="image-select-checkbox">
              <input
                type="checkbox"
                :checked="selectedPaths.has(item.path)"
                @change="toggleSelect(item.path)"
              />
            </div>

            <div
              class="image-preview"
              @click="previewImage(item)"
              style="cursor: pointer"
            >
              <img
                :src="item.cdnUrl"
                :alt="item.name"
              />
            </div>

            <div class="image-info">
              <div style="font-weight: 700; margin-bottom: 6px">{{ item.name }}</div>
              <div class="meta">{{ item.path }}</div>
              <div
                class="meta"
                style="margin: 6px 0 12px"
              >
                {{ formatSize(item.size) }}
              </div>

              <div class="image-action-icons">
                <button
                  class="icon-action-btn"
                  title="复制链接"
                  aria-label="复制链接"
                  @click="copyUrl(item.cdnUrl)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    class="icon-action-svg"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect
                      x="9"
                      y="9"
                      width="13"
                      height="13"
                      rx="2"
                    ></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>

                <button
                  class="icon-action-btn"
                  title="复制 Markdown"
                  aria-label="复制 Markdown"
                  @click="copyMarkdown(item)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    class="icon-action-svg"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M4 6h16v12H4z"></path>
                    <path d="M8 10v4"></path>
                    <path d="M8 10l2 2 2-2"></path>
                    <path d="M14 14h4"></path>
                  </svg>
                </button>

                <button
                  class="icon-action-btn"
                  title="复制 HTML"
                  aria-label="复制 HTML"
                  @click="copyHtml(item)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    class="icon-action-svg"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M8 9l-3 3 3 3"></path>
                    <path d="M16 9l3 3-3 3"></path>
                    <path d="M13 7l-2 10"></path>
                  </svg>
                </button>

                <button
                  class="icon-action-btn"
                  title="预览图片"
                  aria-label="预览图片"
                  @click="previewImage(item)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    class="icon-action-svg"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path>
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                    ></circle>
                  </svg>
                </button>

                <button
                  class="icon-action-btn danger"
                  title="删除图片"
                  aria-label="删除图片"
                  @click="askRemove(item)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    class="icon-action-svg"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                    <path d="M10 11v6"></path>
                    <path d="M14 11v6"></path>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <ConfirmDialog
      v-if="confirmState.visible"
      :title="confirmState.title"
      :message="confirmState.message"
      :danger="confirmState.danger"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />

    <ImagePreviewModal
      v-if="previewState.visible"
      :image="previewState.image"
      @close="closePreview"
    />
  </AppLayout>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue';
  import AppLayout from '../components/AppLayout.vue';
  import ImageUploader from '../components/ImageUploader.vue';
  import SkeletonGrid from '../components/SkeletonGrid.vue';
  import ConfirmDialog from '../components/ConfirmDialog.vue';
  import ImagePreviewModal from '../components/ImagePreviewModal.vue';
  import { appStore } from '../store/app';
  import { api } from '../api/request';
  import { preloadSiteData } from '../utils/preload';
  import { formatSize, showError, showInfo, showSuccess } from '../utils/helpers';

  const selectedPaths = ref(new Set());
  const keyword = ref('');
  const sortType = ref('latest');

  const confirmState = ref({
    visible: false,
    title: '',
    message: '',
    danger: false,
    action: null,
  });

  const previewState = ref({
    visible: false,
    image: null,
  });

  const filteredImages = computed(() => {
    let list = [...appStore.images];

    const kw = keyword.value.trim().toLowerCase();
    if (kw) {
      list = list.filter((item) => item.name.toLowerCase().includes(kw));
    }

    if (sortType.value === 'name-asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortType.value === 'name-desc') {
      list.sort((a, b) => b.name.localeCompare(a.name));
    } else {
      list.sort((a, b) => (b.path || '').localeCompare(a.path || ''));
    }

    return list;
  });

  const isAllSelected = computed(() => {
    return filteredImages.value.length > 0 && filteredImages.value.every((item) => selectedPaths.value.has(item.path));
  });

  onMounted(async () => {
    if (!appStore.currentSiteId) return;

    try {
      if (appStore.loaded.imagesForSite !== appStore.currentSiteId) {
        await preloadSiteData(appStore.currentSiteId);
      }
    } catch (err) {
      showError(err.message);
    }
  });

  function toggleSelect(path) {
    const next = new Set(selectedPaths.value);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    selectedPaths.value = next;
  }

  function toggleSelectAll() {
    const next = new Set(selectedPaths.value);

    if (isAllSelected.value) {
      filteredImages.value.forEach((item) => next.delete(item.path));
    } else {
      filteredImages.value.forEach((item) => next.add(item.path));
    }

    selectedPaths.value = next;
  }

  async function uploadSingleImage(file, base64) {
    const finalName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/\s+/g, '-')}`;
    const res = await api.uploadImage({
      siteId: appStore.currentSiteId,
      fileName: finalName,
      base64Content: base64,
    });

    const item = {
      name: finalName,
      path: res.data.path,
      size: file.size,
      cdnUrl: res.data.url,
    };

    appStore.images.unshift(item);
    return item;
  }

  async function uploadImages(payloads) {
    try {
      const list = Array.isArray(payloads) ? payloads : [payloads];
      if (!list.length) return;

      if (list.length > 1) {
        showInfo(`检测到 ${list.length} 张图片，正在批量上传...`);
      }

      const uploadedItems = [];

      for (const item of list) {
        const uploaded = await uploadSingleImage(item.file, item.base64);
        uploadedItems.push(uploaded);
      }

      if (uploadedItems.length === 1) {
        await navigator.clipboard.writeText(uploadedItems[0].cdnUrl);
        showSuccess('上传成功，链接已复制');
      } else {
        const urls = uploadedItems.map((i) => i.cdnUrl).join('\n');
        await navigator.clipboard.writeText(urls);
        showSuccess(`已上传 ${uploadedItems.length} 张图片，全部链接已复制`);
      }
    } catch (err) {
      showError(err.message);
      throw err;
    }
  }

  function askRemove(item) {
    confirmState.value = {
      visible: true,
      title: '删除图片',
      message: `确认删除图片：${item.name}？`,
      danger: true,
      action: () => remove(item),
    };
  }

  function askRemoveSelected() {
    const paths = Array.from(selectedPaths.value);
    if (!paths.length) return;

    confirmState.value = {
      visible: true,
      title: '批量删除图片',
      message: `确认批量删除选中的 ${paths.length} 张图片？`,
      danger: true,
      action: () => removeSelected(),
    };
  }

  async function remove(item) {
    try {
      await api.deleteImage({
        siteId: appStore.currentSiteId,
        path: item.path,
      });

      appStore.images = appStore.images.filter((i) => i.path !== item.path);

      const next = new Set(selectedPaths.value);
      next.delete(item.path);
      selectedPaths.value = next;

      showSuccess('删除成功');
    } catch (err) {
      showError(err.message);
    }
  }

  async function removeSelected() {
    const paths = Array.from(selectedPaths.value);
    if (!paths.length) return;

    try {
      for (const path of paths) {
        await api.deleteImage({
          siteId: appStore.currentSiteId,
          path,
        });
      }

      appStore.images = appStore.images.filter((i) => !selectedPaths.value.has(i.path));
      selectedPaths.value = new Set();

      showSuccess('批量删除成功');
    } catch (err) {
      showError(err.message);
    }
  }

  async function copyUrl(url) {
    await navigator.clipboard.writeText(url);
    showSuccess('链接已复制');
  }

  async function copyMarkdown(item) {
    await navigator.clipboard.writeText(`![${item.name}](${item.cdnUrl})`);
    showSuccess('Markdown 链接已复制');
  }

  async function copyHtml(item) {
    await navigator.clipboard.writeText(`<img src="${item.cdnUrl}" alt="${item.name}" />`);
    showSuccess('HTML 链接已复制');
  }

  async function copyAllUrls() {
    if (!filteredImages.value.length) return;
    const urls = filteredImages.value.map((item) => item.cdnUrl).join('\n');
    await navigator.clipboard.writeText(urls);
    showSuccess('全部图片链接已复制');
  }

  async function copyAllMarkdown() {
    if (!filteredImages.value.length) return;
    const content = filteredImages.value.map((item) => `![${item.name}](${item.cdnUrl})`).join('\n');
    await navigator.clipboard.writeText(content);
    showSuccess('全部 Markdown 链接已复制');
  }

  function previewImage(item) {
    previewState.value.visible = true;
    previewState.value.image = item;
  }

  function closePreview() {
    previewState.value.visible = false;
    previewState.value.image = null;
  }

  function handleConfirm() {
    const action = confirmState.value.action;
    confirmState.value.visible = false;
    confirmState.value.action = null;
    if (action) action();
  }

  function handleCancel() {
    confirmState.value.visible = false;
    confirmState.value.action = null;
  }
</script>

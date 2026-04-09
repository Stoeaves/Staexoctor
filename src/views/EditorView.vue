<template>
  <AppLayout>
    <div
      class="panel editor-page-panel editor-drop-host"
      @dragenter.prevent="handleDragEnter"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDropToOverlay"
      @paste="handlePaste"
    >
      <div class="editor-header-block">
        <div class="editor-header-top">
          <div class="editor-header-main">
            <div class="panel-title">编辑文章</div>
            <div class="panel-desc">仅需填写文件名，草稿为未上线，保存后为已上线。</div>
          </div>

          <div class="editor-toolbar-compact">
            <button
              class="btn secondary editor-top-btn"
              @click="openImagePicker"
            >
              图库
            </button>
            <ImageUploader
              mode="compact"
              button-text="插入图片"
              @upload="uploadAndInsertImages"
            />
          </div>
        </div>

        <div class="editor-header-bottom">
          <div class="editor-filename-wrap">
            <label class="label">文件名</label>
            <input
              v-model="fileName"
              class="input"
              placeholder="例如 hello-world.md"
              @input="handleFileNameInput"
              @focus="handleFileNameInput"
              @blur="handleFileNameBlur"
            />

            <div
              v-if="showSuggestions && suggestions.length > 0"
              class="editor-suggestion-list"
            >
              <div
                v-for="item in suggestions"
                :key="`${item.source}-${item.path}`"
                class="editor-suggestion-item"
                @mousedown.prevent="selectSuggestion(item)"
              >
                <div class="row between">
                  <div style="font-weight: 600">{{ item.name }}</div>
                  <span
                    class="badge"
                    :style="{
                      background: item.status === 'draft' ? '#fff7ed' : '#e8f1ff',
                      color: item.status === 'draft' ? '#ea580c' : '#2563eb',
                    }"
                  >
                    {{ item.status === 'draft' ? '草稿 / 未上线' : '文章 / 已上线' }}
                  </span>
                </div>
                <div class="meta">{{ item.path }}</div>
              </div>
            </div>
          </div>

          <div class="editor-action-row">
            <button
              class="btn secondary editor-action-btn"
              :disabled="draftSaving"
              @click="saveDraft"
            >
              {{ draftSaving ? '保存中...' : '保存草稿' }}
            </button>

            <button
              class="btn success editor-action-btn"
              :disabled="publishing"
              @click="save"
            >
              {{ publishing ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>

        <div
          class="editor-inline-status"
          v-if="inlineStatus"
        >
          <span
            class="badge"
            :style="{
              background: inlineStatusType === 'error' ? '#fee2e2' : '#e8f1ff',
              color: inlineStatusType === 'error' ? '#dc2626' : '#2563eb',
            }"
          >
            {{ inlineStatus }}
          </span>
        </div>
      </div>

      <template v-if="!appStore.currentSiteId">
        <div class="empty">请先选择站点</div>
      </template>

      <div
        v-else
        class="editor-page-body"
      >
        <MarkdownEditor
          ref="editorRef"
          v-model="content"
          :is-paste-upload="pasteUploading"
          @upload-images="handleEditorUploadImages"
        />
      </div>

      <div
        v-if="showDropOverlay"
        class="editor-drop-overlay"
      >
        <div
          class="editor-drop-overlay-mask"
          @click="hideOverlay"
        ></div>
        <div class="editor-drop-overlay-content">
          <ImageUploader
            mode="drop-overlay"
            @upload="uploadAndInsertImages"
          />
          <div
            class="meta"
            style="margin-top: 10px; text-align: center"
          >
            松开鼠标即可上传，或点击按钮选择图片，支持多图
          </div>
        </div>
      </div>
    </div>

    <ImagePickerModal
      v-if="showImagePicker"
      :images="appStore.images"
      @close="showImagePicker = false"
      @select="insertFromGallery"
    />
  </AppLayout>
</template>

<script setup>
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
  import AppLayout from '../components/AppLayout.vue';
  import MarkdownEditor from '../components/MarkdownEditor.vue';
  import ImageUploader from '../components/ImageUploader.vue';
  import ImagePickerModal from '../components/ImagePickerModal.vue';
  import { appStore, editorState, touchDraftVersion } from '../store/app';
  import { api } from '../api/request';
  import { preloadSiteData } from '../utils/preload';
  import {
    createFrontMatterTemplate,
    debounce,
    fileToBase64,
    getDraftArticles,
    normalizeDraftFileName,
    readDraftFromLocal,
    removeDraftFromLocal,
    saveDraftToLocal,
    showError,
    showInfo,
    showSuccess,
  } from '../utils/helpers';

  const editorRef = ref(null);

  const content = ref(editorState.currentContent || '');
  const fileName = ref('');
  const currentArticlePath = ref(editorState.currentPath || '');

  const showDropOverlay = ref(false);
  const showImagePicker = ref(false);
  const dragCounter = ref(0);
  const pasteUploading = ref(false);

  const suggestions = ref([]);
  const showSuggestions = ref(false);

  const draftSaving = ref(false);
  const publishing = ref(false);
  const inlineStatus = ref('');
  const inlineStatusType = ref('info');

  const initialRemoteSnapshot = ref('');

  const currentSite = computed(() => {
    return appStore.sites.find((site) => site.id === appStore.currentSiteId) || null;
  });

  const currentMarkdownDir = computed(() => {
    return currentSite.value?.markdownDir || 'source/_posts';
  });

  const fullArticlePath = computed(() => {
    const name = normalizeDraftFileName(fileName.value);
    if (!name) return '';
    return `${currentMarkdownDir.value.replace(/\/+$/, '')}/${name}`;
  });

  const dirty = computed(() => {
    return (content.value || '') !== initialRemoteSnapshot.value;
  });

  watch(dirty, (val) => {
    window.__STAEXOCTOR_EDITOR_DIRTY__ = !!val;
  });

  function handleBeforeUnload(e) {
    if (!dirty.value) return;
    e.preventDefault();
    e.returnValue = '';
  }

  onMounted(async () => {
    window.__STAEXOCTOR_EDITOR_DIRTY__ = false;
    window.addEventListener('beforeunload', handleBeforeUnload);

    if (editorState.currentPath) {
      const arr = editorState.currentPath.split('/');
      fileName.value = arr[arr.length - 1] || '';
      initialRemoteSnapshot.value = editorState.currentContent || '';
    } else if (!(content.value || '').trim()) {
      content.value = createFrontMatterTemplate('');
      initialRemoteSnapshot.value = '';
    }

    if (appStore.loaded.articlesForSite !== appStore.currentSiteId) {
      await preloadSiteData(appStore.currentSiteId, true);
    }
  });

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.__STAEXOCTOR_EDITOR_DIRTY__ = false;
  });

  watch(fileName, () => {
    currentArticlePath.value = fullArticlePath.value;
    editorState.currentPath = currentArticlePath.value;
  });

  function setInlineStatus(text, type = 'info') {
    inlineStatus.value = text;
    inlineStatusType.value = type;
  }

  function syncEditorContent() {
    const latest = editorRef.value?.getCurrentValue?.();
    if (typeof latest === 'string') {
      content.value = latest;
      editorState.currentContent = latest;
    }
    return content.value || '';
  }

  function getSuggestionKeyword() {
    return String(fileName.value || '')
      .trim()
      .toLowerCase();
  }

  function buildMergedArticleList() {
    appStore.draftVersion;

    const remote = (appStore.articles || [])
      .filter((item) => item.source !== 'draft')
      .map((item) => ({
        ...item,
        status: item.status || 'published',
        source: item.source || 'remote',
      }));

    const drafts = getDraftArticles(appStore.currentSiteId, currentMarkdownDir.value);

    const merged = [...drafts, ...remote];
    const map = new Map();

    for (const item of merged) {
      const key = `${item.source}:${item.name}`;
      map.set(key, item);
    }

    return Array.from(map.values());
  }

  function buildImageMarkdown(name, url) {
    return `![${name}](${url})`;
  }

  async function insertMarkdownAtCursor(markdown) {
    await editorRef.value?.switchToEditMode?.();
    await nextTick();

    if (editorRef.value?.insertAtCursor) {
      await editorRef.value.insertAtCursor(markdown);
      content.value = editorRef.value.getCurrentValue();
      editorState.currentContent = content.value;
    } else {
      const old = content.value || '';
      content.value = `${old}${old && !old.endsWith('\n') ? '\n\n' : ''}${markdown}\n`;
    }
  }

  async function openImagePicker() {
    if (appStore.loaded.imagesForSite !== appStore.currentSiteId) {
      await preloadSiteData(appStore.currentSiteId);
    }
    showImagePicker.value = true;
  }

  async function insertFromGallery(item) {
    try {
      await insertMarkdownAtCursor(`![${item.name}](${item.cdnUrl})`);
      showImagePicker.value = false;
      showSuccess('已从图库插入图片');
    } catch (err) {
      showError(err.message);
    }
  }

  async function uploadSingleImage(file, base64) {
    const finalName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/\s+/g, '-')}`;
    const res = await api.uploadImage({
      siteId: appStore.currentSiteId,
      fileName: finalName,
      base64Content: base64,
    });

    appStore.images.unshift({
      name: finalName,
      path: res.data.path,
      size: file.size,
      cdnUrl: res.data.url,
    });

    return { name: finalName, url: res.data.url };
  }

  async function uploadAndInsertImages(payloads) {
    try {
      const list = Array.isArray(payloads) ? payloads : [payloads];
      if (!list.length) return;

      if (list.length > 1) {
        showInfo(`检测到 ${list.length} 张图片，正在批量上传...`);
      }

      const insertedMarkdownList = [];

      for (const item of list) {
        const result = await uploadSingleImage(item.file, item.base64);
        insertedMarkdownList.push(buildImageMarkdown(result.name, result.url));
      }

      await insertMarkdownAtCursor(insertedMarkdownList.join('\n\n'));

      showDropOverlay.value = false;
      dragCounter.value = 0;

      const lastUrl = appStore.images[0]?.cdnUrl || '';
      if (lastUrl) await navigator.clipboard.writeText(lastUrl);

      showSuccess(
        list.length > 1 ? `已上传 ${list.length} 张图片并插入，最后一张链接已复制` : '图片已上传并插入，链接也已复制',
      );
    } catch (err) {
      showError(err.message);
      throw err;
    }
  }

  async function handleEditorUploadImages({ files, resolve, reject }) {
    try {
      const payloads = [];
      for (const file of files) {
        const base64 = await fileToBase64(file);
        payloads.push({ file, base64 });
      }

      const urls = [];
      for (const item of payloads) {
        const result = await uploadSingleImage(item.file, item.base64);
        urls.push(result.url);
      }

      resolve(urls);
    } catch (err) {
      showError(err.message || '上传失败');
      reject(err);
    }
  }

  function isImageDrag(event) {
    return Array.from(event.dataTransfer?.types || []).includes('Files');
  }

  function handleDragEnter(event) {
    if (!isImageDrag(event)) return;
    dragCounter.value++;
    showDropOverlay.value = true;
  }

  function handleDragOver(event) {
    if (!isImageDrag(event)) return;
    showDropOverlay.value = true;
  }

  function handleDragLeave(event) {
    if (!isImageDrag(event)) return;
    dragCounter.value--;
    if (dragCounter.value <= 0) {
      dragCounter.value = 0;
      showDropOverlay.value = false;
    }
  }

  function handleDropToOverlay(event) {
    if (!isImageDrag(event)) return;
    dragCounter.value = 0;
    showDropOverlay.value = true;
  }

  function hideOverlay() {
    dragCounter.value = 0;
    showDropOverlay.value = false;
  }

  async function handlePaste(event) {
    pasteUploading.value = true;
    if (!appStore.currentSiteId || pasteUploading.value) {
      pasteUploading.value = false;
      return;
    }

    const items = Array.from(event.clipboardData?.items || []);
    const imageItems = items.filter((item) => item.type?.startsWith('image/'));
    if (!imageItems.length) {
      pasteUploading.value = false;
      return;
    }

    event.preventDefault();

    showInfo(`检测到 ${imageItems.length} 张剪贴板图片，正在上传...`);

    try {
      const payloads = [];
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (!file) continue;
        payloads.push({ file, base64: await fileToBase64(file) });
      }
      if (payloads.length) await uploadAndInsertImages(payloads);
    } catch (err) {
      showError(err.message || '粘贴图片上传失败');
    } finally {
      pasteUploading.value = false;
    }
  }

  const doSuggest = debounce(() => {
    const keyword = getSuggestionKeyword();

    if (!keyword) {
      suggestions.value = [];
      showSuggestions.value = false;
      return;
    }

    const list = buildMergedArticleList()
      .filter((item) => item.name.toLowerCase().includes(keyword))
      .slice(0, 8);

    suggestions.value = list;
    showSuggestions.value = list.length > 0;
  }, 250);

  function handleFileNameInput() {
    doSuggest();
  }

  function handleFileNameBlur() {
    setTimeout(() => {
      showSuggestions.value = false;
    }, 150);
  }

  async function selectSuggestion(item) {
    try {
      fileName.value = item.name;
      currentArticlePath.value = item.path;
      editorState.currentPath = item.path;

      if (item.source === 'draft') {
        const draft = readDraftFromLocal(appStore.currentSiteId, item.name);
        if (!draft) {
          showError('草稿不存在或已失效');
          return;
        }
        content.value = draft.content || '';
        editorState.currentStatus = 'draft';
        editorState.currentSource = 'draft';
        initialRemoteSnapshot.value = draft.content || '';
        showSuccess('已加载草稿内容');
      } else {
        const res = await api.getArticle(appStore.currentSiteId, item.path);
        content.value = res.data.content || '';
        editorState.currentStatus = 'published';
        editorState.currentSource = 'remote';
        initialRemoteSnapshot.value = res.data.content || '';
        showSuccess('已加载文章内容');
      }

      await editorRef.value?.setValue?.(content.value);

      showSuggestions.value = false;
      await nextTick();
      editorRef.value?.focus?.();
    } catch (err) {
      showError(err.message);
    }
  }

  async function saveDraft() {
    if (draftSaving.value) return;

    draftSaving.value = true;
    setInlineStatus('正在保存草稿...', 'info');

    try {
      if (!appStore.currentSiteId) {
        throw new Error('当前未选择站点');
      }

      const latestContent = syncEditorContent();
      const finalName = normalizeDraftFileName(fileName.value);

      if (!finalName) {
        throw new Error('请先填写文件名');
      }

      const savedDraft = saveDraftToLocal(appStore.currentSiteId, finalName, latestContent, currentMarkdownDir.value);

      const verifyDraft = readDraftFromLocal(appStore.currentSiteId, finalName);
      if (!verifyDraft) {
        throw new Error('草稿写入后校验失败');
      }

      currentArticlePath.value = savedDraft.path;
      fileName.value = finalName;

      editorState.currentPath = savedDraft.path;
      editorState.currentName = finalName;
      editorState.currentContent = latestContent;
      editorState.currentStatus = 'draft';
      editorState.currentSource = 'draft';

      initialRemoteSnapshot.value = latestContent;
      touchDraftVersion();
      showSuggestions.value = false;

      setInlineStatus('草稿已保存到本地（未上线）', 'info');
      showSuccess('草稿保存成功（未上线）');
    } catch (err) {
      console.error('[Staexoctor] saveDraft error:', err);
      setInlineStatus(err.message || '草稿保存失败', 'error');
      showError(err.message || '草稿保存失败');
    } finally {
      draftSaving.value = false;
    }
  }

  async function save() {
    if (publishing.value) return;

    const latestContent = syncEditorContent();
    const finalName = normalizeDraftFileName(fileName.value);

    if (!finalName) {
      setInlineStatus('请填写文件名', 'error');
      showError('请填写文件名');
      return;
    }

    const finalPath = `${currentMarkdownDir.value.replace(/\/+$/, '')}/${finalName}`;

    publishing.value = true;
    setInlineStatus('正在保存到远程...', 'info');

    try {
      await api.saveArticle({
        siteId: appStore.currentSiteId,
        path: finalPath,
        content: latestContent,
        message: `Save ${finalPath}`,
      });

      currentArticlePath.value = finalPath;
      editorState.currentPath = finalPath;
      editorState.currentName = finalName;
      editorState.currentContent = latestContent;
      editorState.currentStatus = 'published';
      editorState.currentSource = 'remote';

      const remoteIndex = appStore.articles.findIndex((i) => i.path === finalPath && i.source !== 'draft');
      const remoteItem = {
        name: finalName,
        path: finalPath,
        status: 'published',
        source: 'remote',
        updatedAt: Date.now(),
      };

      if (remoteIndex === -1) {
        appStore.articles.unshift(remoteItem);
      } else {
        appStore.articles[remoteIndex] = { ...appStore.articles[remoteIndex], ...remoteItem };
      }

      removeDraftFromLocal(appStore.currentSiteId, finalName);
      touchDraftVersion();

      initialRemoteSnapshot.value = latestContent;
      showSuggestions.value = false;
      setInlineStatus('已保存到远程（已上线）', 'info');
      showSuccess('保存成功（已上线）');
    } catch (err) {
      console.error('[Staexoctor] save error:', err);
      setInlineStatus('远程保存失败', 'error');
      showError(err.message);
    } finally {
      publishing.value = false;
    }
  }
</script>

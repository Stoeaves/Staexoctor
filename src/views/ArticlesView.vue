<template>
  <AppLayout>
    <div class="panel">
      <div class="row between">
        <div>
          <div class="panel-title">文章列表</div>
          <div class="panel-desc">管理 Markdown 文件与本地草稿。</div>
        </div>
        <button
          class="btn"
          @click="createArticle"
          :disabled="!appStore.currentSiteId"
        >
          新建文章
        </button>
      </div>

      <template v-if="!appStore.currentSiteId">
        <div class="empty">请先选择站点</div>
      </template>

      <template v-else>
        <div
          class="row wrap"
          style="margin: 16px 0"
        >
          <button
            class="btn secondary"
            :style="filter === 'all' ? activeBtnStyle : ''"
            @click="filter = 'all'"
          >
            全部
          </button>
          <button
            class="btn secondary"
            :style="filter === 'draft' ? activeBtnStyle : ''"
            @click="filter = 'draft'"
          >
            草稿
          </button>
          <button
            class="btn secondary"
            :style="filter === 'published' ? activeBtnStyle : ''"
            @click="filter = 'published'"
          >
            已上线
          </button>
        </div>

        <SkeletonList
          v-if="appStore.listLoading.articles"
          :count="5"
        />

        <div
          v-else
          class="list"
        >
          <div
            v-if="filteredArticles.length === 0"
            class="empty"
          >
            暂无内容
          </div>

          <div
            v-for="item in filteredArticles"
            :key="`${item.source}-${item.path}`"
            class="list-item"
          >
            <div class="row between">
              <div>
                <div
                  class="row"
                  style="align-items: center; flex-direction: row; margin-bottom: 6px"
                >
                  <div style="font-weight: 600">{{ item.name }}</div>
                  <span
                    class="badge"
                    :style="{
                      background: item.status === 'draft' ? '#fff7ed' : '#e8f1ff',
                      color: item.status === 'draft' ? '#ea580c' : '#2563eb',
                    }"
                  >
                    {{ item.status === 'draft' ? '未上线' : '已上线' }}
                  </span>
                </div>
                <div class="meta">{{ item.path }}</div>
                <div
                  v-if="item.updatedAt"
                  class="meta"
                  style="margin-top: 6px"
                >
                  最后编辑：{{ formatTimestamp(item.updatedAt) }}
                </div>
              </div>

              <div
                class="row"
                style="flex-direction: row"
              >
                <button
                  v-if="item.status === 'draft'"
                  class="btn success"
                  @click="publishDraft(item)"
                >
                  发布
                </button>
                <button
                  class="btn secondary"
                  @click="editArticle(item)"
                >
                  编辑
                </button>
                <button
                  class="btn danger"
                  @click="askDeleteArticle(item)"
                >
                  删除
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
  </AppLayout>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue';
  import { useRouter } from 'vue-router';
  import AppLayout from '../components/AppLayout.vue';
  import SkeletonList from '../components/SkeletonList.vue';
  import ConfirmDialog from '../components/ConfirmDialog.vue';
  import { appStore, editorState, touchDraftVersion } from '../store/app';
  import { api } from '../api/request';
  import { preloadSiteData } from '../utils/preload';
  import {
    formatTimestamp,
    getDraftArticles,
    readDraftFromLocal,
    removeDraftFromLocal,
    showError,
    showSuccess,
  } from '../utils/helpers';

  const router = useRouter();
  const filter = ref('all');

  const activeBtnStyle = {
    background: '#e8f1ff',
    color: '#2563eb',
    borderColor: '#cfe0ff',
  };

  const confirmState = ref({
    visible: false,
    title: '',
    message: '',
    danger: false,
    action: null,
  });

  onMounted(async () => {
    if (!appStore.currentSiteId) return;
    try {
      if (appStore.loaded.articlesForSite !== appStore.currentSiteId) {
        await preloadSiteData(appStore.currentSiteId);
      }
    } catch (err) {
      showError(err.message);
    }
  });

  const displayArticles = computed(() => {
    appStore.draftVersion;

    const remote = (appStore.articles || [])
      .filter((item) => item.source !== 'draft')
      .map((item) => ({
        ...item,
        status: item.status || 'published',
        source: item.source || 'remote',
        updatedAt: item.updatedAt || 0,
      }));

    const drafts = getDraftArticles(
      appStore.currentSiteId,
      appStore.sites.find((i) => i.id === appStore.currentSiteId)?.markdownDir || '',
    );

    return [...drafts, ...remote];
  });

  const filteredArticles = computed(() => {
    let list = displayArticles.value;
    if (filter.value === 'draft') {
      list = list.filter((i) => i.status === 'draft');
    } else if (filter.value === 'published') {
      list = list.filter((i) => i.status !== 'draft');
    }
    return list;
  });

  function createArticle() {
    editorState.currentPath = '';
    editorState.currentName = '';
    editorState.currentContent = '';
    editorState.currentStatus = 'draft';
    editorState.currentSource = 'new';
    router.push('/editor');
  }

  async function editArticle(item) {
    try {
      if (item.source === 'draft') {
        const draft = readDraftFromLocal(appStore.currentSiteId, item.name);
        if (!draft) {
          showError('草稿不存在或已失效');
          touchDraftVersion();
          return;
        }
        editorState.currentPath = item.path;
        editorState.currentName = item.name;
        editorState.currentContent = draft.content || '';
        editorState.currentStatus = 'draft';
        editorState.currentSource = 'draft';
        router.push('/editor');
        return;
      }

      const res = await api.getArticle(appStore.currentSiteId, item.path);
      editorState.currentPath = res.data.path;
      editorState.currentName = res.data.name;
      editorState.currentContent = res.data.content;
      editorState.currentStatus = 'published';
      editorState.currentSource = 'remote';
      router.push('/editor');
    } catch (err) {
      showError(err.message);
    }
  }

  function askDeleteArticle(item) {
    if (item.source === 'draft') {
      confirmState.value = {
        visible: true,
        title: '删除草稿',
        message: `确认删除草稿：${item.name}？`,
        danger: true,
        action: () => deleteDraft(item),
      };
      return;
    }

    confirmState.value = {
      visible: true,
      title: '删除文章',
      message: `确认删除文章：${item.name}？`,
      danger: true,
      action: () => deletePublishedArticle(item),
    };
  }

  function deleteDraft(item) {
    removeDraftFromLocal(appStore.currentSiteId, item.name);
    touchDraftVersion();
    showSuccess('草稿已删除');
  }

  async function deletePublishedArticle(item) {
    try {
      await api.deleteArticle({
        siteId: appStore.currentSiteId,
        path: item.path,
      });
      appStore.articles = appStore.articles.filter((i) => i.path !== item.path);
      showSuccess('删除成功');
    } catch (err) {
      showError(err.message);
    }
  }

  async function publishDraft(item) {
    try {
      const draft = readDraftFromLocal(appStore.currentSiteId, item.name);
      if (!draft) {
        showError('草稿不存在或已失效');
        touchDraftVersion();
        return;
      }

      await api.saveArticle({
        siteId: appStore.currentSiteId,
        path: item.path,
        content: draft.content || '',
        message: `Publish ${item.path}`,
      });

      const index = appStore.articles.findIndex((i) => i.path === item.path && i.source !== 'draft');
      const nextItem = {
        name: item.name,
        path: item.path,
        status: 'published',
        source: 'remote',
        updatedAt: Date.now(),
      };

      if (index === -1) {
        appStore.articles.unshift(nextItem);
      } else {
        appStore.articles[index] = { ...appStore.articles[index], ...nextItem };
      }

      removeDraftFromLocal(appStore.currentSiteId, item.name);
      touchDraftVersion();
      showSuccess('草稿已发布');
    } catch (err) {
      showError(err.message);
    }
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

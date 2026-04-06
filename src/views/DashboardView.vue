<template>
  <AppLayout>
    <div class="panel">
      <div class="panel-title">概览</div>
      <div class="panel-desc">一个干净、简洁、现代的静态博客管理服务。</div>

      <template v-if="currentSite">
        <div class="row wrap">
          <div
            class="panel"
            style="flex: 1; min-width: 220px"
          >
            <div class="badge">当前站点</div>
            <h2 style="margin: 12px 0 6px">{{ currentSite.remark || currentSite.blogRepoName }}</h2>
            <div class="meta">站点 ID：{{ currentSite.id }}</div>
          </div>

          <div
            class="panel"
            style="flex: 1; min-width: 180px"
          >
            <div class="badge">文章数</div>
            <h2 style="margin: 12px 0 6px">{{ appStore.articles.length }}</h2>
            <div class="meta">已预加载 Markdown 文件列表</div>
          </div>

          <div
            class="panel"
            style="flex: 1; min-width: 180px"
          >
            <div class="badge">图片数</div>
            <h2 style="margin: 12px 0 6px">{{ appStore.images.length }}</h2>
            <div class="meta">已预加载图片文件列表</div>
          </div>

          <div
            class="panel"
            style="flex: 1; min-width: 180px"
          >
            <div class="badge">站点总数</div>
            <h2 style="margin: 12px 0 6px">{{ appStore.sites.length }}</h2>
            <div class="meta">支持多站点切换与备注</div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="row wrap">
          <div
            class="panel"
            style="flex: 1; min-width: 180px"
          >
            <div class="badge">站点总数</div>
            <h2 style="margin: 12px 0 6px">{{ appStore.sites.length }}</h2>
            <div class="meta">请先新增并选择站点</div>
          </div>
        </div>
      </template>
    </div>

    <template v-if="currentSite">
      <div class="panel">
        <div class="panel-title">快捷操作</div>
        <div class="panel-desc">常用功能快速入口。</div>

        <div class="row wrap">
          <button
            class="btn"
            @click="createArticle"
          >
            新建文章
          </button>
          <button
            class="btn secondary"
            @click="goImages"
          >
            上传图片
          </button>
          <button
            v-for="item in recentArticles.slice(0, 3)"
            :key="item.path"
            class="btn secondary"
            @click="quickEdit(item)"
          >
            编辑：{{ item.name }}
          </button>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">当前站点详情</div>
        <div class="panel-desc">以下信息来自当前已选站点配置。</div>

        <div class="list">
          <div class="list-item">
            <div style="font-weight: 700; margin-bottom: 8px">博客仓库</div>
            <div class="meta">Owner：{{ currentSite.blogRepoOwner }}</div>
            <div class="meta">仓库名：{{ currentSite.blogRepoName }}</div>
            <div class="meta">分支：{{ currentSite.blogRepoBranch }}</div>
            <div class="meta">Markdown 目录：{{ currentSite.markdownDir }}</div>
          </div>

          <div class="list-item">
            <div style="font-weight: 700; margin-bottom: 8px">图片仓库</div>
            <div class="meta">Owner：{{ currentSite.imageRepoOwner }}</div>
            <div class="meta">仓库名：{{ currentSite.imageRepoName }}</div>
            <div class="meta">分支：{{ currentSite.imageRepoBranch }}</div>
            <div class="meta">图片目录：{{ currentSite.imageDir }}</div>
          </div>
        </div>
      </div>

      <div class="row wrap">
        <div
          class="panel"
          style="flex: 1; min-width: 280px"
        >
          <div class="panel-title">最近文章</div>
          <div class="panel-desc">当前缓存中的前 5 篇文章。</div>

          <div
            v-if="recentArticles.length === 0"
            class="empty"
          >
            暂无文章
          </div>
          <div
            v-else
            class="list"
          >
            <div
              v-for="item in recentArticles"
              :key="item.path"
              class="list-item"
            >
              <div class="row between">
                <div>
                  <div style="font-weight: 600">{{ item.name }}</div>
                  <div class="meta">{{ item.path }}</div>
                </div>
                <button
                  class="btn secondary"
                  @click="quickEdit(item)"
                >
                  快速编辑
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          class="panel"
          style="flex: 1; min-width: 280px"
        >
          <div class="panel-title">最近图片</div>
          <div class="panel-desc">当前缓存中的前 6 张图片。</div>

          <div
            v-if="recentImages.length === 0"
            class="empty"
          >
            暂无图片
          </div>
          <div
            v-else
            class="grid"
            style="grid-template-columns: repeat(2, minmax(0, 1fr))"
          >
            <div
              v-for="item in recentImages"
              :key="item.path"
              class="image-card"
            >
              <div
                class="image-preview"
                style="height: 120px"
              >
                <img
                  :src="item.cdnUrl"
                  :alt="item.name"
                />
              </div>
              <div class="image-info">
                <div style="font-weight: 600">{{ item.name }}</div>
                <div class="meta">{{ item.path }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <EmptyState
      v-else
      title="尚未选择站点"
      desc="请先前往站点管理页面新增并选择站点。"
    />
  </AppLayout>
</template>

<script setup>
  import { computed } from 'vue';
  import { useRouter } from 'vue-router';
  import AppLayout from '../components/AppLayout.vue';
  import EmptyState from '../components/EmptyState.vue';
  import { appStore, editorState } from '../store/app';
  import { api } from '../api/request';
  import { showError } from '../utils/helpers';

  const router = useRouter();

  const currentSite = computed(() => {
    return appStore.sites.find((site) => site.id === appStore.currentSiteId) || null;
  });

  const recentArticles = computed(() => {
    return (appStore.articles || []).slice(0, 5);
  });

  const recentImages = computed(() => {
    return (appStore.images || []).slice(0, 6);
  });

  function createArticle() {
    editorState.currentPath = '';
    editorState.currentName = '';
    editorState.currentContent = '';
    router.push('/editor');
  }

  function goImages() {
    router.push('/images');
  }

  async function quickEdit(item) {
    try {
      const res = await api.getArticle(appStore.currentSiteId, item.path);
      editorState.currentPath = res.data.path;
      editorState.currentName = res.data.name;
      editorState.currentContent = res.data.content;
      router.push('/editor');
    } catch (err) {
      showError(err.message);
    }
  }
</script>

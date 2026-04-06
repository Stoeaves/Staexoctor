<template>
  <AppLayout>
    <div class="panel">
      <div class="panel-title">站点管理</div>
      <div class="panel-desc">
        添加静态博客站点，需填写博客仓库与图片仓库的 Owner、名称、分支、Token、Markdown 目录与图片目录。
      </div>

      <div class="form-group">
        <label class="label">备注</label>
        <input
          v-model="form.remark"
          class="input"
          placeholder="例如：我的主博客"
        />
      </div>

      <div class="row">
        <div
          class="form-group"
          style="flex: 1"
        >
          <label class="label">博客仓库 Owner</label>
          <input
            v-model="form.blogRepoOwner"
            class="input"
            placeholder="Owner"
          />
        </div>
        <div
          class="form-group"
          style="flex: 1"
        >
          <label class="label">博客仓库名称</label>
          <input
            v-model="form.blogRepoName"
            class="input"
            placeholder="Repo Name"
          />
        </div>
      </div>

      <div class="row">
        <div
          class="form-group"
          style="flex: 1"
        >
          <label class="label">博客仓库分支</label>
          <input
            v-model="form.blogRepoBranch"
            class="input"
            placeholder="main"
          />
        </div>
        <div
          class="form-group"
          style="flex: 1"
        >
          <label class="label">博客仓库 Token</label>
          <input
            v-model="form.blogRepoToken"
            class="input"
            placeholder="留空则保留原 Token"
          />
          <div
            v-if="editingId && form.hasBlogRepoToken"
            class="meta"
            style="margin-top: 6px"
          >
            当前已保存博客仓库 Token
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="label">Markdown 目录</label>
        <input
          v-model="form.markdownDir"
          class="input"
          placeholder="如 source/_posts"
        />
      </div>

      <div class="row">
        <div
          class="form-group"
          style="flex: 1"
        >
          <label class="label">图片仓库 Owner</label>
          <input
            v-model="form.imageRepoOwner"
            class="input"
            placeholder="Owner"
          />
        </div>
        <div
          class="form-group"
          style="flex: 1"
        >
          <label class="label">图片仓库名称</label>
          <input
            v-model="form.imageRepoName"
            class="input"
            placeholder="Repo Name"
          />
        </div>
      </div>

      <div class="row">
        <div
          class="form-group"
          style="flex: 1"
        >
          <label class="label">图片仓库分支</label>
          <input
            v-model="form.imageRepoBranch"
            class="input"
            placeholder="main"
          />
        </div>
        <div
          class="form-group"
          style="flex: 1"
        >
          <label class="label">图片仓库 Token</label>
          <input
            v-model="form.imageRepoToken"
            class="input"
            placeholder="留空则保留原 Token"
          />
          <div
            v-if="editingId && form.hasImageRepoToken"
            class="meta"
            style="margin-top: 6px"
          >
            当前已保存图片仓库 Token
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="label">图片目录</label>
        <input
          v-model="form.imageDir"
          class="input"
          placeholder="如 images"
        />
      </div>

      <div class="row">
        <button
          class="btn secondary"
          @click="testConnection"
        >
          连接测试
        </button>
        <button
          class="btn"
          @click="saveSite"
        >
          保存站点
        </button>
        <button
          v-if="editingId"
          class="btn secondary"
          @click="resetForm"
        >
          取消编辑
        </button>
      </div>

      <div
        v-if="testResult"
        class="panel"
        style="margin-top: 16px"
      >
        <div
          class="panel-title"
          style="font-size: 18px"
        >
          测试结果
        </div>
        <div class="panel-desc">{{ testMessage }}</div>

        <div class="list">
          <div class="list-item">
            <div style="font-weight: 700">博客仓库与分支</div>
            <div
              class="meta"
              :style="{ color: getResultColor(testResult.blogRepo) }"
            >
              {{ testResult.blogRepo?.message || '暂无结果' }}
            </div>
          </div>

          <div class="list-item">
            <div style="font-weight: 700">Markdown 目录</div>
            <div
              class="meta"
              :style="{ color: getResultColor(testResult.markdownDir) }"
            >
              {{ testResult.markdownDir?.message || '暂无结果' }}
            </div>
          </div>

          <div class="list-item">
            <div style="font-weight: 700">图片仓库与分支</div>
            <div
              class="meta"
              :style="{ color: getResultColor(testResult.imageRepo) }"
            >
              {{ testResult.imageRepo?.message || '暂无结果' }}
            </div>
          </div>

          <div class="list-item">
            <div style="font-weight: 700">图片目录</div>
            <div
              class="meta"
              :style="{ color: getResultColor(testResult.imageDir) }"
            >
              {{ testResult.imageDir?.message || '暂无结果' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">已有站点</div>
      <div class="panel-desc">支持多站点切换与备注显示。</div>

      <div
        v-if="appStore.sites.length === 0"
        class="empty"
      >
        暂无站点
      </div>

      <div
        v-else
        class="list"
      >
        <div
          v-for="site in appStore.sites"
          :key="site.id"
          class="list-item"
        >
          <div class="row between">
            <div>
              <div style="font-weight: 700">{{ site.remark || site.blogRepoName }}</div>
              <div class="meta">博客：{{ site.blogRepoOwner }}/{{ site.blogRepoName }}@{{ site.blogRepoBranch }}</div>
              <div class="meta">
                图片：{{ site.imageRepoOwner }}/{{ site.imageRepoName }}@{{ site.imageRepoBranch }}
              </div>
              <div class="meta">Markdown：{{ site.markdownDir }} ｜ 图片目录：{{ site.imageDir }}</div>
            </div>
            <div class="row site-actions">
              <button
                class="btn secondary"
                @click="selectSite(site)"
              >
                切换
              </button>
              <button
                class="btn secondary"
                @click="editSite(site)"
              >
                编辑
              </button>
              <button
                class="btn danger"
                @click="askRemoveSite(site)"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
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
  import { onMounted, reactive, ref, watch } from 'vue';
  import AppLayout from '../components/AppLayout.vue';
  import ConfirmDialog from '../components/ConfirmDialog.vue';
  import { api } from '../api/request';
  import { appStore, resetSiteCaches, setCurrentSiteId } from '../store/app';
  import { preloadSiteData } from '../utils/preload';
  import { showError, showInfo, showSuccess } from '../utils/helpers';

  const editingId = ref('');
  const testResult = ref(null);
  const testPassed = ref(false);
  const testMessage = ref('');
  const testedSnapshot = ref('');

  const confirmState = ref({
    visible: false,
    title: '',
    message: '',
    danger: false,
    action: null,
  });

  const form = reactive({
    remark: '',
    blogRepoOwner: '',
    blogRepoName: '',
    blogRepoBranch: 'main',
    blogRepoToken: '',
    markdownDir: 'source/_posts',
    imageRepoOwner: '',
    imageRepoName: '',
    imageRepoBranch: 'main',
    imageRepoToken: '',
    imageDir: 'images',
    hasBlogRepoToken: false,
    hasImageRepoToken: false,
  });

  onMounted(loadSites);

  watch(
    () =>
      JSON.stringify({
        ...form,
        hasBlogRepoToken: undefined,
        hasImageRepoToken: undefined,
      }),
    (val) => {
      if (testedSnapshot.value && testedSnapshot.value !== val) {
        testResult.value = null;
        testPassed.value = false;
        testMessage.value = '';
        testedSnapshot.value = '';
      }
    },
  );

  async function loadSites() {
    try {
      if (appStore.loaded.sites) return;
      const res = await api.getSites();
      appStore.sites = res.data;
      appStore.loaded.sites = true;
    } catch (err) {
      showError(err.message);
    }
  }

  function resetForm() {
    editingId.value = '';
    testResult.value = null;
    testPassed.value = false;
    testMessage.value = '';
    testedSnapshot.value = '';
    Object.assign(form, {
      remark: '',
      blogRepoOwner: '',
      blogRepoName: '',
      blogRepoBranch: 'main',
      blogRepoToken: '',
      markdownDir: 'source/_posts',
      imageRepoOwner: '',
      imageRepoName: '',
      imageRepoBranch: 'main',
      imageRepoToken: '',
      imageDir: 'images',
      hasBlogRepoToken: false,
      hasImageRepoToken: false,
    });
  }

  function getResultColor(item) {
    if (!item) return '#64748b';
    return item.success ? '#16a34a' : '#dc2626';
  }

  async function testConnection() {
    try {
      const res = await api.testSite({
        ...form,
        blogRepoToken: form.blogRepoToken || '',
        imageRepoToken: form.imageRepoToken || '',
      });
      testResult.value = res.data || null;
      testPassed.value = !!res.success;
      testMessage.value = res.message || (res.success ? '测试通过' : '测试未完全通过');
      testedSnapshot.value = JSON.stringify({
        ...form,
        hasBlogRepoToken: undefined,
        hasImageRepoToken: undefined,
      });

      if (res.success) {
        showSuccess('连接测试通过');
      } else {
        showInfo('连接测试未完全通过，请查看详细结果');
      }
    } catch (err) {
      showError(err.message || '连接测试失败');
    }
  }

  function saveSite() {
    if (!form.blogRepoOwner || !form.blogRepoName || !form.imageRepoOwner || !form.imageRepoName) {
      showError('请完整填写必要字段');
      return;
    }

    if (!editingId.value && (!form.blogRepoToken || !form.imageRepoToken)) {
      showError('新增站点时必须填写两个仓库的 Token');
      return;
    }

    if (!testedSnapshot.value) {
      confirmState.value = {
        visible: true,
        title: '保存站点',
        message: '当前配置尚未进行连接测试。建议先测试连接，是否仍然保存？',
        danger: false,
        action: () => doSaveSite(),
      };
      return;
    }

    if (!testPassed.value) {
      confirmState.value = {
        visible: true,
        title: '保存站点',
        message: '当前连接测试未完全通过，继续保存可能导致后续操作失败。是否仍然保存？',
        danger: false,
        action: () => doSaveSite(),
      };
      return;
    }

    doSaveSite();
  }

  async function doSaveSite() {
    try {
      const payload = {
        ...form,
        blogRepoToken: form.blogRepoToken || '',
        imageRepoToken: form.imageRepoToken || '',
      };

      if (editingId.value) {
        const res = await api.updateSite(editingId.value, payload);
        const index = appStore.sites.findIndex((i) => i.id === editingId.value);
        if (index !== -1) appStore.sites[index] = res.data;
        showSuccess('站点已更新');
      } else {
        const res = await api.addSite(payload);
        appStore.sites.unshift(res.data);

        if (!appStore.currentSiteId) {
          setCurrentSiteId(res.data.id);
          resetSiteCaches();
          await preloadSiteData(res.data.id);
        }

        showSuccess('站点已添加');
      }
      resetForm();
    } catch (err) {
      showError(err.message);
    }
  }

  function editSite(site) {
    editingId.value = site.id;
    testResult.value = null;
    testPassed.value = false;
    testMessage.value = '';
    testedSnapshot.value = '';

    Object.assign(form, {
      ...site,
      blogRepoToken: '',
      imageRepoToken: '',
      hasBlogRepoToken: !!site.hasBlogRepoToken,
      hasImageRepoToken: !!site.hasImageRepoToken,
    });
  }

  function askRemoveSite(site) {
    confirmState.value = {
      visible: true,
      title: '删除站点',
      message: `确认删除站点：${site.remark || site.blogRepoName}？`,
      danger: true,
      action: () => removeSite(site),
    };
  }

  async function removeSite(site) {
    try {
      await api.deleteSite(site.id);
      appStore.sites = appStore.sites.filter((i) => i.id !== site.id);

      if (appStore.currentSiteId === site.id) {
        const next = appStore.sites[0];
        setCurrentSiteId(next ? next.id : '');
        resetSiteCaches();
        if (next) {
          await preloadSiteData(next.id);
        }
      }

      showSuccess('站点已删除');
    } catch (err) {
      showError(err.message);
    }
  }

  async function selectSite(site) {
    setCurrentSiteId(site.id);
    resetSiteCaches();
    await preloadSiteData(site.id);
    showSuccess(`已切换到：${site.remark || site.blogRepoName}`);
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

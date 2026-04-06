<template>
  <AppLayout>
    <div class="panel">
      <div class="panel-title">修改密码</div>
      <div class="panel-desc">请输入原密码，并设置新的管理员密码。修改成功后需要重新登录。</div>

      <div class="form-group">
        <label class="label">原密码</label>
        <input
          v-model="form.oldPassword"
          type="password"
          class="input"
          placeholder="请输入原密码"
        />
      </div>

      <div class="form-group">
        <label class="label">新密码</label>
        <input
          v-model="form.newPassword"
          type="password"
          class="input"
          placeholder="请输入新密码"
        />
        <div style="margin-top: 10px">
          <div
            class="meta"
            style="margin-bottom: 6px"
          >
            密码强度：<span :style="{ color: strengthColor }">{{ strengthText }}</span>
          </div>
          <div class="password-strength">
            <div
              class="password-strength-bar"
              :style="{
                width: strengthPercent + '%',
                background: strengthColor,
              }"
            ></div>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="label">再次输入新密码</label>
        <input
          v-model="form.confirmPassword"
          type="password"
          class="input"
          placeholder="请再次输入新密码"
        />
      </div>

      <div
        class="meta"
        style="margin-bottom: 16px; line-height: 1.8"
      >
        建议密码至少包含：
        <br />
        1. 8 位及以上
        <br />
        2. 大小写字母
        <br />
        3. 数字
        <br />
        4. 特殊字符
      </div>

      <button
        class="btn"
        @click="submit"
      >
        确认修改密码
      </button>
    </div>
  </AppLayout>
</template>

<script setup>
  import { computed, reactive } from 'vue';
  import { useRouter } from 'vue-router';
  import AppLayout from '../components/AppLayout.vue';
  import { api } from '../api/request';
  import { clearToken } from '../utils/auth';
  import { appStore, resetSiteCaches } from '../store/app';
  import { getPasswordStrength, showError, showSuccess } from '../utils/helpers';

  const router = useRouter();

  const form = reactive({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const strengthInfo = computed(() => {
    return getPasswordStrength(form.newPassword);
  });

  const strengthText = computed(() => strengthInfo.value.text);
  const strengthColor = computed(() => strengthInfo.value.color);
  const strengthPercent = computed(() => strengthInfo.value.percent);

  async function submit() {
    if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
      showError('请完整填写所有字段');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      showError('两次输入的新密码不一致');
      return;
    }

    if (form.newPassword.length < 6) {
      showError('新密码长度不能少于 6 位');
      return;
    }

    if (strengthInfo.value.level < 2) {
      showError('新密码强度过低，请设置更安全的密码');
      return;
    }

    try {
      await api.changePassword({
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      });

      form.oldPassword = '';
      form.newPassword = '';
      form.confirmPassword = '';

      clearToken();
      localStorage.removeItem('staexoctor_current_site_id');

      appStore.currentSiteId = '';
      appStore.sites = [];
      resetSiteCaches();
      appStore.loaded.sites = false;

      showSuccess('密码修改成功，请重新登录');
      router.replace('/login');
    } catch (err) {
      showError(err.message);
    }
  }
</script>

<template>
  <div class="page-wrap">
    <div class="center-card">
      <h1 class="title">初始化 Staexoctor</h1>
      <p class="desc">首次进入需要完成初始化，请设置管理员密码。</p>

      <div class="form-group">
        <label class="label">管理员密码</label>
        <input
          v-model="adminPassword"
          type="password"
          class="input"
          placeholder="请输入管理员密码"
        />
      </div>

      <button
        class="btn"
        style="width: 100%"
        @click="submit"
      >
        完成初始化
      </button>
    </div>
  </div>
</template>

<script setup>
  import { onMounted, ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { api } from '../api/request';
  import { showError, showSuccess } from '../utils/helpers';

  const adminPassword = ref('');
  const router = useRouter();

  onMounted(async () => {
    try {
      const res = await api.getInitStatus();
      if (res.data.initialized) {
        localStorage.setItem('staexoctor_initialized', '1');
        router.push('/login');
      }
    } catch (err) {
      showError(err.message);
    }
  });

  async function submit() {
    if (!adminPassword.value) {
      showError('请填写管理员密码');
      return;
    }

    try {
      await api.init({
        adminPassword: adminPassword.value,
      });
      localStorage.setItem('staexoctor_initialized', '1');
      showSuccess('初始化成功');
      router.push('/login');
    } catch (err) {
      showError(err.message);
    }
  }
</script>

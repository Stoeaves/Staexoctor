<template>
  <div class="page-wrap">
    <div class="center-card">
      <h1 class="title">管理员登录</h1>
      <p class="desc">请输入管理员密码以进入 Staexoctor 控制台。</p>

      <div class="form-group">
        <label class="label">管理员密码</label>
        <input
          v-model="password"
          type="password"
          class="input"
          placeholder="请输入管理员密码"
          @keyup.enter="submit"
        />
      </div>

      <button
        class="btn"
        style="width: 100%"
        @click="submit"
      >
        登录
      </button>
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { api } from '../api/request';
  import { setToken } from '../utils/auth';
  import { showError, showSuccess } from '../utils/helpers';

  const password = ref('');
  const router = useRouter();

  async function submit() {
    if (!password.value) {
      showError('请输入密码');
      return;
    }

    try {
      const res = await api.login({ password: password.value });
      setToken(res.data.token);
      showSuccess('登录成功');
      router.push('/dashboard');
    } catch (err) {
      if (err.message.includes('次数过多')) {
        showError('登录失败次数过多，请稍后再试');
        return;
      }

      if (err.message.includes('密码错误')) {
        showError('密码错误');
        return;
      }

      showError(err.message);
    }
  }
</script>

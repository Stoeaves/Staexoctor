<template>
  <div
    class="modal-mask"
    @click.self="handleCancel"
  >
    <div class="modal-card confirm-dialog-card">
      <div
        class="panel-title"
        style="margin-bottom: 8px"
      >
        {{ title }}
      </div>
      <div
        class="panel-desc"
        style="margin-bottom: 18px"
      >
        {{ message }}
      </div>

      <div
        class="row"
        style="justify-content: flex-end; flex-direction: row"
      >
        <button
          class="btn secondary"
          @click="handleCancel"
        >
          取消
        </button>
        <button
          class="btn"
          :class="{ danger: danger, success: !danger }"
          @click="handleConfirm"
        >
          确认
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  const props = defineProps({
    title: {
      type: String,
      default: '确认操作',
    },
    message: {
      type: String,
      default: '是否继续？',
    },
    danger: {
      type: Boolean,
      default: false,
    },
  });

  const emit = defineEmits(['confirm', 'cancel']);

  function handleConfirm() {
    emit('confirm');
  }

  function handleCancel() {
    emit('cancel');
  }
</script>

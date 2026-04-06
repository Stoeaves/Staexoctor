<template>
  <div
    class="modal-mask"
    @click.self="$emit('close')"
  >
    <div
      class="modal-card"
      style="width: min(100%, 960px)"
    >
      <div
        class="row between"
        style="margin-bottom: 14px"
      >
        <div>
          <div
            class="panel-title"
            style="margin-bottom: 4px"
          >
            图片预览
          </div>
          <div class="meta">{{ image?.name }}</div>
        </div>
        <button
          class="btn secondary"
          @click="$emit('close')"
        >
          关闭
        </button>
      </div>

      <div
        class="image-preview"
        style="height: auto; min-height: 280px; background: #f8fafc; border-radius: 18px"
      >
        <img
          :src="image?.cdnUrl"
          :alt="image?.name"
          style="max-height: 70vh; object-fit: contain"
        />
      </div>

      <div
        class="row wrap"
        style="margin-top: 16px"
      >
        <button
          class="btn secondary"
          @click="copyUrl"
        >
          复制链接
        </button>
        <button
          class="btn secondary"
          @click="copyMarkdown"
        >
          复制 Markdown
        </button>
        <button
          class="btn secondary"
          @click="copyHtml"
        >
          复制 HTML
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { showSuccess } from '../utils/helpers';

  const props = defineProps({
    image: {
      type: Object,
      default: null,
    },
  });

  defineEmits(['close']);

  async function copyUrl() {
    if (!props.image) return;
    await navigator.clipboard.writeText(props.image.cdnUrl);
    showSuccess('链接已复制');
  }

  async function copyMarkdown() {
    if (!props.image) return;
    await navigator.clipboard.writeText(`![${props.image.name}](${props.image.cdnUrl})`);
    showSuccess('Markdown 链接已复制');
  }

  async function copyHtml() {
    if (!props.image) return;
    await navigator.clipboard.writeText(`<img src="${props.image.cdnUrl}" alt="${props.image.name}" />`);
    showSuccess('HTML 链接已复制');
  }
</script>

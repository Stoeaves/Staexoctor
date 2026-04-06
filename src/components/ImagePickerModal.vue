<template>
  <div
    class="modal-mask"
    @click.self="$emit('close')"
  >
    <div class="modal-card image-picker-modal">
      <div
        class="row between"
        style="margin-bottom: 14px"
      >
        <div>
          <div
            class="panel-title"
            style="margin-bottom: 4px"
          >
            从图库插入
          </div>
          <div class="meta">点击任意图片即可插入 Markdown 链接</div>
        </div>
        <button
          class="btn secondary"
          @click="$emit('close')"
        >
          关闭
        </button>
      </div>

      <div
        v-if="images.length === 0"
        class="empty"
      >
        当前站点暂无图片
      </div>

      <div
        v-else
        class="grid image-picker-grid"
      >
        <div
          v-for="item in images"
          :key="item.path"
          class="image-card image-picker-card"
          @click="$emit('select', item)"
        >
          <div
            class="image-preview"
            style="height: 140px"
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
              class="row"
              style="margin-top: 10px"
            >
              <button
                class="btn secondary"
                @click.stop="copy(item.cdnUrl)"
              >
                复制链接
              </button>
              <button
                class="btn"
                @click.stop="$emit('select', item)"
              >
                插入
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { showSuccess } from '../utils/helpers';

  defineProps({
    images: {
      type: Array,
      default: () => [],
    },
  });

  defineEmits(['close', 'select']);

  async function copy(url) {
    await navigator.clipboard.writeText(url);
    showSuccess('链接已复制');
  }
</script>

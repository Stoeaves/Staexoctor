<template>
  <div>
    <template v-if="mode === 'compact'">
      <input
        ref="inputRef"
        type="file"
        accept="image/*"
        multiple
        hidden
        @change="handleChange"
      />
      <button
        class="btn secondary editor-top-btn"
        @click="chooseFile"
      >
        {{ resolvedButtonText }}
      </button>
    </template>

    <template v-else>
      <div
        class="dropzone"
        :class="{ dragover: innerDragover }"
        @dragover.prevent="innerDragover = true"
        @dragleave.prevent="innerDragover = false"
        @drop.prevent="handleDrop"
      >
        <div class="pulse"></div>
        <div style="font-size: 18px; font-weight: 700; margin-bottom: 6px">拖拽图片到此处上传</div>
        <div
          class="meta"
          style="margin-bottom: 14px"
        >
          {{ tipText }}
        </div>

        <input
          ref="inputRef"
          type="file"
          accept="image/*"
          multiple
          hidden
          @change="handleChange"
        />
        <button
          class="btn"
          @click="chooseFile"
        >
          {{ resolvedButtonText }}
        </button>

        <div
          v-if="uploading"
          class="progress-bar"
        >
          <div
            class="progress-inner"
            :style="{ width: progress + '%' }"
          ></div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
  import { computed, ref } from 'vue';
  import { fileToBase64, showError } from '../utils/helpers';

  const props = defineProps({
    mode: {
      type: String,
      default: 'normal',
    },
    buttonText: {
      type: String,
      default: '',
    },
  });

  const emit = defineEmits(['upload']);

  const inputRef = ref(null);
  const uploading = ref(false);
  const progress = ref(0);
  const innerDragover = ref(false);

  const resolvedButtonText = computed(() => {
    if (props.buttonText) return props.buttonText;
    return props.mode === 'compact' ? '插入图片' : '上传并插入图片';
  });

  const tipText = computed(() => {
    return '支持多图上传，上传后会自动插入 Markdown 图片链接';
  });

  function chooseFile() {
    inputRef.value?.click();
  }

  function normalizeFiles(fileList) {
    return Array.from(fileList || []).filter((file) => file.type.startsWith('image/'));
  }

  async function processFiles(files) {
    if (!files?.length) return;

    uploading.value = true;
    progress.value = 10;

    const timer = setInterval(() => {
      if (progress.value < 85) progress.value += 6;
    }, 120);

    try {
      const payloads = [];
      for (const file of files) {
        const base64 = await fileToBase64(file);
        payloads.push({ file, base64 });
      }

      progress.value = 92;
      await emit('upload', payloads);
      progress.value = 100;

      setTimeout(() => {
        uploading.value = false;
        progress.value = 0;
      }, 300);
    } catch (err) {
      showError(err.message || '上传失败');
      uploading.value = false;
      progress.value = 0;
    } finally {
      clearInterval(timer);
      innerDragover.value = false;
    }
  }

  function handleDrop(e) {
    innerDragover.value = false;
    const files = normalizeFiles(e.dataTransfer.files);
    if (!files.length) {
      showError('请拖拽图片文件');
      return;
    }
    processFiles(files);
  }

  function handleChange(e) {
    const files = normalizeFiles(e.target.files);
    if (!files.length) {
      showError('请选择图片文件');
      e.target.value = '';
      return;
    }
    processFiles(files);
    e.target.value = '';
  }
</script>

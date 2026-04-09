<template>
  <div class="editor-shell editor-shell-full mobile-mode-editor-wrap">
    <button
      v-if="isMobile"
      class="mobile-editor-toggle"
      @click="toggleMobilePreview"
      :title="mobilePreviewOnly ? '切换到编辑' : '切换到预览'"
      type="button"
    >
      {{ mobilePreviewOnly ? '编辑' : '预览' }}
    </button>

    <!-- 桌面端：编辑 + 预览 -->
    <MdEditor
      v-if="!isMobile"
      ref="editorRef"
      v-model="localValue"
      language="zh-CN"
      :preview="true"
      :toolbars="toolbars"
      :footers="footers"
      :onUploadImg="handleUploadImg"
      class="staexoctor-md-editor"
      @onChange="handleChange"
    />

    <!-- 移动端：编辑模式 -->
    <MdEditor
      v-else-if="!mobilePreviewOnly"
      ref="editorRef"
      v-model="localValue"
      language="zh-CN"
      :preview="false"
      :toolbars="toolbars"
      :footers="footers"
      :onUploadImg="handleUploadImg"
      class="staexoctor-md-editor"
      @onChange="handleChange"
    />

    <!-- 移动端：纯预览模式 -->
    <div
      v-else
      class="mobile-preview-shell"
    >
      <MdPreview
        :modelValue="localValue"
        language="zh-CN"
        class="staexoctor-md-preview"
      />
    </div>
  </div>
</template>

<script setup>
  import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
  import { MdEditor, MdPreview } from 'md-editor-v3';

  const props = defineProps({
    modelValue: {
      type: String,
      default: '',
    },
    isPasteUpload: {
      type: Boolean,
      default: false,
    },
  });

  const emit = defineEmits(['update:modelValue', 'upload-images']);

  const editorRef = ref(null);
  const localValue = ref(props.modelValue || '');
  const isMobile = ref(false);
  const mobilePreviewOnly = ref(false);

  watch(
    () => props.modelValue,
    (val) => {
      if (val !== localValue.value) {
        localValue.value = val || '';
      }
    },
  );

  function handleChange(val) {
    localValue.value = val;
    emit('update:modelValue', val);
  }

  function updateMobileState() {
    isMobile.value = window.innerWidth <= 680;
    if (!isMobile.value) {
      mobilePreviewOnly.value = false;
    }
  }

  const toolbars = [
    'bold',
    'underline',
    'italic',
    '-',
    'title',
    'strikeThrough',
    'quote',
    'unorderedList',
    'orderedList',
    'task',
    '-',
    'codeRow',
    'code',
    'link',
    'image',
    'table',
    '-',
    'revoke',
    'next',
    '=',
    'pageFullscreen',
    'fullscreen',
  ];

  const footers = ['markdownTotal', '=', 0];

  function getCurrentValue() {
    return localValue.value || '';
  }

  async function switchToEditMode() {
    if (isMobile.value && mobilePreviewOnly.value) {
      mobilePreviewOnly.value = false;
      await nextTick();
    }
  }

  async function insertAtCursor(text) {
    await switchToEditMode();
    await nextTick();

    const ins = editorRef.value;
    if (ins && typeof ins.insert === 'function') {
      focus();
      await nextTick();

      ins.insert(() => {
        return {
          targetValue: text,
          select: false,
          deviationStart: 0,
          deviationEnd: 0,
        };
      });

      await nextTick();
      return;
    }

    localValue.value = `${localValue.value || ''}${text}`;
    emit('update:modelValue', localValue.value);
  }

  function focus() {
    if (mobilePreviewOnly.value) return;
    try {
      const el = document.querySelector('.staexoctor-md-editor textarea');
      el?.focus();
    } catch {}
  }

  function toggleMobilePreview() {
    if (!isMobile.value) return;
    mobilePreviewOnly.value = !mobilePreviewOnly.value;
  }

  async function handleUploadImg(files, callback) {
    if (props.isPasteUpload) return;
    try {
      const list = Array.from(files || []);
      if (!list.length) return;

      const urls = await emitUploadImages(list);

      if (Array.isArray(urls) && urls.length) {
        callback(urls);
      }
    } catch (err) {
      console.error('[Staexoctor] md-editor-v3 image upload failed:', err);
    }
  }

  function emitUploadImages(files) {
    return new Promise((resolve, reject) => {
      emit('upload-images', {
        files,
        resolve,
        reject,
      });
    });
  }

  defineExpose({
    insertAtCursor,
    getCurrentValue,
    focus,
    switchToEditMode,
    setValue: async (val) => {
      localValue.value = val || '';
      emit('update:modelValue', localValue.value);
      await nextTick();
    },
  });

  onMounted(() => {
    updateMobileState();
    window.addEventListener('resize', updateMobileState);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', updateMobileState);
  });
</script>

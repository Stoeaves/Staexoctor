<template>
  <div class="list">
    <div
      v-if="items.length === 0"
      class="empty"
    >
      暂无内容
    </div>
    <div
      v-for="item in items"
      :key="`${item.source || 'remote'}-${item.path}`"
      class="list-item"
    >
      <div class="row between">
        <div>
          <div
            class="row"
            style="align-items: center; flex-direction: row; margin-bottom: 6px"
          >
            <div style="font-weight: 600">{{ item.name }}</div>
            <span
              class="badge"
              :style="{
                background: item.status === 'draft' ? '#fff7ed' : '#e8f1ff',
                color: item.status === 'draft' ? '#ea580c' : '#2563eb',
              }"
            >
              {{ item.status === 'draft' ? '未上线' : '已上线' }}
            </span>
          </div>
          <div class="meta">{{ item.path }}</div>
        </div>
        <div
          class="row"
          style="flex-direction: row"
        >
          <button
            v-if="onEdit"
            class="btn secondary"
            @click="onEdit(item)"
          >
            编辑
          </button>
          <button
            v-if="onDelete"
            class="btn danger"
            @click="onDelete(item)"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    items: {
      type: Array,
      default: () => [],
    },
    onEdit: Function,
    onDelete: Function,
  });
</script>

export function showSuccess(text) {
  window.cocoMessage?.success(text);
}

export function showError(text) {
  window.cocoMessage?.error(text);
}

export function showInfo(text) {
  window.cocoMessage?.info(text);
}

export function formatSize(size = 0) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export function formatTimestamp(timestamp) {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getPasswordStrength(password = '') {
  if (!password) {
    return {
      level: 0,
      text: '未输入',
      color: '#94a3b8',
      percent: 0,
    };
  }

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) {
    return { level: 1, text: '弱', color: '#ef4444', percent: 25 };
  }

  if (score <= 3) {
    return { level: 2, text: '中', color: '#f59e0b', percent: 60 };
  }

  return { level: 3, text: '强', color: '#22c55e', percent: 100 };
}

export function formatDateTime(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

export function createFrontMatterTemplate(title = '') {
  return `---
title: ${title}
date: ${formatDateTime()}
tags: []
categories: []
---

`;
}

export function debounce(fn, wait = 300) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, wait);
  };
}

export function normalizeDraftFileName(name = '') {
  let val = String(name).trim().replace(/^\/+/, '');
  if (val && !val.toLowerCase().endsWith('.md')) {
    val += '.md';
  }
  return val;
}

export function getDraftStorageKey(siteId, fileName) {
  return `staexoctor:draft:${String(siteId)}:${normalizeDraftFileName(fileName)}`;
}

export function getDraftListKey(siteId) {
  return `staexoctor:draft:list:${String(siteId)}`;
}

export function readDraftList(siteId) {
  try {
    const raw = localStorage.getItem(getDraftListKey(siteId));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function writeDraftList(siteId, list) {
  localStorage.setItem(getDraftListKey(siteId), JSON.stringify(list));
}

export function saveDraftToLocal(siteId, fileName, content, markdownDir = '') {
  if (!siteId) {
    throw new Error('Missing siteId');
  }

  const safeName = normalizeDraftFileName(fileName);
  if (!safeName) {
    throw new Error('Missing fileName');
  }

  const path = markdownDir ? `${markdownDir.replace(/\/+$/, '')}/${safeName}` : safeName;

  const payload = {
    fileName: safeName,
    content: String(content ?? ''),
    updatedAt: Date.now(),
    status: 'draft',
    source: 'draft',
    path,
  };

  const draftKey = getDraftStorageKey(siteId, safeName);
  localStorage.setItem(draftKey, JSON.stringify(payload));

  const list = readDraftList(siteId);
  const index = list.findIndex((i) => i.fileName === safeName);

  const listItem = {
    fileName: safeName,
    path,
    updatedAt: payload.updatedAt,
    status: 'draft',
    source: 'draft',
  };

  if (index === -1) {
    list.unshift(listItem);
  } else {
    list[index] = listItem;
  }

  writeDraftList(siteId, list);
  return payload;
}

export function readDraftFromLocal(siteId, fileName) {
  try {
    if (!siteId) return null;
    const safeName = normalizeDraftFileName(fileName);
    if (!safeName) return null;
    const raw = localStorage.getItem(getDraftStorageKey(siteId, safeName));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function removeDraftFromLocal(siteId, fileName) {
  if (!siteId) return;
  const safeName = normalizeDraftFileName(fileName);
  if (!safeName) return;

  localStorage.removeItem(getDraftStorageKey(siteId, safeName));

  const list = readDraftList(siteId).filter((i) => i.fileName !== safeName);
  writeDraftList(siteId, list);
}

export function getDraftArticles(siteId, markdownDir = '') {
  if (!siteId) return [];

  const list = readDraftList(siteId)
    .map((item) => ({
      name: item.fileName,
      path: item.path || `${markdownDir.replace(/\/+$/, '')}/${item.fileName}`,
      status: 'draft',
      source: 'draft',
      updatedAt: item.updatedAt,
    }))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  return list;
}

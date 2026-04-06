import { clearToken } from '../utils/auth';
import { appStore, beginRequest, endRequest, resetSiteCaches } from '../store/app';

const API_URL = __API_URL__;

let redirectingToLogin = false;
let unauthorizedMessageShown = false;

function getAuthHeaders() {
  const token = localStorage.getItem('staexoctor_token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function isAuthPage() {
  const hash = window.location.hash || '';
  return hash.startsWith('#/login') || hash.startsWith('#/init');
}

function handleUnauthorized(message = '登录已失效，请重新登录') {
  clearToken();
  localStorage.removeItem('staexoctor_current_site_id');

  appStore.currentSiteId = '';
  appStore.sites = [];
  resetSiteCaches();
  appStore.loaded.sites = false;
  appStore.loaded.settings = false;

  if (!isAuthPage() && !unauthorizedMessageShown && window.cocoMessage) {
    unauthorizedMessageShown = true;
    window.cocoMessage.error(message);
    setTimeout(() => {
      unauthorizedMessageShown = false;
    }, 1200);
  }

  if (!redirectingToLogin) {
    redirectingToLogin = true;

    if (!isAuthPage()) {
      window.location.hash = '#/login';
    }

    setTimeout(() => {
      redirectingToLogin = false;
    }, 300);
  }
}

async function request(path, options = {}, extra = {}) {
  beginRequest();

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (res.status === 401) {
      handleUnauthorized((data && data.message) || '登录已失效，请重新登录');
      throw new Error((data && data.message) || 'Unauthorized');
    }

    if (!res.ok || !data?.success) {
      if (extra.allowErrorBody && data) {
        return data;
      }
      throw new Error(data?.message || 'Request failed');
    }

    return data;
  } finally {
    endRequest();
  }
}

export const api = {
  getInitStatus() {
    return request('/api/init/status', { method: 'GET' });
  },
  init(payload) {
    return request('/api/init', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  login(payload) {
    return request('/api/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  logout() {
    return request('/api/logout', {
      method: 'POST',
    });
  },
  changePassword(payload) {
    return request('/api/password/change', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  testSite(payload) {
    return request(
      '/api/sites/test',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      {
        allowErrorBody: true,
      },
    );
  },
  getSites() {
    return request('/api/sites', { method: 'GET' });
  },
  addSite(payload) {
    return request('/api/sites', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateSite(id, payload) {
    return request(`/api/sites/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  deleteSite(id) {
    return request(`/api/sites/${id}`, { method: 'DELETE' });
  },
  getArticles(siteId) {
    return request(`/api/articles?siteId=${encodeURIComponent(siteId)}`, { method: 'GET' });
  },
  getArticle(siteId, path) {
    return request(`/api/article?siteId=${encodeURIComponent(siteId)}&path=${encodeURIComponent(path)}`, {
      method: 'GET',
    });
  },
  saveArticle(payload) {
    return request('/api/article', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  deleteArticle(payload) {
    return request('/api/article', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  },
  getImages(siteId) {
    return request(`/api/images?siteId=${encodeURIComponent(siteId)}`, { method: 'GET' });
  },
  uploadImage(payload) {
    return request('/api/image/upload', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  deleteImage(payload) {
    return request('/api/image', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  },
};

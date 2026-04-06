export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (err) {
      return json(
        env,
        {
          success: false,
          message: err.message || 'Server error',
        },
        500,
        request,
      );
    }
  },
};

const PASSWORD_ITERATIONS = 100000;
const SESSION_TTL = 60 * 60 * 24 * 7;
const LOGIN_FAIL_LIMIT = 5;
const LOGIN_FAIL_WINDOW = 60 * 10;

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method === 'OPTIONS') return handleOptions(env, request);

  if (path === '/api/ping') {
    return json(env, { success: true, data: 'pong' }, 200, request);
  }

  if (path === '/api/init/status' && method === 'GET') {
    const inited = await env.STAEXOCTOR_KV.get('app:init');
    return json(env, { success: true, data: { initialized: !!inited } }, 200, request);
  }

  if (path === '/api/init' && method === 'POST') {
    const initFlag = await env.STAEXOCTOR_KV.get('app:init');
    if (initFlag) {
      return json(env, { success: false, message: 'Already initialized' }, 400, request);
    }

    const body = await request.json();
    const { adminPassword } = body || {};

    if (!adminPassword) {
      return json(env, { success: false, message: 'Missing admin password' }, 400, request);
    }

    const passwordData = await createPasswordRecord(adminPassword);

    await env.STAEXOCTOR_KV.put('app:init', '1');
    await env.STAEXOCTOR_KV.put(
      'app:admin',
      JSON.stringify({
        ...passwordData,
        passwordVersion: 1,
      }),
    );
    await env.STAEXOCTOR_KV.put('app:sites', JSON.stringify([]));

    return json(env, { success: true, message: 'Initialized successfully' }, 200, request);
  }

  if (path === '/api/login' && method === 'POST') {
    const clientKey = getClientKey(request);
    const failKey = `app:loginfail:${clientKey}`;
    const failInfo = await readJSON(env.STAEXOCTOR_KV, failKey, { count: 0 });

    if ((failInfo.count || 0) >= LOGIN_FAIL_LIMIT) {
      await appendAuditLog(env, {
        type: 'login_blocked',
        ip: clientKey,
        time: Date.now(),
      });

      return json(
        env,
        {
          success: false,
          message: '登录失败次数过多，请稍后再试',
        },
        429,
        request,
      );
    }

    const body = await request.json();
    const { password } = body || {};
    let admin = await readJSON(env.STAEXOCTOR_KV, 'app:admin', null);

    if (!admin) {
      return json(env, { success: false, message: 'Not initialized' }, 400, request);
    }

    const verifyResult = await verifyAndUpgradePasswordIfNeeded(env, admin, password);
    if (!verifyResult.valid) {
      const nextCount = (failInfo.count || 0) + 1;
      await env.STAEXOCTOR_KV.put(failKey, JSON.stringify({ count: nextCount }), { expirationTtl: LOGIN_FAIL_WINDOW });

      await appendAuditLog(env, {
        type: 'login_failed',
        ip: clientKey,
        count: nextCount,
        time: Date.now(),
      });

      return json(
        env,
        {
          success: false,
          message: nextCount >= LOGIN_FAIL_LIMIT ? '登录失败次数过多，请稍后再试' : '密码错误',
        },
        nextCount >= LOGIN_FAIL_LIMIT ? 429 : 401,
        request,
      );
    }

    await env.STAEXOCTOR_KV.delete(failKey);

    admin = verifyResult.admin;

    const sessionToken = crypto.randomUUID();
    await env.STAEXOCTOR_KV.put(
      `app:session:${sessionToken}`,
      JSON.stringify({
        version: admin.passwordVersion || 1,
        createdAt: Date.now(),
      }),
      { expirationTtl: SESSION_TTL },
    );

    await appendAuditLog(env, {
      type: 'login_success',
      ip: clientKey,
      time: Date.now(),
    });

    return json(env, { success: true, data: { token: sessionToken } }, 200, request);
  }

  if (path === '/api/logout' && method === 'POST') {
    const auth = request.headers.get('Authorization') || '';
    const token = auth.replace('Bearer ', '').trim();
    if (token) {
      await env.STAEXOCTOR_KV.delete(`app:session:${token}`);
    }

    await appendAuditLog(env, {
      type: 'logout',
      ip: getClientKey(request),
      time: Date.now(),
    });

    return json(env, { success: true, message: '已退出登录' }, 200, request);
  }

  if (path.startsWith('/api/')) {
    const authResult = await requireAuth(request, env);
    if (!authResult.success) {
      return json(env, authResult, 401, request);
    }
  }

  if (path === '/api/password/change' && method === 'POST') {
    const body = await request.json();
    const { oldPassword, newPassword } = body || {};

    if (!oldPassword || !newPassword) {
      return json(env, { success: false, message: 'Missing password fields' }, 400, request);
    }

    let admin = await readJSON(env.STAEXOCTOR_KV, 'app:admin', null);
    if (!admin) {
      return json(env, { success: false, message: 'Admin not found' }, 404, request);
    }

    const verifyResult = await verifyAndUpgradePasswordIfNeeded(env, admin, oldPassword);
    if (!verifyResult.valid) {
      return json(env, { success: false, message: '原密码错误' }, 400, request);
    }

    admin = verifyResult.admin;
    const nextPasswordData = await createPasswordRecord(newPassword);
    const nextVersion = (admin.passwordVersion || 1) + 1;

    await env.STAEXOCTOR_KV.put(
      'app:admin',
      JSON.stringify({
        ...nextPasswordData,
        passwordVersion: nextVersion,
      }),
    );

    await appendAuditLog(env, {
      type: 'password_changed',
      ip: getClientKey(request),
      time: Date.now(),
    });

    return json(env, { success: true, message: '密码修改成功，旧登录状态已失效' }, 200, request);
  }

  if (path === '/api/sites/test' && method === 'POST') {
    const body = await request.json();

    const {
      blogRepoOwner,
      blogRepoName,
      blogRepoBranch,
      blogRepoToken,
      markdownDir,
      imageRepoOwner,
      imageRepoName,
      imageRepoBranch,
      imageRepoToken,
      imageDir,
    } = body || {};

    if (
      !blogRepoOwner ||
      !blogRepoName ||
      !blogRepoBranch ||
      !blogRepoToken ||
      !markdownDir ||
      !imageRepoOwner ||
      !imageRepoName ||
      !imageRepoBranch ||
      !imageRepoToken ||
      !imageDir
    ) {
      return json(env, { success: false, message: '请完整填写用于测试的站点配置' }, 400, request);
    }

    const result = {
      blogRepo: null,
      markdownDir: null,
      imageRepo: null,
      imageDir: null,
    };

    try {
      await githubGetRepo({ owner: blogRepoOwner, repo: blogRepoName, token: blogRepoToken });
      await githubGetBranch({ owner: blogRepoOwner, repo: blogRepoName, branch: blogRepoBranch, token: blogRepoToken });
      result.blogRepo = { success: true, message: '博客仓库与分支可访问' };
    } catch (e) {
      result.blogRepo = { success: false, message: e.message || '博客仓库测试失败' };
    }

    try {
      await githubListContents({
        owner: blogRepoOwner,
        repo: blogRepoName,
        branch: blogRepoBranch,
        token: blogRepoToken,
        path: markdownDir,
        purpose: 'dir',
      });
      result.markdownDir = { success: true, message: 'Markdown 目录可访问' };
    } catch (e) {
      result.markdownDir = { success: false, message: e.message || 'Markdown 目录测试失败' };
    }

    try {
      await githubGetRepo({ owner: imageRepoOwner, repo: imageRepoName, token: imageRepoToken });
      await githubGetBranch({
        owner: imageRepoOwner,
        repo: imageRepoName,
        branch: imageRepoBranch,
        token: imageRepoToken,
      });
      result.imageRepo = { success: true, message: '图片仓库与分支可访问' };
    } catch (e) {
      result.imageRepo = { success: false, message: e.message || '图片仓库测试失败' };
    }

    try {
      await githubListContents({
        owner: imageRepoOwner,
        repo: imageRepoName,
        branch: imageRepoBranch,
        token: imageRepoToken,
        path: imageDir,
        purpose: 'dir',
      });
      result.imageDir = { success: true, message: '图片目录可访问' };
    } catch (e) {
      result.imageDir = { success: false, message: e.message || '图片目录测试失败' };
    }

    const allPassed = Object.values(result).every((i) => i && i.success);

    return json(
      env,
      {
        success: allPassed,
        data: result,
        message: allPassed ? '站点连接测试通过' : '站点连接测试未完全通过',
      },
      allPassed ? 200 : 400,
      request,
    );
  }

  if (path === '/api/sites' && method === 'GET') {
    const sites = await readJSON(env.STAEXOCTOR_KV, 'app:sites', []);
    return json(env, { success: true, data: sites.map(maskSiteSensitiveFields) }, 200, request);
  }

  if (path === '/api/sites' && method === 'POST') {
    const body = await request.json();
    const sites = await readJSON(env.STAEXOCTOR_KV, 'app:sites', []);
    const site = {
      id: crypto.randomUUID(),
      remark: body.remark || '',
      blogRepoOwner: body.blogRepoOwner || '',
      blogRepoName: body.blogRepoName || '',
      blogRepoBranch: body.blogRepoBranch || 'main',
      blogRepoToken: body.blogRepoToken || '',
      markdownDir: body.markdownDir || 'source/_posts',
      imageRepoOwner: body.imageRepoOwner || '',
      imageRepoName: body.imageRepoName || '',
      imageRepoBranch: body.imageRepoBranch || 'main',
      imageRepoToken: body.imageRepoToken || '',
      imageDir: body.imageDir || 'images',
      createdAt: Date.now(),
    };
    sites.unshift(site);
    await env.STAEXOCTOR_KV.put('app:sites', JSON.stringify(sites));
    return json(env, { success: true, data: maskSiteSensitiveFields(site), message: 'Site added' }, 200, request);
  }

  if (path.startsWith('/api/sites/') && method === 'PUT') {
    const siteId = path.split('/').pop();
    const body = await request.json();
    const sites = await readJSON(env.STAEXOCTOR_KV, 'app:sites', []);
    const index = sites.findIndex((i) => i.id === siteId);
    if (index === -1) return json(env, { success: false, message: 'Site not found' }, 404, request);

    const oldSite = sites[index];
    const nextSite = {
      ...oldSite,
      ...body,
      id: siteId,
      blogRepoToken: body.blogRepoToken ? body.blogRepoToken : oldSite.blogRepoToken,
      imageRepoToken: body.imageRepoToken ? body.imageRepoToken : oldSite.imageRepoToken,
    };

    sites[index] = nextSite;
    await env.STAEXOCTOR_KV.put('app:sites', JSON.stringify(sites));
    return json(env, { success: true, data: maskSiteSensitiveFields(nextSite), message: 'Site updated' }, 200, request);
  }

  if (path.startsWith('/api/sites/') && method === 'DELETE') {
    const siteId = path.split('/').pop();
    const sites = await readJSON(env.STAEXOCTOR_KV, 'app:sites', []);
    const nextSites = sites.filter((i) => i.id !== siteId);
    await env.STAEXOCTOR_KV.put('app:sites', JSON.stringify(nextSites));
    return json(env, { success: true, message: 'Site deleted' }, 200, request);
  }

  if (path === '/api/articles' && method === 'GET') {
    const siteId = url.searchParams.get('siteId');
    const site = await getSiteById(env, siteId);
    if (!site) return json(env, { success: false, message: '站点不存在' }, 404, request);

    const files = await githubListContents({
      owner: site.blogRepoOwner,
      repo: site.blogRepoName,
      branch: site.blogRepoBranch,
      token: site.blogRepoToken,
      path: site.markdownDir,
      purpose: 'dir',
    });

    const markdownFiles = files
      .filter((i) => i.type === 'file' && i.name.toLowerCase().endsWith('.md'))
      .map((i) => ({
        name: i.name,
        path: i.path,
        sha: i.sha,
        size: i.size,
        download_url: i.download_url,
      }));

    return json(env, { success: true, data: markdownFiles }, 200, request);
  }

  if (path === '/api/article' && method === 'GET') {
    const siteId = url.searchParams.get('siteId');
    const filePath = url.searchParams.get('path');
    const site = await getSiteById(env, siteId);
    if (!site) return json(env, { success: false, message: '站点不存在' }, 404, request);

    const file = await githubGetContent({
      owner: site.blogRepoOwner,
      repo: site.blogRepoName,
      branch: site.blogRepoBranch,
      token: site.blogRepoToken,
      path: filePath,
      purpose: 'file',
    });

    return json(
      env,
      {
        success: true,
        data: {
          name: file.name,
          path: file.path,
          sha: file.sha,
          content: decodeBase64Utf8(file.content || ''),
        },
      },
      200,
      request,
    );
  }

  if (path === '/api/article' && method === 'POST') {
    const body = await request.json();
    const { siteId, path: filePath, content, message } = body || {};
    const site = await getSiteById(env, siteId);
    if (!site) return json(env, { success: false, message: '站点不存在' }, 404, request);

    let oldSha = null;
    try {
      const oldFile = await githubGetContent({
        owner: site.blogRepoOwner,
        repo: site.blogRepoName,
        branch: site.blogRepoBranch,
        token: site.blogRepoToken,
        path: filePath,
        purpose: 'file',
      });
      oldSha = oldFile.sha;
    } catch {}

    const result = await githubPutContent({
      owner: site.blogRepoOwner,
      repo: site.blogRepoName,
      branch: site.blogRepoBranch,
      token: site.blogRepoToken,
      path: filePath,
      content,
      message: message || `Update ${filePath}`,
      sha: oldSha,
    });

    return json(env, { success: true, data: result, message: 'Article saved' }, 200, request);
  }

  if (path === '/api/article' && method === 'DELETE') {
    const body = await request.json();
    const { siteId, path: filePath, message } = body || {};
    const site = await getSiteById(env, siteId);
    if (!site) return json(env, { success: false, message: '站点不存在' }, 404, request);

    const oldFile = await githubGetContent({
      owner: site.blogRepoOwner,
      repo: site.blogRepoName,
      branch: site.blogRepoBranch,
      token: site.blogRepoToken,
      path: filePath,
      purpose: 'file',
    });

    await githubDeleteContent({
      owner: site.blogRepoOwner,
      repo: site.blogRepoName,
      branch: site.blogRepoBranch,
      token: site.blogRepoToken,
      path: filePath,
      sha: oldFile.sha,
      message: message || `Delete ${filePath}`,
    });

    return json(env, { success: true, message: 'Article deleted' }, 200, request);
  }

  if (path === '/api/images' && method === 'GET') {
    const siteId = url.searchParams.get('siteId');
    const site = await getSiteById(env, siteId);
    if (!site) return json(env, { success: false, message: '站点不存在' }, 404, request);

    const files = await githubListContents({
      owner: site.imageRepoOwner,
      repo: site.imageRepoName,
      branch: site.imageRepoBranch,
      token: site.imageRepoToken,
      path: site.imageDir,
      purpose: 'dir',
    });

    const images = files
      .filter((i) => i.type === 'file')
      .map((i) => ({
        name: i.name,
        path: i.path,
        sha: i.sha,
        size: i.size,
        rawUrl: `https://raw.githubusercontent.com/${site.imageRepoOwner}/${site.imageRepoName}/${site.imageRepoBranch}/${i.path}`,
        cdnUrl: `https://cdn.jsdmirror.cn/gh/${site.imageRepoOwner}/${site.imageRepoName}@${site.imageRepoBranch}/${i.path}`,
      }));

    return json(env, { success: true, data: images }, 200, request);
  }

  if (path === '/api/image/upload' && method === 'POST') {
    const body = await request.json();
    const { siteId, fileName, base64Content } = body || {};
    const site = await getSiteById(env, siteId);
    if (!site) return json(env, { success: false, message: '站点不存在' }, 404, request);

    const finalPath = `${trimSlash(site.imageDir)}/${fileName}`;

    const result = await githubPutBase64Content({
      owner: site.imageRepoOwner,
      repo: site.imageRepoName,
      branch: site.imageRepoBranch,
      token: site.imageRepoToken,
      path: finalPath,
      base64Content,
      message: `Upload image ${fileName}`,
      sha: null,
    });

    const cdnUrl = `https://cdn.jsdmirror.cn/gh/${site.imageRepoOwner}/${site.imageRepoName}@${site.imageRepoBranch}/${finalPath}`;

    return json(
      env,
      {
        success: true,
        data: {
          ...result,
          path: finalPath,
          url: cdnUrl,
        },
        message: 'Image uploaded',
      },
      200,
      request,
    );
  }

  if (path === '/api/image' && method === 'DELETE') {
    const body = await request.json();
    const { siteId, path: filePath, message } = body || {};
    const site = await getSiteById(env, siteId);
    if (!site) return json(env, { success: false, message: '站点不存在' }, 404, request);

    const oldFile = await githubGetContent({
      owner: site.imageRepoOwner,
      repo: site.imageRepoName,
      branch: site.imageRepoBranch,
      token: site.imageRepoToken,
      path: filePath,
      purpose: 'file',
    });

    await githubDeleteContent({
      owner: site.imageRepoOwner,
      repo: site.imageRepoName,
      branch: site.imageRepoBranch,
      token: site.imageRepoToken,
      path: filePath,
      sha: oldFile.sha,
      message: message || `Delete ${filePath}`,
    });

    return json(env, { success: true, message: 'Image deleted' }, 200, request);
  }

  return json(env, { success: false, message: 'Not found' }, 404, request);
}

function getClientKey(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown';
}

function getAllowedOrigin(env, request) {
  const requestOrigin = request.headers.get('Origin') || '*';
  const allowed = env.ALLOWED_ORIGIN || '*';
  if (allowed === '*') return '*';
  if (requestOrigin === allowed) return allowed;
  return 'null';
}

function maskSiteSensitiveFields(site) {
  return {
    ...site,
    blogRepoToken: '',
    imageRepoToken: '',
    hasBlogRepoToken: !!site.blogRepoToken,
    hasImageRepoToken: !!site.imageRepoToken,
  };
}

async function appendAuditLog(env, entry) {
  try {
    const key = 'app:audit:logs';
    const list = await readJSON(env.STAEXOCTOR_KV, key, []);
    list.unshift(entry);
    await env.STAEXOCTOR_KV.put(key, JSON.stringify(list.slice(0, 100)));
  } catch {}
}

function mapGitHubError(data, purpose = '') {
  const message = data?.message || '';

  if (message.includes('API rate limit exceeded')) {
    return 'GitHub API 速率限制，请稍后再试';
  }

  if (message === 'Bad credentials' || message.includes('Requires authentication')) {
    return 'GitHub Token 无效或权限不足';
  }

  if (message === 'Not Found') {
    if (purpose === 'repo') return 'GitHub 仓库不存在';
    if (purpose === 'branch') return 'GitHub 分支不存在';
    if (purpose === 'dir') return '指定目录不存在';
    if (purpose === 'file') return '指定文件不存在';
    return '资源不存在';
  }

  if (message.includes('Resource not accessible by personal access token')) {
    return 'GitHub Token 权限不足';
  }

  return message || 'GitHub API 请求失败';
}

function json(env, data, status = 200, request = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': request ? getAllowedOrigin(env, request) : '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    },
  });
}

function handleOptions(env, request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': getAllowedOrigin(env, request),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    },
  });
}

async function requireAuth(request, env) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/init') || url.pathname === '/api/login') {
    return { success: true };
  }

  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return { success: false, message: 'Unauthorized' };

  const session = await readJSON(env.STAEXOCTOR_KV, `app:session:${token}`, null);
  if (!session) return { success: false, message: 'Session expired' };

  const admin = await readJSON(env.STAEXOCTOR_KV, 'app:admin', null);
  if (!admin) return { success: false, message: 'Admin not found' };

  const currentVersion = admin.passwordVersion || 1;
  const sessionVersion = session.version || 0;

  if (sessionVersion !== currentVersion) {
    return { success: false, message: 'Session expired' };
  }

  return { success: true };
}

async function readJSON(kv, key, fallback) {
  const raw = await kv.get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function getSiteById(env, siteId) {
  const sites = await readJSON(env.STAEXOCTOR_KV, 'app:sites', []);
  return sites.find((i) => i.id === siteId);
}

async function verifyAndUpgradePasswordIfNeeded(env, admin, inputPassword) {
  if (!inputPassword || !admin) {
    return { valid: false, admin };
  }

  if (admin.password && !admin.passwordHash && !admin.passwordSalt && !admin.passwordIterations) {
    const valid = admin.password === inputPassword;
    if (!valid) return { valid: false, admin };

    const upgraded = {
      ...(await createPasswordRecord(inputPassword)),
      passwordVersion: admin.passwordVersion || 1,
    };
    await env.STAEXOCTOR_KV.put('app:admin', JSON.stringify(upgraded));
    return { valid: true, admin: upgraded };
  }

  if (admin.passwordHash && admin.passwordAlgorithm === 'sha256' && !admin.passwordSalt) {
    const inputHash = await sha256Hex(inputPassword);
    const valid = inputHash === admin.passwordHash;
    if (!valid) return { valid: false, admin };

    const upgraded = {
      ...(await createPasswordRecord(inputPassword)),
      passwordVersion: admin.passwordVersion || 1,
    };
    await env.STAEXOCTOR_KV.put('app:admin', JSON.stringify(upgraded));
    return { valid: true, admin: upgraded };
  }

  if (
    admin.passwordHash &&
    admin.passwordSalt &&
    admin.passwordIterations &&
    admin.passwordAlgorithm === 'pbkdf2-sha256'
  ) {
    const derived = await pbkdf2Hex(inputPassword, admin.passwordSalt, admin.passwordIterations, 32);

    return {
      valid: derived === admin.passwordHash,
      admin,
    };
  }

  return { valid: false, admin };
}

async function createPasswordRecord(password) {
  const salt = randomHex(16);
  const iterations = PASSWORD_ITERATIONS;
  const hash = await pbkdf2Hex(password, salt, iterations, 32);

  return {
    passwordHash: hash,
    passwordSalt: salt,
    passwordIterations: iterations,
    passwordAlgorithm: 'pbkdf2-sha256',
  };
}

async function pbkdf2Hex(password, saltHex, iterations, length = 32) {
  const passwordKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToBytes(saltHex),
      iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    length * 8,
  );

  return bytesToHex(new Uint8Array(bits));
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(hashBuffer));
}

function randomHex(byteLength = 16) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return arr;
}

function trimSlash(str = '') {
  return str.replace(/^\/+|\/+$/g, '');
}

function decodeBase64Utf8(base64) {
  const binary = atob(base64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeUtf8Base64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

async function githubRequest(url, options = {}, purpose = '') {
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Staexoctor',
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    throw new Error(mapGitHubError(data, purpose));
  }

  return data;
}

async function githubGetRepo({ owner, repo, token }) {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  return await githubRequest(
    url,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    },
    'repo',
  );
}

async function githubGetBranch({ owner, repo, branch, token }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`;
  return await githubRequest(
    url,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    },
    'branch',
  );
}

async function githubListContents({ owner, repo, branch, token, path, purpose = 'dir' }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(branch)}`;
  return await githubRequest(
    url,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    },
    purpose,
  );
}

async function githubGetContent({ owner, repo, branch, token, path, purpose = 'file' }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(branch)}`;
  return await githubRequest(
    url,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    },
    purpose,
  );
}

async function githubPutContent({ owner, repo, branch, token, path, content, message, sha }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
  const body = {
    message,
    content: encodeUtf8Base64(content),
    branch,
  };
  if (sha) body.sha = sha;

  return await githubRequest(
    url,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    'file',
  );
}

async function githubPutBase64Content({ owner, repo, branch, token, path, base64Content, message, sha }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
  const body = {
    message,
    content: base64Content.replace(/^data:.*?;base64,/, ''),
    branch,
  };
  if (sha) body.sha = sha;

  return await githubRequest(
    url,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    'file',
  );
}

async function githubDeleteContent({ owner, repo, branch, token, path, sha, message }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
  return await githubRequest(
    url,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        sha,
        branch,
      }),
    },
    'file',
  );
}

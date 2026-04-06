export function setToken(token) {
  localStorage.setItem('staexoctor_token', token);
}

export function getToken() {
  return localStorage.getItem('staexoctor_token') || '';
}

export function clearToken() {
  localStorage.removeItem('staexoctor_token');
}

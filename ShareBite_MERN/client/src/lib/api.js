import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true
});

let token = localStorage.getItem('sharebite_token') || null;
let refreshing = null;

export const setToken = t => {
  token = t;
  if (t) {
    localStorage.setItem('sharebite_token', t);
  } else {
    localStorage.removeItem('sharebite_token');
  }
};

api.interceptors.request.use(c => {
  if (token) {
    c.headers.Authorization = `Bearer ${token}`;
  }
  return c;
});

api.interceptors.response.use(
  r => r,
  async e => {
    const o = e.config;
    if (e.response?.status === 401 && !o?._retry && !o?.url?.includes('/auth/refresh') && !o?.url?.includes('/auth/login')) {
      o._retry = true;
      try {
        const storedRefresh = localStorage.getItem('sharebite_refresh');
        refreshing ||= api.post('/auth/refresh', { refreshToken: storedRefresh }).then(r => {
          const newToken = r.data.data.accessToken;
          setToken(newToken);
          if (r.data.data.refreshToken) {
            localStorage.setItem('sharebite_refresh', r.data.data.refreshToken);
          }
          if (r.data.data.user) {
            localStorage.setItem('sharebite_user', JSON.stringify(r.data.data.user));
          }
          return newToken;
        }).finally(() => {
          refreshing = null;
        });

        const t = await refreshing;
        o.headers.Authorization = `Bearer ${t}`;
        return api(o);
      } catch {
        setToken(null);
        localStorage.removeItem('sharebite_user');
        localStorage.removeItem('sharebite_token');
        localStorage.removeItem('sharebite_refresh');
        window.dispatchEvent(new Event('sharebite:expired'));
      }
    }
    return Promise.reject(e);
  }
);

export default api;

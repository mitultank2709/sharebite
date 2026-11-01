import axios from 'axios';
const api=axios.create({baseURL: import.meta.env.VITE_API_URL || '/api/v1',withCredentials:true});let token=null,refreshing=null;export const setToken=t=>{token=t};
api.interceptors.request.use(c=>{if(token)c.headers.Authorization=`Bearer ${token}`;return c});
api.interceptors.response.use(r=>r,async e=>{const o=e.config;if(e.response?.status===401&&!o?._retry&&!o?.url?.includes('/auth/')){o._retry=true;try{refreshing ||= api.post('/auth/refresh').then(r=>{setToken(r.data.data.accessToken);return r.data.data.accessToken}).finally(()=>refreshing=null);const t=await refreshing;o.headers.Authorization=`Bearer ${t}`;return api(o)}catch{setToken(null);window.dispatchEvent(new Event('sharebite:expired'))}}return Promise.reject(e)});export default api;

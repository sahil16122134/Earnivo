/** Ledger Light admin: privileged management calls are explicit and always route through the Earnivo Worker. */
import { api } from "../../js/api.js";
export const adminApi = Object.freeze({
  list: (resource, { limit = 20, cursor = null } = {}) => { const params = new URLSearchParams({ limit: String(limit) }); if (cursor) params.set("cursor", cursor); return api.get(`/v1/admin/${resource}?${params.toString()}`); },
  get: (resource, id) => api.get(`/v1/admin/${resource}/${encodeURIComponent(id)}`),
  create: (resource, body) => api.post(`/v1/admin/${resource}`, body),
  update: (resource, id, body) => api.patch(`/v1/admin/${resource}/${encodeURIComponent(id)}`, body),
  remove: (resource, id) => api.delete(`/v1/admin/${resource}/${encodeURIComponent(id)}`),
  action: (resource, id, action, body = {}) => api.post(`/v1/admin/${resource}/${encodeURIComponent(id)}/${action}`, body)
});

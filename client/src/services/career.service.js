import { api } from './api.js';

export const careerService = {
  listFields: () => api.get('/career-fields').then((r) => r.data.fields),

  list: (params = {}) => api.get('/careers', { params }).then((r) => r.data),

  get: (idOrSlug) => api.get(`/careers/${idOrSlug}`).then((r) => r.data.career),

  skills: () => api.get('/careers/skills').then((r) => r.data.skills),

  listSaved: () => api.get('/saved-careers').then((r) => r.data.saved),

  save: (careerId, note = '') =>
    api.post('/saved-careers', { careerId, note }).then((r) => r.data),

  unsave: (careerId) => api.delete(`/saved-careers/${careerId}`).then((r) => r.data),
};

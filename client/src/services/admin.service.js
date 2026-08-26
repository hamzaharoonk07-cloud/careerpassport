import { api } from './api.js';

/**
 * Admin API.
 *
 * Every call here goes to /api/admin/*, which the server gates on both a
 * session and the admin role. The panel hiding itself from non-admins is a
 * courtesy; this module will simply get 403s otherwise.
 */
export const adminService = {
  /* ── Overview ─────────────────────────────────────────────── */
  stats: () => api.get('/admin/stats').then((r) => r.data),

  /* ── People ───────────────────────────────────────────────── */
  users: (params) => api.get('/admin/users', { params }).then((r) => r.data),
  user: (id) => api.get(`/admin/users/${id}`).then((r) => r.data),
  setRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }).then((r) => r.data),

  /* ── Career profiles ──────────────────────────────────────── */
  careers: (params) => api.get('/admin/careers', { params }).then((r) => r.data),
  createCareer: (body) => api.post('/admin/careers', body).then((r) => r.data),
  updateCareer: (id, body) => api.patch(`/admin/careers/${id}`, body).then((r) => r.data),
  deleteCareer: (id) => api.delete(`/admin/careers/${id}`).then((r) => r.data),

  /* ── Quiz questions and scoring ───────────────────────────── */
  questions: () => api.get('/admin/questions').then((r) => r.data),
  createQuestion: (body) => api.post('/admin/questions', body).then((r) => r.data),
  updateQuestion: (id, body) => api.patch(`/admin/questions/${id}`, body).then((r) => r.data),
  deleteQuestion: (id) => api.delete(`/admin/questions/${id}`).then((r) => r.data),
  createOption: (qid, body) => api.post(`/admin/questions/${qid}/options`, body).then((r) => r.data),
  updateOption: (qid, oid, body) =>
    api.patch(`/admin/questions/${qid}/options/${oid}`, body).then((r) => r.data),
  deleteOption: (qid, oid) =>
    api.delete(`/admin/questions/${qid}/options/${oid}`).then((r) => r.data),

  /* ── Multimedia centre ────────────────────────────────────── */
  media: () => api.get('/admin/media').then((r) => r.data),
  createMedia: (body) => api.post('/admin/media', body).then((r) => r.data),
  updateMedia: (id, body) => api.patch(`/admin/media/${id}`, body).then((r) => r.data),
  deleteMedia: (id) => api.delete(`/admin/media/${id}`).then((r) => r.data),

  /* ── Feedback ─────────────────────────────────────────────── */
  feedback: (params) => api.get('/admin/feedback', { params }).then((r) => r.data),
  updateFeedback: (id, body) => api.patch(`/admin/feedback/${id}`, body).then((r) => r.data),
  deleteFeedback: (id) => api.delete(`/admin/feedback/${id}`).then((r) => r.data),

  /* ── Success stories ──────────────────────────────────────── */
  stories: () => api.get('/admin/stories').then((r) => r.data),
  createStory: (body) => api.post('/admin/stories', body).then((r) => r.data),
  updateStory: (id, body) => api.patch(`/admin/stories/${id}`, body).then((r) => r.data),
  deleteStory: (id) => api.delete(`/admin/stories/${id}`).then((r) => r.data),
};

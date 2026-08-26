import { api } from './api.js';

/**
 * The reader-facing half of the content admins manage.
 *
 * Reading needs no session. Submitting attaches the account when there is
 * one, but does not require it — a visitor who hit a bug should be able to
 * say so without registering first.
 */
export const publicService = {
  media: (params) => api.get('/media', { params }).then((r) => r.data.media),
  stories: (params) => api.get('/stories', { params }).then((r) => r.data.stories),
  submitStory: (body) => api.post('/stories', body).then((r) => r.data),
  submitFeedback: (body) => api.post('/feedback', body).then((r) => r.data),
};

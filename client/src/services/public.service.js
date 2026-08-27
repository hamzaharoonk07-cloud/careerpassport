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
  /* Puts a file on the server and returns its URL. Publishes nothing by
     itself — the URL still goes through the moderated submission below. */
  uploadFile: async (file) => {
    const data = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(new Error('That file could not be read.'));
      fr.readAsDataURL(file);
    });
    const r = await api.post('/users/me/upload', { filename: file.name, data });
    return r.data;
  },
  submitMedia: (body) => api.post('/media', body).then((r) => r.data),
  submitStory: (body) => api.post('/stories', body).then((r) => r.data),
  submitFeedback: (body) => api.post('/feedback', body).then((r) => r.data),
  myFeedback: () => api.get('/feedback/mine').then((r) => r.data.feedback),
};

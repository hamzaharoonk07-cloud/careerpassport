import { api } from './api.js';

export const quizService = {
  /** mode: 'full' (the whole bank, one variant per slot) or 'quick' (seven questions). */
  getQuestions: (mode = 'full') =>
    api.get('/quiz', { params: mode === 'quick' ? { mode } : {} }).then((r) => r.data.questions),

  submit: (answers, mode = 'full') =>
    api.post('/quiz/submit', { answers, mode }).then((r) => r.data.result),

  latestResult: () => api.get('/results/me').then((r) => r.data.result),

  history: () => api.get('/results/me/all').then((r) => r.data.results),

  getResult: (id) => api.get(`/results/${id}`).then((r) => r.data.result),

  /** The report for one chosen career: { career, match, best }. match is null before any quiz. */
  careerReport: (slug) => api.get(`/results/me/career/${encodeURIComponent(slug)}`).then((r) => r.data),
};

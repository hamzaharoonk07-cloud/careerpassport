import { api } from './api.js';

export const quizService = {
  getQuestions: () => api.get('/quiz').then((r) => r.data.questions),

  submit: (answers) => api.post('/quiz/submit', { answers }).then((r) => r.data.result),

  latestResult: () => api.get('/results/me').then((r) => r.data.result),

  history: () => api.get('/results/me/all').then((r) => r.data.results),

  getResult: (id) => api.get(`/results/${id}`).then((r) => r.data.result),
};

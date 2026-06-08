import client from './client';

const submitTask = (token, { orderId, question, imageCount, research, recommendations, keywords, speechText }) =>
  client.request('/tasks/submit', {
    method: 'POST',
    token,
    body: { orderId, question, imageCount, research, recommendations, keywords, speechText },
  });

const getTask = (token, taskId) =>
  client.request(`/tasks/${taskId}`, {
    method: 'GET',
    token,
  });

const getUserTasks = (token) =>
  client.request('/tasks', {
    method: 'GET',
    token,
  });

export default { submitTask, getTask, getUserTasks };

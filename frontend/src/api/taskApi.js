import client from './client';

const submitTask = (token, body) =>
  client.request('/tasks/submit', {
    method: 'POST',
    token,
    body,
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

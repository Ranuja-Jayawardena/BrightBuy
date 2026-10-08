let isRefreshing = false;
let failedQueue: Array<{resolve: (value?: any) => void, reject: (reason?: any) => void}> = [];

const processQueue = (error: any) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

export const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  let response = await fetch(url, options);

  // If 401 and it's not a login or register endpoint, try to refresh
  if (response.status === 401 && !url.includes('/api/auth/login') && !url.includes('/api/auth/register')) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshResponse = await fetch('/api/auth/refresh', { method: 'POST' });
        if (refreshResponse.ok) {
          processQueue(null);
          // Retry original request
          response = await fetch(url, options);
        } else {
          processQueue(new Error('Refresh failed'));
        }
      } catch (err) {
        processQueue(err);
      } finally {
        isRefreshing = false;
      }
    } else {
      // Wait for the ongoing refresh to complete, then retry
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: () => resolve(fetch(url, options)),
          reject: (err) => reject(err)
        });
      });
    }
  }

  return response;
};

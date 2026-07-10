import api from './axios';

let _csrfToken = null;

// Fetch a CSRF token from the server (also sets it in a cookie)
export const fetchCsrfToken = async () => {
  const { data } = await api.get('/auth/csrf');
  _csrfToken = data.csrfToken;
  return _csrfToken;
};

export const getCsrfToken = () => _csrfToken;

// create API client using fetch wrapper
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
export const API_PUBLIC_BASE_URL = API_BASE_URL.replace(/\/api$/, '');
export const fileUrl = (path) => {
  if (!path) return '';
  // Stored using public disk -> accessible via /storage/{path}
  return `${API_PUBLIC_BASE_URL}/storage/${path}`;
};

let AUTH_TOKEN = null;

export function setAuthToken(token) {
	AUTH_TOKEN = token;
}

export function clearAuthToken() {
	AUTH_TOKEN = null;
}

export const api = {
	async request(path, { method = 'GET', body, headers = {}, isForm = false } = {}) {
		const url = `${API_BASE_URL}${path}`;
		const finalHeaders = { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...headers };
		if (AUTH_TOKEN) finalHeaders['Authorization'] = `Bearer ${AUTH_TOKEN}`;
		if (!isForm && body && !(body instanceof FormData)) {
			finalHeaders['Content-Type'] = 'application/json';
		}

		const res = await fetch(url, {
			method,
			headers: finalHeaders,
			body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
			credentials: 'include'
		});

		if (!res.ok) {
			let errMsg = `HTTP ${res.status}`;
			try {
				const data = await res.json();
				errMsg = data.message || errMsg;
				throw { response: { status: res.status, data } };
			} catch (_) {
				throw new Error(errMsg);
			}
		}

		const contentType = res.headers.get('content-type') || '';
		if (contentType.includes('application/json')) {
			return { data: await res.json() };
		}
		return { data: await res.text() };
	},
	get(path) {
		return this.request(path, { method: 'GET' });
	},
	post(path, body, options = {}) {
		return this.request(path, { method: 'POST', body, ...options });
	},
	patch(path, body, options = {}) {
		return this.request(path, { method: 'PATCH', body, ...options });
	},
	put(path, body, options = {}) {
		return this.request(path, { method: 'PUT', body, ...options });
	},
	delete(path) {
		return this.request(path, { method: 'DELETE' });
	}
};


const BASE = '/api';

async function request(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
    }
    return res.json();
}

// Assets
export const getAssets = () => request('/assets');
export const getAsset = (id) => request(`/assets/${id}`);
export const getAssetLogs = (id) => request(`/assets/${id}/logs`);
export const getAssetBySerial = (serial) => request(`/assets/by-serial/${encodeURIComponent(serial)}`);
export const createAsset = (body) => request('/assets', { method: 'POST', body });
export const updateAsset = (id, body) => request(`/assets/${id}`, { method: 'PATCH', body });
export const deleteAsset = (id) => request(`/assets/${id}`, { method: 'DELETE' });

// Employees
export const getEmployees = () => request('/employees');
export const createEmployee = (body) => request('/employees', { method: 'POST', body });

// Projects
export const getProjects = (status) => request(`/projects${status ? `?status=${status}` : ''}`);
export const getProject = (id) => request(`/projects/${id}`);
export const createProject = (body) => request('/projects', { method: 'POST', body });
export const updateProject = (id, body) => request(`/projects/${id}`, { method: 'PATCH', body });
export const deleteProject = (id) => request(`/projects/${id}`, { method: 'DELETE' });

// Project ↔ Assets
export const assignAsset = (projectId, body) => request(`/projects/${projectId}/assets`, { method: 'POST', body });
export const releaseAsset = (projectId, assetId) =>
    request(`/projects/${projectId}/assets/${assetId}`, { method: 'DELETE' });

// QR
export const getQRCode = (text) => request(`/qrcode?text=${encodeURIComponent(text)}`);

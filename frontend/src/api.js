const API = "https://basket-backend-cf9p.onrender.com/api";

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  if (!response.ok) {
    let message = "Request failed";
    try {
      const data = await response.json();
      message = data.detail || message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}

export const api = {
  dashboard: () => request("/dashboard"),
  products: () => request("/products"),
  rules: (params = {}) =>
    request(`/rules?${new URLSearchParams(params).toString()}`),
  recommend: (product) => request(`/recommend/${encodeURIComponent(product)}`),
  network: () => request("/network-graph"),
  seasonal: () => request("/seasonal-trends"),
  segments: () => request("/segments"),
  segmentRules: (id) => request(`/segments/${encodeURIComponent(id)}/rules`),
  upload: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/upload", { method: "POST", body: form });
  },
  mine: (body) =>
    request("/mine-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  segment: (body) =>
    request("/segment-customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  simulate: (body) =>
    request("/simulate-revenue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  reportUrl: `${API}/report/generate`,
};

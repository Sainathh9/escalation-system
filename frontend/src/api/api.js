const BASE_URL = "http://localhost:5001/api";

export const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(BASE_URL + url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    // Handle 401 — token expired or invalid
    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return { error: "Session expired. Please sign in again." };
    }

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error || `Request failed (${res.status})`, status: res.status };
    }

    // Auto-unwrap standardised { success: true, data } responses 
    // to shield the frontend UI components from breaking.
    if (data.success && data.data !== undefined) {
      // For endpoints that return pagination metadata at the top level alongside 'data'
      // Example: { success: true, data: [...items], pagination: {...}, filters: {...} }
      if (data.pagination) {
        return { data: data.data, pagination: data.pagination, ...(data.filters && { filters: data.filters }) };
      }
      return data.data; // Standard object/array unpacking
    }

    return data;
  } catch (err) {
    console.error("API Error:", err.message);
    return { error: "Network error. Please check your connection." };
  }
};
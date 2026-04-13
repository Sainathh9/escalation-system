const BASE_URL = "http://localhost:5001/api";

export const apiFetch = async (url, options = {}) => {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(BASE_URL + url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Something went wrong");
    }

    return data;
  } catch (err) {
    console.error("API Error:", err.message);
    return { error: err.message };
  }
};
// src/utils/axiosInstance.js
import axios from "axios";

const instance = axios.create({
  baseURL: "http://localhost/OptiTruck/backend/controllers",
  headers: {
    "Content-Type": "application/json",
  },
});

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`; // ⬅️ Très important
    } else {
      console.warn("❗ Aucun token trouvé dans localStorage");
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default instance;

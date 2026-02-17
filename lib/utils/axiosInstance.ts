import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "./api";
import { getLocalStorage, removeLocalStorage, setLocalStorage } from "./jwtUtils";
import { TokenData } from "../interfaces/interfaces";

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
});

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getLocalStorage<string>("accessToken");
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
        config.headers["X-Timezone"] = timezone;
    }
    return config;
});

axiosInstance.interceptors.response.use(
    (response) => response,

    async (error: AxiosError) => {
        const originalRequest = error.config as CustomAxiosRequestConfig;
        const refresh_token = getLocalStorage<TokenData>("refresh_token");

        if (!error.response || !refresh_token) {
            return Promise.reject(error);
        }

        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                    refreshToken: refresh_token,
                });

                const newTokenData: TokenData = refreshResponse.data.data;

                setLocalStorage("accessToken", newTokenData.accessToken);
                setLocalStorage("refresh_token", newTokenData.refreshToken);

                axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newTokenData.accessToken}`;

                if (originalRequest.headers && typeof originalRequest.headers.set === "function") {
                    originalRequest.headers.set("Authorization", `Bearer ${newTokenData.accessToken}`);
                } else {
                    originalRequest.headers = new axios.AxiosHeaders(originalRequest.headers);
                    originalRequest.headers.set("Authorization", `Bearer ${newTokenData.accessToken}`);
                }

                return axiosInstance(originalRequest);
            } catch (refreshError) {
                console.error("Refresh token failed:", refreshError);
                removeLocalStorage("accessToken");
                removeLocalStorage(`sb-${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}-auth-token`);
                removeLocalStorage("currentUser");
                removeLocalStorage("refresh_token");
                removeLocalStorage("userId");
                removeLocalStorage("provider");
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "./api";
import { getLocalStorage, removeLocalStorage, setLocalStorage } from "./jwtUtils";
import { TokenData } from "../interfaces/interfaces";
import CryptoJS from "crypto-js";
import { ALLOWED_API_KEYS } from "../constants";

const SECRET_KEY = process.env.NEXT_PUBLIC_REQUEST_SECRET_KEY!;

function generateNonce() {
    return CryptoJS.lib.WordArray.random(16).toString();
}

function getRandomApiKey() {
    return ALLOWED_API_KEYS[
        Math.floor(
            Math.random() *
            ALLOWED_API_KEYS.length
        )
    ];
}

export const createSecurityHeaders = (apiPath: string) => {
    const timestamp =
        Date.now().toString();

    const nonce =
        generateNonce();

    const apiKey =
        getRandomApiKey();

    const payload =
        timestamp +
        apiPath +
        nonce +
        apiKey;

    const signature =
        CryptoJS.HmacSHA256(
            payload,
            SECRET_KEY
        ).toString();

    return {
        "x-api-key": apiKey,
        "x-timestamp": timestamp,
        "x-nonce": nonce,
        "x-signature": signature,
    };
};

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
});

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

let isRefreshing = false;

let failedQueue: {
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
}[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else if (token) {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getLocalStorage<string>("accessToken");
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!config.headers) {
        config.headers = new axios.AxiosHeaders();
    }
    if (token) {
        config.headers["X-Timezone"] = timezone;
        config.headers.Authorization = `Bearer ${token}`;
    }

    const baseURL =
        axiosInstance.defaults.baseURL;

    const url =
        new URL(
            config.url || "",
            baseURL
        );

    // ✅ Add axios params manually
    if (config.params) {
        Object.entries(
            config.params
        ).forEach(([key, value]) => {
            if (
                value !== undefined &&
                value !== null
            ) {
                url.searchParams.set(
                    key,
                    String(value)
                );
            }
        });
    }

    // ✅ Sort params
    const sortedParams =
        new URLSearchParams(
            Array.from(
                url.searchParams.entries()
            ).sort()
        ).toString();

    const path =
        url.pathname +
        (sortedParams
            ? `?${sortedParams}`
            : "");

    const securityHeaders =
        createSecurityHeaders(path);

    Object.entries(securityHeaders)
        .forEach(([key, value]) => {
            config.headers.set(key, value);
        });

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

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({
                        resolve: (token: string) => {
                            originalRequest.headers.Authorization =
                                `Bearer ${token}`;

                            resolve(axiosInstance(originalRequest));
                        },
                        reject,
                    });
                });
            }

            isRefreshing = true;

            try {
                const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                    refreshToken: refresh_token,
                });

                const newTokenData: TokenData = refreshResponse.data.data;

                setLocalStorage("accessToken", newTokenData.accessToken);
                setLocalStorage("refresh_token", newTokenData.refreshToken);

                axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newTokenData.accessToken}`;

                processQueue(
                    null,
                    newTokenData.accessToken
                );

                if (originalRequest.headers && typeof originalRequest.headers.set === "function") {
                    originalRequest.headers.set("Authorization", `Bearer ${newTokenData.accessToken}`);
                } else {
                    originalRequest.headers = new axios.AxiosHeaders(originalRequest.headers);
                    originalRequest.headers.set("Authorization", `Bearer ${newTokenData.accessToken}`);
                }

                return axiosInstance(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                console.error("Refresh token failed:", refreshError);
                removeLocalStorage("accessToken");
                removeLocalStorage(`sb-${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}-auth-token`);
                removeLocalStorage("currentUser");
                removeLocalStorage("refresh_token");
                removeLocalStorage("userId");
                removeLocalStorage("provider");
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
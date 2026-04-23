/**
 * Custom Fetch Hook with Elite Performance Features
 * 
 * Provides a standardized way to fetch data with built-in:
 * - Global client-side caching with TTL.
 * - Automatic retries with exponential backoff.
 * - Request cancellation (AbortController) to prevent race conditions.
 * - Global error handling via Toast notifications.
 * - Loading and error states.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

// Global Cache Store: Persists across component unmounts for "Elite" speed
const fetchCache: Record<string, { data: any, timestamp: number }> = {};
const DEFAULT_TTL = 30000; // 30 seconds default cache

interface FetchState<T> {
    data: T | null;
    loading: boolean;
    error: any;
}

const DEFAULT_OPTIONS = {};

export const useFetch = <T>(url: string, options: any = DEFAULT_OPTIONS) => {
    const [state, setState] = useState<FetchState<T>>({
        data: null,
        loading: !options.manual,
        error: null
    });
    const { showToast } = useToast();
    const abortControllerRef = useRef<AbortController | null>(null);

    const execute = useCallback(async (customUrl?: string, customOptions?: any) => {
        const targetUrl = customUrl || url;
        const mergedOptions = { ...options, ...customOptions };
        const cacheKey = `${targetUrl}:${JSON.stringify(mergedOptions.params || {})}`;

        // 1. Check Cache (Only for GET requests)
        const method = mergedOptions.method || 'GET';
        if (method.toUpperCase() === 'GET' && !mergedOptions.skipCache) {
            const cached = fetchCache[cacheKey];
            const ttl = mergedOptions.ttl || DEFAULT_TTL;
            if (cached && Date.now() - cached.timestamp < ttl) {
                setState({ data: cached.data, loading: false, error: null });
                return cached.data;
            }
        }

        // Cancel previous request if it exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setState(prev => ({ ...prev, loading: true, error: null }));

        // Retry Logic:
        // Automatically attempts to refetch up to 3 times if the connection fails.
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                const response = await api({
                    url: targetUrl,
                    ...mergedOptions,
                    signal: controller.signal
                });

                // 2. Update Cache
                if (method.toUpperCase() === 'GET' && !mergedOptions.skipCache) {
                    fetchCache[cacheKey] = {
                        data: response.data,
                        timestamp: Date.now()
                    };
                }

                setState({ data: response.data, loading: false, error: null });
                return response.data;
            } catch (err: any) {
                if (axios.isCancel(err)) {
                    return;
                }
                
                attempts++;
                if (attempts < maxAttempts) {
                    console.warn(`Fetch attempt ${attempts} failed for [${url}]. Retrying...`, err);
                    await new Promise(resolve => setTimeout(resolve, 500 * attempts)); // Backoff
                    continue;
                }

                console.error(`Fetch error after ${maxAttempts} attempts [${url}]:`, err);
                const errorMsg = err.response?.data?.message || 'Something went wrong';
                
                setState({ data: null, loading: false, error: err });
                showToast(errorMsg, 'error');
                throw err;
            }
        }
    }, [url, JSON.stringify(options), showToast]);

    // Initial fetch if requested
    useEffect(() => {
        if (!options.manual) {
            execute();
        }
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [execute, options.manual]);

    return { ...state, refetch: execute };
};

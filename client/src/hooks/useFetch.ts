import { useState, useCallback, useEffect, useRef } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

interface FetchState<T> {
    data: T | null;
    loading: boolean;
    error: any;
}

const DEFAULT_OPTIONS = {};

export const useFetch = <T>(url: string, options: any = DEFAULT_OPTIONS) => {
    const [state, setState] = useState<FetchState<T>>({
        data: null,
        loading: true,
        error: null
    });
    const { showToast } = useToast();
    const abortControllerRef = useRef<AbortController | null>(null);

    const execute = useCallback(async (customUrl?: string, customOptions?: any) => {
        // Cancel previous request if it exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const response = await api({
                url: customUrl || url,
                ...options,
                ...customOptions,
                signal: controller.signal
            });

            setState({ data: response.data, loading: false, error: null });
            return response.data;
        } catch (err: any) {
            if (err.name === 'CanceledError') return;
            
            console.error(`Fetch error [${url}]:`, err);
            const errorMsg = err.response?.data?.message || 'Something went wrong';
            
            setState({ data: null, loading: false, error: err });
            showToast(errorMsg, 'error');
            throw err;
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

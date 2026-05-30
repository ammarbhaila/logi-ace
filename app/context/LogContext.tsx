"use client";

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface LogContextType {
    logActivity: (params: {
        action: string;
        description?: string;
        isError?: boolean;
        errorMessage?: string;
        metadata?: any;
    }) => Promise<void>;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

export function LogProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const lastPathRef = useRef<string | null>(null);
    const entryTimeRef = useRef<number>(Date.now());

    const logActivity = async (params: {
        action: string;
        description?: string;
        isError?: boolean;
        errorMessage?: string;
        metadata?: any;
    }) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;

            await fetch('/api/logs/capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user?.id,
                    user_name: user?.user_metadata?.full_name || user?.email?.split('@')[0],
                    user_email: user?.email,
                    action: params.action,
                    description: params.description,
                    route: window.location.pathname,
                    is_error: params.isError,
                    error_message: params.errorMessage,
                    metadata: params.metadata || {}
                })
            });
        } catch (err) {
            console.error('[LogContext] Failed to capture log:', err);
        }
    };

    useEffect(() => {
        const handlePageView = async () => {
            const currentTime = Date.now();

            if (lastPathRef.current && lastPathRef.current !== pathname) {
                const timeSpent = Math.floor((currentTime - entryTimeRef.current) / 1000);
                await logActivity({
                    action: 'PAGE_EXIT',
                    description: `User left ${lastPathRef.current}`,
                    metadata: { time_spent_seconds: timeSpent, from: lastPathRef.current, to: pathname }
                });
            }

            await logActivity({
                action: 'PAGE_VIEW',
                description: `User viewed ${pathname}`,
                metadata: { path: pathname }
            });

            lastPathRef.current = pathname;
            entryTimeRef.current = currentTime;
        };

        handlePageView();
    }, [pathname]);

    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            logActivity({
                action: 'CLIENT_ERROR',
                isError: true,
                errorMessage: event.message,
                metadata: {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    stack: event.error?.stack
                }
            });
        };

        window.addEventListener('error', handleError);
        return () => window.removeEventListener('error', handleError);
    }, []);

    return (
        <LogContext.Provider value={{ logActivity }}>
            {children}
        </LogContext.Provider>
    );
}

export function useLog() {
    const context = useContext(LogContext);
    if (context === undefined) {
        throw new Error('useLog must be used within a LogProvider');
    }
    return context;
}

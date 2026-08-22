import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiFetch, ApiError } from '@/lib/api-client';
import { clearTokens, getAccessToken, getDeviceToken, getRefreshToken, getSessionRole, getSessionUsername, setDeviceToken, setTokens } from '@/lib/auth-tokens';
import { getTranslation } from '@/i18n';

// `step` tracks which form to show; `status` tracks loading/error independently
// so a verifyOtp request in flight (status='loading') doesn't fall out of the
// OTP step back to the credentials form.
export type SessionStep = 'credentials' | 'otp';
export type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'error';

interface SessionState {
    step: SessionStep;
    status: SessionStatus;
    username: string | null;
    role: string | null;
    isAuthenticated: boolean;
    error: string | null;
    errorCode: string | null;
}

const initialState: SessionState = {
    step: 'credentials',
    status: 'idle',
    username: null,
    role: null,
    isAuthenticated: false,
    error: null,
    errorCode: null,
};

interface ParsedError {
    message: string;
    code: string | null;
}

// Backend errors carry a stable `error_code` (see core/views.py) so this can
// render a translated message regardless of the selected language — the raw
// `error` string on the response body is always Vietnamese and is only a
// fallback for responses that don't set error_code (e.g. DRF's own 500s).
const parseError = (err: unknown): ParsedError => {
    if (err instanceof ApiError) {
        const body = err.body as { error?: string; error_code?: string; attempts_left?: number; detail?: string } | null;
        if (body?.error_code) {
            const { t } = getTranslation();
            let message = t(`error_${body.error_code}`);
            if (typeof body.attempts_left === 'number') {
                message = message.replace('{attempts}', String(body.attempts_left));
            }
            return { message, code: body.error_code };
        }
        return { message: body?.error ?? body?.detail ?? err.message, code: null };
    }
    return { message: err instanceof Error ? err.message : 'Unknown error', code: null };
};

// "Remember me" (remember_me: true) requests a 30-day refresh token and
// marks this browser as trusted for 30 days (core/views.py). If the device
// is already trusted from a previous remembered login, the backend skips
// OTP entirely and returns tokens directly here — trustedDevice tells the
// login form to finish immediately instead of moving to the OTP step.
export const requestOtp = createAsyncThunk(
    'session/requestOtp',
    async (payload: { identifier: string; password: string; remember_me?: boolean }, { rejectWithValue }) => {
        try {
            const data = await apiFetch<
                | { message: string; username: string }
                | { trusted_device: true; username: string; access: string; refresh: string; role: string; device_token: string | null }
            >('/login/request-otp/', {
                method: 'POST',
                body: { ...payload, device_token: getDeviceToken() },
            });

            if ('trusted_device' in data && data.trusted_device) {
                setTokens({ access: data.access, refresh: data.refresh, role: data.role, username: data.username, rememberMe: payload.remember_me });
                if (data.device_token) setDeviceToken(data.device_token);
                return { trustedDevice: true as const, username: data.username, role: data.role };
            }

            return { trustedDevice: false as const, username: data.username };
        } catch (err) {
            return rejectWithValue(parseError(err));
        }
    }
);

export const verifyOtp = createAsyncThunk(
    'session/verifyOtp',
    async (payload: { username: string; otp: string; remember_me?: boolean }, { rejectWithValue }) => {
        try {
            const data = await apiFetch<{ access: string; refresh: string; role: string; device_token: string | null }>('/login/verify-otp/', {
                method: 'POST',
                body: payload,
            });
            setTokens({ access: data.access, refresh: data.refresh, role: data.role, username: payload.username, rememberMe: payload.remember_me });
            if (data.device_token) setDeviceToken(data.device_token);
            return { username: payload.username, role: data.role };
        } catch (err) {
            return rejectWithValue(parseError(err));
        }
    }
);

export const logout = createAsyncThunk('session/logout', async () => {
    const refresh = getRefreshToken();
    if (refresh) {
        try {
            await apiFetch('/logout/', { method: 'POST', body: { refresh } });
        } catch {
            // Best-effort: clearing client-side state is what actually matters for the UI.
        }
    }
    clearTokens();
});

const sessionSlice = createSlice({
    name: 'session',
    initialState,
    reducers: {
        // Rehydrate from cookies on app mount — there's no /api/me/ to re-derive
        // role from just the JWT, so username/role were cached at login time.
        hydrate(state) {
            const access = getAccessToken();
            const username = getSessionUsername();
            const role = getSessionRole();
            if (access && username && role) {
                state.step = 'credentials';
                state.status = 'authenticated';
                state.isAuthenticated = true;
                state.username = username;
                state.role = role;
            } else {
                state.step = 'credentials';
                state.status = 'idle';
                state.isAuthenticated = false;
                state.username = null;
                state.role = null;
            }
        },
        resetToCredentials(state) {
            state.step = 'credentials';
            state.status = 'idle';
            state.error = null;
            state.errorCode = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(requestOtp.pending, (state) => {
                state.status = 'loading';
                state.error = null;
                state.errorCode = null;
            })
            .addCase(requestOtp.fulfilled, (state, action) => {
                state.error = null;
                state.errorCode = null;
                state.username = action.payload.username;
                if (action.payload.trustedDevice) {
                    state.step = 'credentials';
                    state.status = 'authenticated';
                    state.isAuthenticated = true;
                    state.role = action.payload.role;
                } else {
                    state.step = 'otp';
                    state.status = 'idle';
                }
            })
            .addCase(requestOtp.rejected, (state, action: PayloadAction<unknown>) => {
                const payload = action.payload as ParsedError | undefined;
                state.status = 'error';
                state.error = payload?.message ?? 'Login failed';
                state.errorCode = payload?.code ?? null;
            })
            .addCase(verifyOtp.pending, (state) => {
                state.status = 'loading';
                state.error = null;
                state.errorCode = null;
            })
            .addCase(verifyOtp.fulfilled, (state, action) => {
                state.status = 'authenticated';
                state.isAuthenticated = true;
                state.username = action.payload.username;
                state.role = action.payload.role;
                state.error = null;
                state.errorCode = null;
            })
            .addCase(verifyOtp.rejected, (state, action: PayloadAction<unknown>) => {
                const payload = action.payload as ParsedError | undefined;
                state.status = 'error';
                state.error = payload?.message ?? 'OTP verification failed';
                state.errorCode = payload?.code ?? null;
            })
            .addCase(logout.fulfilled, (state) => {
                state.step = 'credentials';
                state.status = 'idle';
                state.isAuthenticated = false;
                state.username = null;
                state.role = null;
                state.error = null;
                state.errorCode = null;
            });
    },
});

export const { hydrate, resetToCredentials } = sessionSlice.actions;
export default sessionSlice.reducer;

import { combineReducers, configureStore } from '@reduxjs/toolkit';
import themeConfigSlice from '@/store/themeConfigSlice';
import posSlice from '@/store/posSlice';
import sessionSlice from '@/store/sessionSlice';

const rootReducer = combineReducers({
    themeConfig: themeConfigSlice,
    pos: posSlice,
    session: sessionSlice,
});

export default configureStore({
    reducer: rootReducer,
});

export type IRootState = ReturnType<typeof rootReducer>;

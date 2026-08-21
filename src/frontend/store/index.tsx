import { combineReducers, configureStore } from '@reduxjs/toolkit';
import themeConfigSlice from '@/store/themeConfigSlice';
import posSlice from '@/store/posSlice';

const rootReducer = combineReducers({
    themeConfig: themeConfigSlice,
    pos: posSlice,
});

export default configureStore({
    reducer: rootReducer,
});

export type IRootState = ReturnType<typeof rootReducer>;

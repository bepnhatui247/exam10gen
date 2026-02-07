import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GeminiModel } from '../types';

interface SettingsContextType {
    apiKey: string;
    setApiKey: (key: string) => void;
    model: GeminiModel;
    setModel: (model: GeminiModel) => void;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (isOpen: boolean) => void;
    hasKey: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY_API = 'examgen_api_key';
const STORAGE_KEY_MODEL = 'examgen_model';

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [apiKey, setApiKeyState] = useState('');
    const [model, setModelState] = useState<GeminiModel>(GeminiModel.AMBITIOUS_FLASH);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        const storedKey = localStorage.getItem(STORAGE_KEY_API);
        const storedModel = localStorage.getItem(STORAGE_KEY_MODEL);

        if (storedKey) setApiKeyState(storedKey);

        // Validate stored model against enum values
        if (storedModel && Object.values(GeminiModel).includes(storedModel as GeminiModel)) {
            setModelState(storedModel as GeminiModel);
        } else {
            // Default to Flash as per instructions "Order: Flash (Default)"
            setModelState(GeminiModel.AMBITIOUS_FLASH);
        }

        // Auto-open settings if no key found on load
        if (!storedKey) {
            setIsSettingsOpen(true);
        }
    }, []);

    const setApiKey = (key: string) => {
        setApiKeyState(key);
        localStorage.setItem(STORAGE_KEY_API, key);
    };

    const setModel = (newModel: GeminiModel) => {
        setModelState(newModel);
        localStorage.setItem(STORAGE_KEY_MODEL, newModel);
    };

    const value = {
        apiKey,
        setApiKey,
        model,
        setModel,
        isSettingsOpen,
        setIsSettingsOpen,
        hasKey: !!apiKey && apiKey.length > 10 // Basic validation
    };

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

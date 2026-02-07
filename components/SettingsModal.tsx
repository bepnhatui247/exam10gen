import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { GeminiModel } from '../types';
import { XIcon, CheckCircleIcon, KeyIcon } from './Icons';

export const SettingsModal = () => {
    const { isSettingsOpen, setIsSettingsOpen, apiKey, setApiKey, model, setModel } = useSettings();
    const [localKey, setLocalKey] = useState(apiKey);

    useEffect(() => {
        setLocalKey(apiKey);
    }, [apiKey]);

    if (!isSettingsOpen) return null;

    const handleSave = () => {
        setApiKey(localKey);
        setIsSettingsOpen(false);
    };

    const models = [
        {
            id: GeminiModel.AMBITIOUS_FLASH,
            name: "Gemini 2.0 Flash",
            desc: "Tốc độ nhanh, phản hồi tức thì. Khuyên dùng cho hầu hết tác vụ.",
            tag: "Khuyên dùng"
        },
        {
            id: GeminiModel.PRO,
            name: "Gemini 2.0 Pro",
            desc: "Mô hình thông minh nhất, lý luận sâu. Dùng cho đề thi khó/phức tạp.",
            tag: "Mạnh nhất"
        },
        {
            id: GeminiModel.FLASH_LEGACY,
            name: "Gemini 1.5 Flash",
            desc: "Phiên bản cũ ổn định, tiết kiệm chi phí.",
            tag: "Backup"
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-0 overflow-hidden transform transition-all scale-100">

                {/* Header */}
                <div className="bg-[#0077b5] p-6 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <KeyIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Cài đặt hệ thống</h2>
                            <p className="text-blue-100 text-sm opacity-90">Cấu hình API Key và Model xử lý</p>
                        </div>
                    </div>
                    <button onClick={() => setIsSettingsOpen(false)} className="text-white/70 hover:text-white transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 max-h-[70vh] overflow-y-auto">

                    {/* Section 1: API Key */}
                    <div className="mb-8">
                        <label className="block text-gray-700 font-bold mb-2 flex items-center justify-between">
                            <span>Google Gemini API Key <span className="text-red-500">*</span></span>
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[#0077b5] text-sm hover:underline font-normal">
                                Lấy API Key tại đây &rarr;
                            </a>
                        </label>
                        <div className="relative">
                            <input
                                type="password"
                                value={localKey}
                                onChange={(e) => setLocalKey(e.target.value)}
                                placeholder="Nhập API key của bạn (bắt đầu bằng AIza...)"
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077b5] focus:border-[#0077b5] outline-none transition-all"
                            />
                            <KeyIcon className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
                        </div>
                        <p className="text-gray-500 text-xs mt-2">
                            Key được lưu an toàn trong trình duyệt của bạn (LocalStorage).
                        </p>
                    </div>

                    {/* Section 2: Model Selection */}
                    <div>
                        <label className="block text-gray-700 font-bold mb-4">Chọn Mô hình xử lý</label>
                        <div className="grid grid-cols-1 gap-4">
                            {models.map((m) => {
                                const isSelected = model === m.id;
                                return (
                                    <div
                                        key={m.id}
                                        onClick={() => setModel(m.id)}
                                        className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-50 ${isSelected ? 'border-[#0077b5] bg-blue-50/50' : 'border-gray-200'
                                            }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${isSelected ? 'border-[#0077b5]' : 'border-gray-300'
                                                }`}>
                                                {isSelected && <div className="w-2.5 h-2.5 bg-[#0077b5] rounded-full" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className={`font-bold ${isSelected ? 'text-[#0077b5]' : 'text-gray-900'}`}>{m.name}</h3>
                                                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold ${m.id === GeminiModel.AMBITIOUS_FLASH ? 'bg-green-100 text-green-700' :
                                                            m.id === GeminiModel.PRO ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {m.tag}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500">{m.desc}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={() => setIsSettingsOpen(false)}
                        className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Đóng
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!localKey}
                        className={`px-8 py-2.5 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all ${!localKey ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#0077b5] hover:bg-[#006090] hover:-translate-y-1'
                            }`}
                    >
                        <CheckCircleIcon className="w-5 h-5" />
                        Lưu Cài đặt
                    </button>
                </div>

            </div>
        </div>
    );
};

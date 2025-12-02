import React, { useEffect, useState } from 'react';
import { X, Trash2, MessageSquare } from 'lucide-react';
import axios from 'axios';

interface ChatMessage {
    id: string;
    query: string;
    response: string;
    timestamp: string;
}

interface ChatHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChatHistoryModal: React.FC<ChatHistoryModalProps> = ({ isOpen, onClose }) => {
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('auth_token');
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/v1/chat/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(response.data);
        } catch (error) {
            console.error('Failed to fetch chat history:', error);
        } finally {
            setLoading(false);
        }
    };

    const clearHistory = async () => {
        if (!window.confirm('Are you sure you want to clear all chat history?')) return;

        try {
            const token = localStorage.getItem('auth_token');
            await axios.delete(`${process.env.REACT_APP_API_URL}/api/v1/chat/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory([]);
        } catch (error) {
            console.error('Failed to clear chat history:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center space-x-2">
                        <MessageSquare className="w-6 h-6 text-blue-600" />
                        <h2 className="text-2xl font-bold text-gray-900">Chat History</h2>
                    </div>
                    <div className="flex items-center space-x-2">
                        {history.length > 0 && (
                            <button
                                onClick={clearHistory}
                                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Clear All</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
                            <p className="text-lg">No chat history yet</p>
                            <p className="text-sm">Your AI queries will appear here</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {history.map((chat) => (
                                <div key={chat.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <div className="flex items-start justify-between mb-2">
                                        <span className="text-xs text-gray-500">
                                            {new Date(chat.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-700 mb-1">Query:</p>
                                            <p className="text-gray-900 bg-white p-3 rounded border border-gray-200">
                                                {chat.query}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-700 mb-1">Response:</p>
                                            <p className="text-gray-900 bg-white p-3 rounded border border-gray-200 whitespace-pre-wrap">
                                                {chat.response}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatHistoryModal;

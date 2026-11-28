import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/react';
import { Navigate } from 'react-router-dom';
import "../styles/consulta_ia_style.css";
import "../styles/consulta_history_style.css";
import HistorialConversaciones from "../components/HistorialConversaciones";
import Chat from "../components/Chat";
import MainLayout from "../../../shared/components/MainLayout";
import FullScreenLoader from "../../../shared/components/FullScreenLoader";
import { useIaService } from "../services/ia_service";

export function ConsultaIA(props) {
  const { isLoaded, isSignedIn } = useAuth();
  const { analyzeProduct, getHistory, deleteHistoryItem } = useIaService();

  const [selectedChat, setSelectedChat] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSignedIn) return;
    let isMounted = true;
    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const records = await getHistory();
        if (isMounted && Array.isArray(records)) {
          setHistory(records.filter(r => r.interaction_type !== 'Skin_analysis'));
        }
      } catch (err) {
        console.error('Error al cargar historial:', err);
      } finally {
        if (isMounted) setIsLoadingHistory(false);
      }
    };
    fetchHistory();
    return () => { isMounted = false; };
  }, [isSignedIn]);

  if (!isLoaded) return <FullScreenLoader isVisible={true} text="Cargando Consulta con IA..." />;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;

  const handleSelectConversation = (item) => {
    setSelectedChat(item);
    setError('');
  };

  const handleNewConsultation = () => {
    setSelectedChat(null);
    setError('');
  };

  const handleDeleteConversation = async (historyId) => {
    try {
      await deleteHistoryItem(historyId);
      setHistory(prev => prev.filter(item => item.id !== historyId));
      if (selectedChat?.id === historyId) setSelectedChat(null);
    } catch (err) {
      console.error('Error al eliminar consulta:', err);
    }
  };

  const handleChatMessageSaved = (historyId, newMsgs) => {
    const append = (item) => {
      if (!item || item.id !== historyId) return item;
      const a = typeof item.analysis === 'string'
        ? (() => { try { return JSON.parse(item.analysis); } catch { return {}; } })()
        : (item.analysis || {});
      return { ...item, analysis: { ...a, chat_messages: [...(a.chat_messages || []), ...newMsgs] } };
    };
    setHistory(prev => prev.map(append));
    setSelectedChat(prev => append(prev));
  };

  // Submit from the inline composer in empty-state
  const handleSubmitAnalysis = async ({ searchQuery, imageBase64 }) => {
    if (!searchQuery?.trim() && !imageBase64) {
      setError('Por favor escribe el nombre de un producto o adjunta una fotografía.');
      return;
    }
    setIsAnalyzing(true);
    setError('');
    try {
      const response = await analyzeProduct({ searchQuery, imageBase64 });
      if (response?.success && response?.data) {
        const result = response.data;
        const newConversation = {
          id: result.history_id || Date.now().toString(),
          title: result.analysis?.subject || searchQuery || 'Análisis de producto',
          query_text: searchQuery || '[Análisis por fotografía]',
          image: imageBase64,
          preview: result.analysis?.summary || 'Análisis completado.',
          time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
          created_at: new Date().toISOString(),
          analysis: result.analysis,
          requires_professional_attention: Boolean(result.analysis?.requires_professional_attention),
          flagged: Boolean(result.analysis?.requires_professional_attention),
        };
        setHistory(prev => [newConversation, ...prev]);
        setSelectedChat(newConversation);
      } else {
        throw new Error(response?.message || 'No se recibieron datos válidos del análisis.');
      }
    } catch (err) {
      setError(err.message || 'Ocurrió un error al procesar el análisis. Inténtalo de nuevo.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <MainLayout>
      <div className="cia-layout">
        {/* Top bar: title + history pill */}
        <header className="cia-topbar">
          <div className="cia-topbar-left">
            <h1 className="cia-title">Consulta con IA</h1>
            <p className="cia-subtitle">
              {selectedChat
                ? selectedChat.title ?? 'Conversación guardada'
                : 'Pregunta por un producto o ingrediente'}
            </p>
          </div>
          <div className="cia-topbar-right">
            <HistorialConversaciones
              onSelectConversation={handleSelectConversation}
              onNewConsultation={handleNewConsultation}
              selectedId={selectedChat?.id}
              chats={history}
              onDeleteConversation={handleDeleteConversation}
            />
          </div>
        </header>

        {/* Main chat area */}
        <main className="cia-main">
          <Chat
            conversationData={selectedChat}
            onNewConsultation={handleNewConsultation}
            onChatMessageSaved={handleChatMessageSaved}
            onSubmitAnalysis={handleSubmitAnalysis}
            isAnalyzing={isAnalyzing}
            submitError={error}
          />
        </main>
      </div>
    </MainLayout>
  );
}

export default ConsultaIA;

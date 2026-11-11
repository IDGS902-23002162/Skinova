import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/react';
import { Navigate } from 'react-router-dom';
import "../../../shared/styles/ai_chat_style.css";
import "../../../shared/styles/ai_history_style.css";
import HistorialConversaciones from "../components/HistorialConversaciones";
import Chat from "../components/Chat";
import AiChat from "../../../shared/components/CameraInput";
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

  const [productText, setProductText] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);

  // Cargar historial de consultas previas al iniciar
  useEffect(() => {
    if (!isSignedIn) return;

    let isMounted = true;
    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const records = await getHistory();
        if (isMounted && Array.isArray(records)) {
          setHistory(records);
        }
      } catch (err) {
        console.error("Error al cargar historial de consultas:", err);
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [isSignedIn]);

  if (!isLoaded) {
    return <FullScreenLoader isVisible={true} text="Cargando Consulta con IA..." />;
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  const handleSelectConversation = (item) => {
    setSelectedChat(item);
    setError('');
  };

  const handleNewConsultation = () => {
    setSelectedChat(null);
    setError('');
    setProductText('');
    setCapturedImage(null);
  };

  const handleDeleteConversation = async (historyId) => {
    try {
      await deleteHistoryItem(historyId);
      setHistory((prev) => prev.filter((item) => item.id !== historyId));
      if (selectedChat?.id === historyId) {
        setSelectedChat(null);
      }
    } catch (err) {
      console.error("Error al eliminar consulta del historial:", err);
    }
  };

  const handleClearAll = () => {
    setProductText('');
    setCapturedImage(null);
    setError('');
  };

  const handleSubmitAnalysis = async (dataFromInput) => {
    const text = dataFromInput?.productText !== undefined ? dataFromInput.productText : productText;
    const img = dataFromInput?.capturedImage !== undefined ? dataFromInput.capturedImage : capturedImage;

    if (!text?.trim() && !img) {
      setError("Por favor escribe el nombre de un producto o captura una fotografía.");
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const response = await analyzeProduct({
        searchQuery: text,
        imageBase64: img
      });

      if (response && response.success && response.data) {
        const result = response.data;
        const newConversation = {
          id: result.history_id || Date.now().toString(),
          title: result.analysis?.subject || text || "Análisis de producto",
          query_text: text || "[Análisis por fotografía]",
          image: img,
          preview: result.analysis?.summary || "Análisis completado.",
          time: new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
          created_at: new Date().toISOString(),
          analysis: result.analysis,
          requires_professional_attention: Boolean(result.analysis?.requires_professional_attention),
          flagged: Boolean(result.analysis?.requires_professional_attention)
        };

        // Actualizar lista local de historial
        setHistory((prev) => [newConversation, ...prev]);

        // Abrir la conversación inmediatamente con el resultado
        setSelectedChat(newConversation);

        // Limpiar campos del formulario
        setProductText('');
        setCapturedImage(null);
      } else {
        throw new Error(response?.message || "No se recibieron datos válidos del análisis.");
      }
    } catch (err) {
      console.error("Error al analizar producto con IA:", err);
      setError(err.message || "Ocurrió un error al procesar el análisis. Inténtalo de nuevo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isNew = !selectedChat;

  return (
    <MainLayout>
      <div className="pa-page-layout">
        <aside className="pa-history-sidebar" aria-labelledby="pa-history-title">
          <h2 id="pa-history-title" className="pa-section-title">
            Historial de consultas
          </h2>
          <HistorialConversaciones
            onSelectConversation={handleSelectConversation}
            onNewConsultation={handleNewConsultation}
            selectedId={selectedChat?.id}
            chats={history}
            onDeleteConversation={handleDeleteConversation}
          />
        </aside>

        <main className="pa-main-content">
          <header className="pa-main-head">
            <h1 className="pa-main-title">Consulta con IA</h1>
            <h2 className="pa-chat-title">
              {isNew ? 'Nueva consulta' : selectedChat.title ?? 'Conversación guardada'}
            </h2>
            <p className="pa-main-subtitle">
              {isNew
                ? 'Pregunta por un producto o ingrediente y entiende cómo se relaciona con tu piel y rutina.'
                : 'Revisa esta conversación o inicia una consulta nueva desde el historial.'}
            </p>
          </header>

          {selectedChat ? (
            <Chat 
              conversationData={selectedChat} 
              onNewConsultation={handleNewConsultation} 
            />
          ) : (
            <AiChat 
              {...props}
              productText={productText}
              onProductTextChange={setProductText}
              capturedImage={capturedImage}
              onImageCaptured={setCapturedImage}
              onSubmit={handleSubmitAnalysis}
              onClearAll={handleClearAll}
              isLoading={isAnalyzing}
              error={error}
              submitLabel="Analizar Producto"
            />
          )}
        </main>
      </div>
    </MainLayout>
  );
}

export default ConsultaIA;

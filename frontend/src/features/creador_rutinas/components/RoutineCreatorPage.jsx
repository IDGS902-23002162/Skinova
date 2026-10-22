import React, { useState } from 'react';
import { Check, Sparkles, Info, AlertTriangle, MoreVertical, Plus, Sun, Moon } from 'lucide-react';
import './RoutineCreator.css';
import MainLayout from "../../../shared/components/MainLayout";

function RoutineCreatorPage() {
  const [done, setDone] = useState([]);
  const [openTip, setOpenTip] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [rutinaActiva, setRutinaActiva] = useState('matutina'); // Estado para alternar rutinas

  const toggleDone = (id) => {
    setDone(done.includes(id) ? done.filter(item => item !== id) : [...done, id]);
  };

  // Se agregó un tercer producto (Protector Solar)
  const products = [
    {
      id: 'p1', step: 1, name: 'Limpiador Facial Suave', amount: '2 pumps', method: 'Masajear en rostro húmedo por 60s', 
      badge: 'inventory', warning: false, note: 'Prepara la piel eliminando impurezas sin resecar.'
    },
    {
      id: 'p2', step: 2, name: 'Sérum de Vitamina C', amount: '3-4 gotas', method: 'Aplicar a toques suaves', 
      badge: 'ai', warning: true, note: 'Ayuda con la luminosidad. No mezclar con ácidos fuertes.'
    },
    {
      id: 'p3', step: 3, name: 'Protector Solar FPS 50+', amount: '2 dedos', method: 'Aplicar uniformemente en rostro y cuello', 
      badge: 'ai', warning: false, note: 'Paso fundamental e indispensable para prevenir el daño solar.'
    }
  ];

  return (
    <MainLayout>
      <div className="routine-creator-wrapper">
        
        {/* CABECERA: Título y botón de añadir paso */}
        <header className="page-header">
          <div className="header-top">
            <div>
              <h1>Creador de Rutinas</h1>
              <p>Tu rutina {rutinaActiva === 'matutina' ? 'matutina' : 'nocturna'} recomendada</p>
            </div>
            
            <button className="btn-add-step">
              <Plus size={18} />
              <span>Añadir paso</span>
            </button>
          </div>

          {/* PESTAÑAS: Mañana o Noche */}
          <div className="rutinas-tabs">
            <button 
              className={`tab-button ${rutinaActiva === 'matutina' ? 'active' : ''}`}
              onClick={() => setRutinaActiva('matutina')}
            >
              <Sun size={18} />
              Rutina Matutina
            </button>
            <button 
              className={`tab-button ${rutinaActiva === 'nocturna' ? 'active' : ''}`}
              onClick={() => setRutinaActiva('nocturna')}
            >
              <Moon size={18} />
              Rutina Nocturna
            </button>
          </div>
        </header>

        {/* LISTA DE PRODUCTOS */}
        <section className="routine-list" aria-label="Routine steps">
          {products.map((product, index) => {
            const isDone = done.includes(product.id);
            return (
              <article className={`product-card ${isDone ? "completed" : ""}`} key={product.id}>
                
                <div className="timeline">
                  <div className={`step-dot ${isDone ? 'done-dot' : ''}`}>
                    {isDone ? <Check size={16} strokeWidth={3} /> : product.step}
                  </div>
                  {index < products.length - 1 && <div className="timeline-line" />}
                </div>

                <div className="product-copy">
                  <div className="product-meta">
                    <span className="step-label">Paso {product.step}</span>
                    <span className={`badge ${product.badge}`}>
                      {product.badge === "ai" && <Sparkles size={12} className="ai-icon"/>}
                      {product.badge === "ai" ? " ✨ Sugerencia IA" : " 👜 En Mi Neceser"}
                    </span>
                  </div>
                  
                  <h2>{product.name}</h2>
                  
                  <div className="instructions">
                    <div className="inst-block">
                      <span>Cantidad: </span>
                      <strong>{product.amount}</strong>
                    </div>
                    <div className="inst-block">
                      <span>Aplicación: </span>
                      <strong>{product.method}</strong>
                    </div>
                  </div>
                  
                  <label className="done-control">
                    <input 
                      type="checkbox" 
                      checked={isDone} 
                      onChange={() => toggleDone(product.id)} 
                    />
                    <span className="custom-check">
                      {isDone && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span>{isDone ? "Marcar como realizado" : "Marcar como realizado"}</span>
                  </label>
                </div>

                <div className="card-actions">
                  <button 
                    className={`tip-button ${product.warning ? "has-warning" : ""}`}
                    onClick={() => setOpenTip(openTip === product.id ? null : product.id)}
                  >
                    {product.warning ? <AlertTriangle size={18} /> : <Info size={18} />}
                  </button>
                  
                  <button 
                    className="more-button"
                    onClick={() => setOpenMenu(openMenu === product.id ? null : product.id)}
                  >
                    <MoreVertical size={20} />
                  </button>

                  {openTip === product.id && (
                    <div className={`tooltip ${product.warning ? "warning-tooltip" : ""}`}>
                      <strong>{product.warning ? "Precaución" : "¿Por qué este paso?"}</strong>
                      <p>{product.note}</p>
                    </div>
                  )}

                  {openMenu === product.id && (
                    <div className="context-menu">
                      <button onClick={() => setOpenMenu(null)}>Sustituir producto</button>
                      <button className="danger" onClick={() => setOpenMenu(null)}>Pausar de la rutina</button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </MainLayout>
  );
}

export default RoutineCreatorPage;
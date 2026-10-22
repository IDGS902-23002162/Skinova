import React, { useState } from 'react';
import { Check, Sparkles, Info, AlertTriangle, MoreVertical, Plus, Sun, Moon } from 'lucide-react';
import './RoutineCreator.css';
import MainLayout from "../../../shared/components/MainLayout";

function RoutineCreatorPage() {
  const [done, setDone] = useState([]);
  const [openTip, setOpenTip] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [rutinaActiva, setRutinaActiva] = useState('matutina');

  const toggleDone = (id) => {
    setDone(done.includes(id) ? done.filter(item => item !== id) : [...done, id]);
  };

  // Datos separados para mostrar diferentes productos
  const productosMatutinos = [
    { id: 'm1', step: 1, name: 'Limpiador Facial Suave', amount: '2 pumps', method: 'Masajear en rostro húmedo', badge: 'inventory', warning: false, note: 'Prepara la piel eliminando impurezas.' },
    { id: 'm2', step: 2, name: 'Sérum de Vitamina C', amount: '3-4 gotas', method: 'Aplicar a toques suaves', badge: 'ai', warning: true, note: 'Ayuda con la luminosidad. No mezclar con ácidos fuertes.' },
    { id: 'm3', step: 3, name: 'Protector Solar FPS 50+', amount: '2 dedos', method: 'Aplicar uniformemente', badge: 'ai', warning: false, note: 'Paso indispensable para prevenir el daño solar.' }
  ];

  const productosNocturnos = [
    { id: 'n1', step: 1, name: 'Bálsamo Desmaquillante', amount: 'Tamaño de una almendra', method: 'Masajear en rostro seco', badge: 'inventory', warning: false, note: 'Derrite maquillaje y protector solar de forma gentil.' },
    { id: 'n2', step: 2, name: 'Gel Limpiador', amount: '1 pump', method: 'Masajear con agua tibia', badge: 'inventory', warning: false, note: 'Segunda parte de la doble limpieza.' },
    { id: 'n3', step: 3, name: 'Crema Noche con Retinol', amount: 'Tamaño de un guisante', method: 'Evitar el contorno de ojos', badge: 'ai', warning: true, note: 'Renovación celular. Usar 2-3 veces por semana.' }
  ];

  // Alterna el arreglo dependiendo del estado activo
  const productosActuales = rutinaActiva === 'matutina' ? productosMatutinos : productosNocturnos;

  return (
    <MainLayout>
      <div className="routine-creator-wrapper">
        
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

          {/* NUEVO DISEÑO MINIMALISTA TIPO PÍLDORA */}
          <div className="routine-toggle">
            <button 
              className={`toggle-btn ${rutinaActiva === 'matutina' ? 'active' : ''}`}
              onClick={() => setRutinaActiva('matutina')}
            >
              <Sun size={18} />
              Morning Routine
            </button>
            <button 
              className={`toggle-btn ${rutinaActiva === 'nocturna' ? 'active' : ''}`}
              onClick={() => setRutinaActiva('nocturna')}
            >
              <Moon size={18} />
              Night Routine
            </button>
          </div>
        </header>

        {/* LISTA DE PRODUCTOS ACTUALIZADA */}
        <section className="routine-list" aria-label="Routine steps">
          {productosActuales.map((product, index) => {
            const isDone = done.includes(product.id);
            return (
              <article className={`product-card ${isDone ? "completed" : ""}`} key={product.id}>
                
                <div className="timeline">
                  <div className={`step-dot ${isDone ? 'done-dot' : ''}`}>
                    {isDone ? <Check size={16} strokeWidth={3} /> : product.step}
                  </div>
                  {index < productosActuales.length - 1 && <div className="timeline-line" />}
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
                    <span>Marcar como realizado</span>
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
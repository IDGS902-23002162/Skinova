import React, { useState } from 'react';
import { Check } from 'lucide-react';
import './RoutineCard.css';

function RoutineCard({ paso, producto, instrucciones, source }) {
    const [isCompleted, setIsCompleted] = useState(false);

    return (
        <div className={`rutina-card ${isCompleted ? 'completed' : ''}`}>
            <div className="card-content">
                <div className="step-number">{paso}</div>
                <div className="product-info">
                    <h3>{producto}</h3>
                    <p>{instrucciones}</p>
                    <span className={`badge ${source === 'inventory' ? 'inventory' : 'ai'}`}>
                        {source === 'inventory' ? 'En Mi Neceser' : '✨ Sugerencia IA'}
                    </span>
                </div>
            </div>
            
            <div className="card-actions">
                <button 
                    className={`btn-done ${isCompleted ? 'active' : ''}`}
                    onClick={() => setIsCompleted(!isCompleted)}
                    aria-label="Marcar como completado"
                >
                    <Check size={20} />
                </button>
            </div>
        </div>
    );
}

export default RoutineCard;
import React from 'react';
import { useAuth } from '@clerk/react';
import MainLayout from '../../../shared/components/MainLayout';
import FullScreenLoader from '../../../shared/components/FullScreenLoader';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';
import CancelSubscriptionModal from '../components/CancelSubscriptionModal';
import { Check } from 'lucide-react';
import { useSuscripcion } from '../hooks/useSuscripcion';
import './SubscriptionsPage.css';

export default function SubscriptionsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const {
    subscription,
    isPremiumActive,
    isSubscriptionEnding,
    isLoadingCheckout,
    isCanceling,
    isModalOpen,
    setIsModalOpen,
    isSuccessModalOpen,
    isCancelModalOpen,
    setIsCancelModalOpen,
    handleCheckout,
    handleCancelSubscription,
    handleCloseSuccessModal,
    handleExplore
  } = useSuscripcion();

  const formattedPeriodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : null;

  if (!isLoaded) return <FullScreenLoader isVisible={true} text="Cargando..." />;

  return (
    <MainLayout>
      <main className="subscription-module">
        <section className="subscription-hero">
          <h1>Elige cómo quieres<br /><em>acompañarte.</em></h1>
          <p>Empieza con lo esencial o profundiza en lo que tu piel te cuenta.</p>
        </section>

        <section className="plans" aria-label="Planes de suscripción">
          <article className="plan-card">
            <div className="plan-card-top">
              <div>
                <p className="eyebrow">Para comenzar</p>
                <h2>Skinova Free</h2>
              </div>
              <div className="plan-price">
                <strong>$0</strong>
                <span>MXN · para siempre</span>
              </div>
            </div>

            <div className="plan-divider"></div>
            <p className="section-label">Incluye</p>
            <ul style={{ marginBottom: '2rem' }} className="feature-list">
              <li><span className="check-icon">✓</span> Perfil y salud de la piel</li>
              <li><span className="check-icon">✓</span> Registro de tipo de piel y objetivos</li>
              <li><span className="check-icon">✓</span> Mi Neceser y rutinas</li>
              <li><span className="check-icon">✓</span> Bitácora básica de progreso</li>
              <li><span className="check-icon">✓</span> Acceso a la comunidad</li>
              <li><span className="check-icon">✓</span> Directorio dermatológico</li>
            </ul>
            <button
              className="plan-button plan-button-outline"
              type="button"
              disabled={isPremiumActive || isSubscriptionEnding}
            >
              {(isPremiumActive || isSubscriptionEnding) ? "Plan Básico" : (isSignedIn ? "Plan actual" : "Comenzar gratis")}
            </button>
          </article>

          <article className={`plan-card plan-card-premium ${isPremiumActive ? 'plan-card-subscribed' : ''}`}>
            {/* Contenido de la tarjeta (se difumina de fondo cuando está activo) */}
            <div className={`plan-card-body ${isPremiumActive ? 'plan-card-blurred' : ''}`}>
              <div className="popular-badge">Más completo</div>
              <div className="plan-card-top">
                <div>
                  <p className="eyebrow">Para profundizar</p>
                  <h2>Skinova Premium</h2>
                </div>
                <div className="plan-price">
                  <strong>$99</strong>
                  <span>MXN / mes</span>
                </div>
              </div>

              <div className="plan-divider"></div>
              <p className="section-label">Incluye</p>
              <ul className="feature-list">
                <li><span className="check-icon">✓</span> Todo lo incluido en Skinova Free</li>
                <li><span className="check-icon">✓</span> Más análisis de piel con inteligencia artificial</li>
                <li><span className="check-icon">✓</span> Recomendaciones personalizadas con IA</li>
                <li><span className="check-icon">✓</span> Historial completo de análisis</li>
                <li><span className="check-icon">✓</span> Comparación avanzada del progreso</li>
                <li><span className="check-icon">✓</span> Seguimiento avanzado de rutinas y productos</li>
              </ul>

              <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {isSubscriptionEnding && formattedPeriodEnd && (
                  <div className="subscribed-period-badge ending-period-badge">
                    <span>Tu suscripción terminará en: {formattedPeriodEnd}</span>
                  </div>
                )}
                <button
                  className="plan-button plan-button-primary"
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  disabled={isPremiumActive || isSubscriptionEnding}
                >
                  Obtener Premium
                </button>
              </div>
            </div>

            {/* Modal flotante elegante sobre la tarjeta blurreada */}
            {isPremiumActive && (
              <div className="subscribed-card-overlay">
                <div className="subscribed-floating-card">
                  <div className="subscribed-icon-wrap">
                    <Check size={22} className="subscribed-check-svg" />
                  </div>

                  <h3 className="subscribed-card-title">¡Ya estás suscrito!</h3>
                  <div className="subscribed-period-badge">
                    {subscription?.current_period_end ? (
                      <span>Próxima renovación: {new Date(subscription.current_period_end).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    ) : (
                      <span>Suscripción mensual activa</span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="discreet-cancel-btn"
                    onClick={() => setIsCancelModalOpen(true)}
                  >
                    Cancelar suscripción
                  </button>
                </div>
              </div>
            )}
          </article>
        </section>

        <section className="reassurance" aria-label="Información adicional">
          <div><span className="reassurance-icon">✦</span><p><strong>Sin presión.</strong> Cambia de plan cuando quieras.</p></div>
          <div><span className="reassurance-icon">◌</span><p><strong>Tu información, contigo.</strong> Tus datos siempre son tuyos.</p></div>
          <div><span className="reassurance-icon">⌁</span><p><strong>Hecho para acompañar.</strong> No reemplaza una consulta dermatológica.</p></div>
        </section>

        <ConfirmationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleCheckout}
        />
        <SuccessModal
          isOpen={isSuccessModalOpen}
          onClose={handleCloseSuccessModal}
          onExplore={handleExplore}
        />
        <CancelSubscriptionModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          onConfirm={handleCancelSubscription}
          isCanceling={isCanceling}
        />
        {isLoadingCheckout && <FullScreenLoader isVisible={true} text="Redirigiendo al pago seguro..." />}
      </main>
    </MainLayout>
  );
}

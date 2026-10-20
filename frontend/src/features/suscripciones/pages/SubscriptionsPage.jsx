import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../../shared/components/MainLayout';
import { useAuth } from '@clerk/react';
import { useApi } from '../../../shared/hooks/useApi';
import FullScreenLoader from '../../../shared/components/FullScreenLoader';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';
import CancelSubscriptionModal from '../components/CancelSubscriptionModal';
import { Check } from 'lucide-react';
import './SubscriptionsPage.css';

export default function SubscriptionsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { fetchConAuth } = useApi();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const [subscription, setSubscription] = useState(() => {
    try {
      const cached = localStorage.getItem('skinova_subscription');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let isMounted = true;
    const sessionId = searchParams.get('session_id');
    const isSuccess = searchParams.get('success') === 'true';

    const checkSubscription = async () => {
      if (sessionId) {
        try {
          const res = await fetchConAuth('/verify-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId })
          });
          const data = await res.json();
          if (isMounted && res.ok && data?.subscription) {
            setSubscription(data.subscription);
            localStorage.setItem('skinova_subscription', JSON.stringify(data.subscription));
            setIsSuccessModalOpen(true);
          }
        } catch (err) {
          console.error('Error al verificar sesión de Stripe:', err);
        }
      } else {
        if (isSuccess && isMounted) {
          setIsSuccessModalOpen(true);
        }
        try {
          const res = await fetchConAuth('/subscription');
          if (isMounted && res.ok) {
            const data = await res.json();
            if (data?.subscription) {
              setSubscription(data.subscription);
              localStorage.setItem('skinova_subscription', JSON.stringify(data.subscription));
            } else {
              setSubscription(null);
              localStorage.removeItem('skinova_subscription');
            }
          }
        } catch (err) {
          console.error('Error al cargar suscripción:', err);
        }
      }
    };

    checkSubscription();

    return () => {
      isMounted = false;
    };
  }, [isLoaded, isSignedIn, searchParams]);

  const handleCloseSuccessModal = () => {
    setIsSuccessModalOpen(false);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('success');
    newParams.delete('session_id');
    setSearchParams(newParams, { replace: true });
  };

  const handleExplore = () => {
    handleCloseSuccessModal();
    navigate('/');
  };

  const handleCancelSubscription = async () => {
    try {
      setIsCanceling(true);
      const res = await fetchConAuth('/cancel-subscription', {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setSubscription(null);
        localStorage.removeItem('skinova_subscription');
        setIsCancelModalOpen(false);
        alert('Tu suscripción a Skinova Premium ha sido cancelada.');
      } else {
        alert(data.error || 'No se pudo cancelar la suscripción.');
      }
    } catch (err) {
      console.error('Error al cancelar la suscripción:', err);
      alert('Ocurrió un error al cancelar la suscripción.');
    } finally {
      setIsCanceling(false);
    }
  };

  if (!isLoaded) return <FullScreenLoader isVisible={true} text="Cargando..." />;

  const handleCheckout = async () => {
    try {
      setIsModalOpen(false);
      setIsLoadingCheckout(true);
      const response = await fetchConAuth('/create-checkout-session', {
        method: 'POST'
      });
      const data = await response.json();
      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        console.error('Error creating checkout session', data);
        alert(data.error || 'No se pudo iniciar la sesión de pago.');
        setIsLoadingCheckout(false);
      }
    } catch (error) {
      console.error('Error during checkout', error);
      alert('Error de conexión al procesar el pago.');
      setIsLoadingCheckout(false);
    }
  };

  const isPremiumActive = subscription?.status === 'active';

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
              disabled={isPremiumActive}
            >
              {isPremiumActive ? "Plan Básico" : (isSignedIn ? "Plan actual" : "Comenzar gratis")}
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

              <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                <button 
                  className="plan-button plan-button-primary" 
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  disabled={isPremiumActive}
                >
                  Obtener Premium
                </button>
              </div>
            </div>

            {/* Modal flotante elegante sobre la tarjeta blurreada */}
            {isPremiumActive && (
              <div className="subscribed-card-overlay">
                <div className="subscribed-floating-card">
                  <div className="subscribed-pill">
                    <span className="subscribed-dot"></span>
                    <span>PLAN ACTIVO</span>
                  </div>

                  <div className="subscribed-icon-wrap">
                    <Check size={22} className="subscribed-check-svg" />
                  </div>

                  <h3 className="subscribed-card-title">¡Ya estás suscrito!</h3>
                  <p className="subscribed-card-desc">
                    Tu piel ya cuenta con el acompañamiento integral y herramientas avanzadas de <strong>Skinova Premium</strong>.
                  </p>

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

        <details className="faq-section">
          <summary>¿Tienes dudas sobre los planes?</summary>
          <p>Puedes comenzar gratis y pasar a Premium cuando quieras. No hay permanencia ni cargos ocultos.</p>
        </details>

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

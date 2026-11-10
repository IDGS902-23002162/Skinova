import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/react';
import { useApi } from '../../../shared/hooks/useApi';
import { createSubscriptionApi } from '../services/subscriptionApi';

const STORAGE_KEY = 'skinova_subscription';

export function useSuscripcion() {
  const { isSignedIn, isLoaded } = useAuth();
  const { fetchConAuth } = useApi();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const subscriptionApi = createSubscriptionApi(fetchConAuth);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);

  const [subscription, setSubscription] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
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
          const res = await subscriptionApi.verifyCheckoutSession(sessionId);
          const data = await res.json();
          if (isMounted && res.ok && data?.subscription) {
            setSubscription(data.subscription);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.subscription));
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
          const res = await subscriptionApi.getSubscription();
          if (isMounted && res.ok) {
            const data = await res.json();
            if (data?.subscription) {
              setSubscription(data.subscription);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(data.subscription));
            } else {
              setSubscription(null);
              localStorage.removeItem(STORAGE_KEY);
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
  }, [isLoaded, isSignedIn, searchParams, fetchConAuth]);

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
      const res = await subscriptionApi.cancelSubscription();
      const data = await res.json();
      if (res.ok) {
        const updatedSubscription = data?.subscription || (subscription ? { ...subscription, status: 'canceled' } : null);
        setSubscription(updatedSubscription);
        if (updatedSubscription) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSubscription));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
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

  const handleCheckout = async () => {
    try {
      setIsModalOpen(false);
      setIsLoadingCheckout(true);
      const response = await subscriptionApi.createCheckoutSession();
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

  const isPeriodActive = Boolean(
    subscription?.current_period_end &&
    new Date(subscription.current_period_end) > new Date()
  );

  const isPremiumActive = subscription?.status === 'active' && !subscription?.cancel_at_period_end;

  const isSubscriptionEnding = Boolean(
    (subscription?.status === 'canceled' || subscription?.cancel_at_period_end) &&
    isPeriodActive
  );

  return {
    subscription,
    isPremiumActive,
    isSubscriptionEnding,
    isPeriodActive,
    isLoadingCheckout,
    isCanceling,
    isModalOpen,
    setIsModalOpen,
    isSuccessModalOpen,
    setIsSuccessModalOpen,
    isCancelModalOpen,
    setIsCancelModalOpen,
    handleCheckout,
    handleCancelSubscription,
    handleCloseSuccessModal,
    handleExplore
  };
}

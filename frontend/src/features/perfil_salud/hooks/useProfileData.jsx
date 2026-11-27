import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useApi } from '../../../shared/hooks/useApi';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const { fetchConAuth } = useApi();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const response = await fetchConAuth('/perfil-salud/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error("Error loading profile", error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfile = async (updatedFields) => {
    try {
      const response = await fetchConAuth('/perfil-salud/profile', {
        method: 'PUT',
        body: JSON.stringify(updatedFields)
      });
      if (response.ok) {
        setProfile(prev => ({ ...prev, ...updatedFields }));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Network error", error);
      return false;
    }
  };

  return (
    <ProfileContext.Provider value={{ profile, loading, saveProfile, reloadProfile: loadProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfileData() {
  return useContext(ProfileContext);
}

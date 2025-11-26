import { useState } from 'react';
import { authService } from '../../service';

/**
 * Custom hook for RegisterForm component
 * Handles all business logic and state management
 */
export const useRegisterForm = (onSuccess) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const result = await authService.register(fullName, username, password);
      
      if (result.success) {
        setSuccess('Registration successful! Redirecting to login...');
        
        // Call onSuccess callback after a short delay
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
        }, 1500);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('Network error, try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fullName,
    setFullName,
    username,
    setUsername,
    password,
    setPassword,
    error,
    success,
    isLoading,
    handleSubmit
  };
};

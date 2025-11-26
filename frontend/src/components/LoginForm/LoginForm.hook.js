import { useState } from 'react';
import { authService } from '../../service';

/**
 * Custom hook for LoginForm component
 * Handles all business logic and state management
 */
export const useLoginForm = (onSuccess) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await authService.login(username, password);
      
      if (result.success) {
        // Call onSuccess callback with user data
        if (onSuccess) {
          onSuccess({ username });
        }
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error, try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    username,
    setUsername,
    password,
    setPassword,
    error,
    isLoading,
    handleSubmit
  };
};

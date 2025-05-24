import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Container,
  Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';

import StorefrontIcon from '@mui/icons-material/Storefront';

const Login = () => {
  const [formData, setFormData] = useState({
    mobile_number: '',
    pin: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Configure axios defaults
  axios.defaults.baseURL = 'http://localhost:5000';
  axios.defaults.headers.post['Content-Type'] = 'application/json';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Configure axios
  React.useEffect(() => {
    axios.defaults.baseURL = 'http://localhost:5000';
    axios.defaults.headers.post['Content-Type'] = 'application/json';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate mobile number format
      if (!/^\d{10}$/.test(formData.mobile_number)) {
        setError('Invalid mobile number format. Must be 10 digits.');
        setLoading(false);
        return;
      }

      // Validate PIN format
      if (!/^\d{4}$/.test(formData.pin)) {
        setError('Invalid PIN format. Must be 4 digits.');
        setLoading(false);
        return;
      }

      const response = await axios.post('/api/store/login', {
        mobile_number: formData.mobile_number,
        pin: formData.pin
      });
      
      if (response.data && response.data.token) {
        // Save token and store info
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('storeInfo', JSON.stringify(response.data.store));
        
        // Set axios default header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.response?.status === 401) {
        setError('Invalid mobile number or PIN');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to connect to server. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Card
          sx={{
            width: '100%',
            maxWidth: isMobile ? '100%' : 400,
            borderRadius: 2,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          <CardContent
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              p: isMobile ? 2 : 3,
            }}
          >
            <StorefrontIcon
              sx={{
                fontSize: 48,
                color: 'primary.main',
                mb: 2,
              }}
            />
            <Typography component="h1" variant="h5" gutterBottom>
              Store Admin Login
            </Typography>
            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {error}
              </Alert>
            )}
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Mobile Number"
                name="mobile_number"
                type="tel"
                autoComplete="tel"
                value={formData.mobile_number}
                onChange={handleChange}
                error={!!error}
                inputProps={{ pattern: '[0-9]{10}' }}
                placeholder="10-digit mobile number"
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="pin"
                label="PIN"
                type="password"
                autoComplete="current-password"
                value={formData.pin}
                onChange={handleChange}
                error={!!error}
                inputProps={{ maxLength: 4 }}
                placeholder="4-digit PIN"
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 2 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Login;

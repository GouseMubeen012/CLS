import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import StopIcon from '@mui/icons-material/Stop';
import { Html5Qrcode } from 'html5-qrcode';

import axios from 'axios';
import io from 'socket.io-client';

const Dashboard = () => {
  const navigate = useNavigate();
  const [storeInfo, setStoreInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [stopDisabled, setStopDisabled] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [dailyStats, setDailyStats] = useState({
    totalSales: 0,
    totalTransactions: 0,
    pendingSettlement: 0
  });
  const [grNumberInput, setGrNumberInput] = useState('');
  const grInputRef = useRef(null);

  // Load store info and fetch data
  useEffect(() => {
    const storedInfo = localStorage.getItem('storeInfo');
    const token = localStorage.getItem('token');

    if (!storedInfo || !token) {
      navigate('/login');
      return;
    }

    try {
      const parsedInfo = JSON.parse(storedInfo);
      setStoreInfo(parsedInfo);
      
      // Set axios default headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.defaults.baseURL = 'http://localhost:5000';

      // Fetch daily stats
      const fetchStats = async () => {
        try {
          console.log('Fetching stats for store:', parsedInfo.id);
          const response = await axios.get(`/api/stores/${parsedInfo.id}/daily-stats`);
          console.log('Stats response:', response.data);
          setDailyStats(response.data);
          setLoading(false);
        } catch (error) {
          console.error('Error fetching daily stats:', error);
          if (error.response?.status === 401 || error.response?.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('storeInfo');
            delete axios.defaults.headers.common['Authorization'];
            navigate('/login');
          }
        }
      };

      fetchStats();

      // Clean up function to ensure camera is stopped when component unmounts
      return () => {
        if (scannerRef.current) {
          scannerRef.current.stop().catch(console.error);
          setScanning(false);
        }
      };
    } catch (error) {
      console.error('Error parsing store info:', error);
      navigate('/login');
    }
  }, [navigate]);

  const handleTransaction = async () => {
    setProcessing(true);
    setError('');
    
    try {
      if (!studentData || !amount || parseFloat(amount) <= 0) {
        throw new Error('Please enter a valid amount');
      }

      const response = await axios.post('/api/transaction', {
        studentId: studentData.student_id,
        amount: parseFloat(amount),
        storeId: storeInfo.id
      });

      console.log('Transaction successful:', response.data);
      
      // Update student data with new balance and daily spent
      setStudentData({
        ...studentData,
        balance: response.data.currentBalance,
        daily_spent: response.data.dailySpent
      });

      // Reset transaction states
      setAmount('');
      setDialogOpen(false);
      setSuccess('Transaction completed successfully');
      
      // Update stats
      const storedInfo = localStorage.getItem('storeInfo');
      if (storedInfo) {
        const parsedInfo = JSON.parse(storedInfo);
        axios.get(`/api/stores/${parsedInfo.id}/daily-stats`)
          .then(response => setDailyStats(response.data))
          .catch(console.error);
      }
      
      // Note: We don't stop or restart the camera here
      // This ensures continuous scanning for multiple students
    } catch (error) {
      console.error('Transaction error:', error);
      setError(error.response?.data?.error || 'An error occurred while processing the transaction');
    } finally {
      setProcessing(false);
    }
  };

  // Socket.io connection effect
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      navigate('/login');
      return;
    }

    const socket = io('http://localhost:5000', {
      withCredentials: true,
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setError('');
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      if (error.message.includes('Authentication error')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket:', reason);
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('transactionUpdate', (data) => {
      console.log('Received transaction update:', data);
      // Re-fetch stats
      const storedInfo = localStorage.getItem('storeInfo');
      if (storedInfo) {
        const parsedInfo = JSON.parse(storedInfo);
        axios.get(`/api/stores/${parsedInfo.id}/daily-stats`)
          .then(response => setDailyStats(response.data))
          .catch(console.error);
      }
    });

    socket.on('settlementUpdate', (data) => {
      console.log('Received settlement update:', data);
      // Re-fetch stats
      const storedInfo = localStorage.getItem('storeInfo');
      if (storedInfo) {
        const parsedInfo = JSON.parse(storedInfo);
        axios.get(`/api/stores/${parsedInfo.id}/daily-stats`)
          .then(response => setDailyStats(response.data))
          .catch(console.error);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [navigate]);

  const handleGrNumberInput = async (value) => {
    try {
      setProcessing(true);
      setError('');
      
      // Clean up the input value - remove quotes, newlines, carriage returns
      const cleanValue = value.replace(/^"|\n|\r$/g, '').trim();
      if (!cleanValue) return;

      // Check if the input is a number (QR code format)
      if (/^\d+$/.test(cleanValue)) {
        // The QR code contains concatenated numbers: gr_number followed by card_number
        // The card_number is always 5 digits, so take last 5 digits as card_number
        const cardNumber = cleanValue.slice(-5);
        const grNumber = cleanValue.slice(0, -5);

        if (!cardNumber || !grNumber) {
          throw new Error('Invalid card format');
        }

        // Check if this card is active
        const activeCardResponse = await axios.get(`/api/students/${grNumber}/active-card`);
        
        if (!activeCardResponse.data || activeCardResponse.data.card_number !== parseInt(cardNumber)) {
          setError('This card has been deactivated. Please use the active card.');
          return;
        }

        // If active, get student details
        const response = await axios.get(`/api/students/${activeCardResponse.data.student_id}/scan`);
        setStudentData(response.data);
        setDialogOpen(true);
        setSuccess('Student found!');
      } else {
        // Not a QR code, treat as manual GR number input
        const response = await axios.get(`/api/students/gr/${cleanValue}`);
        setStudentData(response.data);
        setDialogOpen(true);
        setSuccess('Student found!');
      }

      setGrNumberInput('');
    } catch (error) {
      console.error('Error fetching student data:', error);
      const errorMessage = error.response?.status === 404 
        ? 'No active card found for this GR number'
        : 'Error fetching student data';
      setError(errorMessage);
      setGrNumberInput('');
    } finally {
      setProcessing(false);
    }
  };

  const handleGrInputChange = (e) => {
    const value = e.target.value;
    
    // Only allow numbers
    if (value && !/^\d*$/.test(value)) {
      return; // Ignore non-numeric input
    }
    
    setGrNumberInput(value);
    
    // For physical scanners and manual input:
    // 1. Process immediately if we detect a newline/return (physical scanner usually adds this)
    // 2. Process if we have the correct format: at least 6 digits (1-digit gr_number + 5-digit card_number)
    // 3. Don't process if user is still typing (no newline/return)
    if (value.endsWith('\n') || value.endsWith('\r')) {
      handleGrNumberInput(value);
    } else if (/^\d{6,}$/.test(value)) {
      // If it's all digits and at least 6 digits, process after a short delay
      // This allows physical scanners to complete their input
      setTimeout(() => {
        if (grNumberInput === value) { // Only process if value hasn't changed
          handleGrNumberInput(value);
        }
      }, 100);
    }
  };

  const handleKeyPress = (e) => {
    // Handle Enter key for manual input
    if (e.key === 'Enter' && grNumberInput) {
      e.preventDefault(); // Prevent default to avoid unwanted form submissions
      handleGrNumberInput(grNumberInput);
    }
  };

  const onQrCodeScanned = async (decodedText) => {
    try {
      // The QR code now contains concatenated numbers: gr_number followed by card_number
      // Example: If gr_number is 1234 and card_number is 54321, QR will be 123454321
      if (!/^\d+$/.test(decodedText)) {
        throw new Error('QR code must contain only numbers');
      }

      // The gr_number is variable length, but card_number is always 5 digits
      // So we take the last 5 digits as card_number and the rest as gr_number
      const cardNumber = decodedText.slice(-5);
      const grNumber = decodedText.slice(0, -5);

      if (!cardNumber || !grNumber) {
        throw new Error('Invalid QR code format');
      }

      // First check if this card is active
      try {
        const activeCardResponse = await axios.get(`/api/students/${grNumber}/active-card`);
        
        if (!activeCardResponse.data || activeCardResponse.data.card_number !== parseInt(cardNumber)) {
          setError('This card has been deactivated. Please contact the bank for assistance.');
          return;
        }

        // If active, get student details
        const response = await axios.get(`/api/students/${activeCardResponse.data.student_id}/scan`);
        setStudentData(response.data);
        setDialogOpen(true);
      } catch (error) {
        console.error('Error processing QR code:', error);
        if (error.response?.status === 404) {
          setError('This account is deactivated. Please contact the bank for assistance.');
          return;
        }
        setError('Error processing card. Please try again or contact support.');
      }
    } catch (error) {
      console.error('Error validating QR code:', error);
      setError(error.message || 'Invalid QR code format. Please try again.');
    }
  };

  const [startDisabled, setStartDisabled] = useState(false);

  const startScanning = async () => {
    if (scanning || startDisabled) return;
    
    setError('');
    setStartDisabled(true); // Disable start button
    setTimeout(() => setStartDisabled(false), 3000); // Enable after 3 seconds
    
    setStatusMessage('Requesting camera permission...');
    
    try {
      // First check camera permissions
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by this device/browser');
      }

      // Request camera permission
      await navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          // Got permission, now stop the stream as HTML5QRCode will request it again
          stream.getTracks().forEach(track => track.stop());
        });
      
      setScanning(true);
      setIsStartingCamera(true);
      setStatusMessage('Starting camera...');
      
      setStopDisabled(true);
      setTimeout(() => setStopDisabled(false), 5000);

      // Dispatch camera start event to disable navigation
      window.dispatchEvent(new Event('cameraStart'));

      const html5QrCode = new Html5Qrcode('reader');
      scannerRef.current = html5QrCode;

      html5QrCode
        .start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          onQrCodeScanned,
          (error) => {
            if (error.includes('No barcode or QR code detected') || error.includes('NotFoundException')) {
              return;
            }
            console.error('QR Code scanning error:', error);
          }
        )
        .then(() => {
          setIsStartingCamera(false);
          setStatusMessage('Camera is running');
          setSuccess('Ready to scan QR code');
        })
        .catch(err => {
          console.error('Error starting scanner:', err);
          setError('Could not start camera. Please check permissions.');
          setScanning(false);
          setIsStartingCamera(false);
        });
    } catch (err) {
      console.error('Error initializing scanner:', err);
      setError('Could not initialize scanner');
      setScanning(false);
      setIsStartingCamera(false);
    }
  };

  const stopScanning = async () => {
    if (!scanning) return;

    setScanning(false);
    setIsStartingCamera(false);
    setStatusMessage('');

    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        const videoElement = document.querySelector('#reader video');
        if (videoElement) {
          videoElement.srcObject?.getTracks().forEach(track => track.stop());
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (error) {
      console.error('Error stopping scanner:', error);
    }
  };

  // References to hold the scanner instance and component state
  const scannerRef = useRef(null);
  const isMounted = useRef(true);
  
  // Track component mount status and handle cleanup
  useEffect(() => {
    isMounted.current = true;
    
    // Clean up function
    return () => {
      isMounted.current = false;
      
      // Immediately update state
      setScanning(false);
      setIsStartingCamera(false);
      
      // Force stop camera and cleanup
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
          const videoElement = document.querySelector('#reader video');
          if (videoElement) {
            videoElement.srcObject?.getTracks().forEach(track => track.stop());
          }
          scannerRef.current.clear();
          scannerRef.current = null;
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Hidden element for camera preloading */}
      <div id="reader-hidden" style={{ position: 'absolute', width: '0px', height: '0px', overflow: 'hidden' }}></div>
      <Grid container spacing={3}>
        {/* Store Info Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                {storeInfo?.name || 'Loading...'}
              </Typography>
              <Typography color="textSecondary">
                Type: {storeInfo?.type}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* QR Scanner Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Scan Student ID Card
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    placeholder="Scan using physical QR code scanner"
                    value={grNumberInput}
                    onChange={handleGrInputChange}
                    onKeyPress={handleKeyPress}
                    onPaste={(e) => {
                      // Handle pasted content immediately
                      e.preventDefault();
                      const pastedText = e.clipboardData.getData('text');
                      handleGrNumberInput(pastedText);
                    }}
                    inputRef={grInputRef}
                    disabled={scanning || processing}
                    autoComplete="off"
                    InputProps={{
                      sx: { fontSize: '1.1rem' },
                      endAdornment: processing && (
                        <InputAdornment position="end">
                          <CircularProgress size={20} />
                        </InputAdornment>
                      )
                    }}
                    sx={{ 
                      mb: 2,
                      '& .MuiInputBase-input': {
                        letterSpacing: '0.1rem' // Better readability for numbers
                      }
                    }}
                  />
                </Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Scan using:
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  1. Physical Scanner: Point the scanner at student's ID card
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  2. Device Camera: Click 'Start Camera' button to use webcam
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={startScanning}
                    disabled={scanning}
                    startIcon={<QrCodeScannerIcon />}
                  >
                    Start Camera
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={stopScanning}
                    disabled={!scanning || stopDisabled}
                    startIcon={<StopIcon />}
                  >
                    Stop Camera
                  </Button>
                </Box>
                <Box sx={{ width: '100%', maxWidth: 500, mx: 'auto', my: 2, display: scanning ? 'block' : 'none', position: 'relative' }}>
                  <div id="reader"></div>
                  {isStartingCamera && (
                    <Box sx={{ 
                      position: 'absolute', 
                      top: '50%', 
                      left: '50%', 
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                      zIndex: 10,
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      padding: 3,
                      borderRadius: 2
                    }}>
                      <CircularProgress size={60} />
                      <Typography variant="body1" sx={{ mt: 2 }}>
                        Starting camera...
                      </Typography>
                    </Box>
                  )}
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
                    {error}
                  </Alert>
                )}

                {statusMessage && (
                  <Alert severity="info" sx={{ mt: 2, fontSize: '1.1rem', fontWeight: 'bold' }}>
                    {statusMessage}
                  </Alert>
                )}
                
                {success && !statusMessage && (
                  <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSuccess('')}>
                    {success}
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Stats Cards */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Today's Sales
              </Typography>
              {loading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography variant="h4">
                  ₹{(dailyStats.totalSales || 0).toFixed(2)}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                Today's Transactions
              </Typography>
              {loading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography variant="h4">
                  {dailyStats.totalTransactions || 0}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                Pending Settlement
              </Typography>
              {loading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography variant="h4">
                  ₹{(dailyStats.pendingSettlement || 0).toFixed(2)}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>



      </Grid>

      {/* Transaction Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => !processing && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Process Transaction</DialogTitle>
        <DialogContent>
          {studentData && (
            <Box sx={{ pt: 2 }}>
              <Box sx={{ display: 'flex', gap: 3, mb: 3, alignItems: 'flex-start' }}>
                {/* Student Photo */}
                <Box sx={{ width: 150, height: 150, overflow: 'hidden', borderRadius: 1, border: '1px solid #ccc' }}>
                  {studentData.photo_url ? (
                    <img 
                      src={studentData.photo_url.startsWith('http') ? studentData.photo_url : `http://localhost:5000${studentData.photo_url}`}
                      alt={studentData.student_name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Box 
                      sx={{ 
                        width: '100%', 
                        height: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        bgcolor: '#f5f5f5',
                        color: '#666'
                      }}
                    >
                      No Photo
                    </Box>
                  )}
                </Box>

                {/* Student Details */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Student Name:</strong> {studentData.student_name}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>GR Number:</strong> {studentData.gr_number}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Class:</strong> {studentData.class}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Balance:</strong> ₹{parseFloat(studentData.balance || 0).toFixed(2)}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Daily Limit Remaining:</strong> ₹{((studentData.daily_limit || 0) - (studentData.daily_spent || 0)).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
              <TextField
                autoFocus
                margin="dense"
                label="Amount"
                type="number"
                fullWidth
                variant="outlined"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={processing}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={processing}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleTransaction}
            loading={processing}
            disabled={!amount || parseFloat(amount) <= 0}
            variant="contained"
          >
            Process Transaction
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;

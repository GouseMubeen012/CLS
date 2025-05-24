import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,

  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Chip,
} from '@mui/material';
import { format } from 'date-fns';

import axios from 'axios';
import io from 'socket.io-client';

import { useNavigate } from 'react-router-dom';

// Set base URL for axios
axios.defaults.baseURL = 'http://localhost:5000';

const Settlements = () => {
  // Initialize hooks first
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State management
  const [settlements, setSettlements] = useState([]);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [requestedAmount, setRequestedAmount] = useState(0);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [storeInfo, setStoreInfo] = useState(null);


  // Refs
  const socketRef = useRef(null);

  // Initialize store info
  useEffect(() => {
    const info = localStorage.getItem('storeInfo');
    const token = localStorage.getItem('token');
    if (info && token) {
      setStoreInfo(JSON.parse(info));
      // Set default auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Setup axios interceptors
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      config => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    const responseInterceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('storeInfo');
          navigate('/login');
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptors
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [navigate]);

  const fetchSettlements = useCallback(async () => {
    if (!storeInfo?.id) return;
    
    try {
      const response = await axios.get(`/api/settlements/store/${storeInfo.id}`);
      if (Array.isArray(response.data)) {
        setSettlements(response.data);
        // Update amounts from settlements
        const requested = response.data.filter(s => s.status === 'requested').reduce((acc, s) => acc + Number(s.total_transaction_amount || 0), 0);
        setRequestedAmount(requested);
      } else {
        console.error('Invalid settlements data format');
        setSettlements([]);
      }
    } catch (error) {
      console.error('Error fetching settlements:', error);
      setSettlements([]);
      throw error;
    }
  }, [storeInfo]); // Removed navigate as it's not used

  const fetchPendingAmount = useCallback(async () => {
    if (!storeInfo?.id) return;

    try {
      const response = await axios.get(`/api/store/pending-settlement/${storeInfo.id}`);
      setPendingAmount(response.data.amount || 0);
      return response.data;
    } catch (error) {
      console.error('Error fetching pending amount:', error);
      throw error;
    }
  }, [storeInfo]); // Removed navigate as it's not used

  // Handle settlement request
  // Handle settlement amount edit
  const handleEditSettlement = async () => {
    try {
      setProcessing(true);
      setError('');

      const currentAmount = parseFloat(editAmount);
      if (!editAmount || currentAmount <= 0) {
        setError('Please enter a valid amount');
        return;
      }

      // Original requested amount for this settlement
      const originalAmount = parseFloat(editingSettlement?.total_transaction_amount) || 0;
      const currentPending = parseFloat(pendingAmount) || 0;

      // Maximum allowed is the original request + remaining pending
      const maxAllowedAmount = originalAmount + currentPending;
      
      if (currentAmount > maxAllowedAmount) {
        setError(`Cannot request more than original amount + remaining pending (₹${maxAllowedAmount.toFixed(2)})`);
        return;
      }

      const response = await axios.put(`/api/settlements/${editingSettlement.settlement_id}/amount`, {
        amount: parseFloat(editAmount)
      });

      // Update settlements list with edited settlement
      setSettlements(prevSettlements =>
        prevSettlements.map(s =>
          s.settlement_id === editingSettlement.settlement_id ? response.data.settlement : s
        )
      );

      // Update amounts immediately
      const newRequestedAmount = settlements
        .filter(s => s.status === 'requested' && s.settlement_id !== editingSettlement.settlement_id)
        .reduce((acc, s) => acc + Number(s.total_transaction_amount || 0), 0) + parseFloat(editAmount);
      setRequestedAmount(newRequestedAmount);

      // Reset form
      setEditAmount('');
      setEditingSettlement(null);
      setEditDialogOpen(false);
      setSuccess('Settlement amount updated successfully');

      // Update pending amount
      await fetchPendingAmount();
    } catch (error) {
      console.error('Error updating settlement amount:', error);
      setError(error.response?.data?.error || 'Failed to update settlement amount');
    } finally {
      setProcessing(false);
    }
  };

  const handleSettlementRequest = async () => {
    try {
      setProcessing(true);
      setError('');

      if (!settlementAmount || parseFloat(settlementAmount) <= 0) {
        setError('Please enter a valid amount');
        return;
      }

      if (parseFloat(settlementAmount) > pendingAmount) {
        setError(`Cannot request more than available pending amount (₹${pendingAmount})`);
        return;
      }

      const response = await axios.post('/api/settlements/request', {
        store_id: storeInfo.id,
        amount: parseFloat(settlementAmount)
      });

      // Add new settlement to the list and update requested amount immediately
      setSettlements(prevSettlements => [response.data.settlement, ...prevSettlements]);
      setRequestedAmount(prev => prev + parseFloat(settlementAmount));

      // Update pending amount
      await fetchPendingAmount();

      // Reset form
      setSettlementAmount('');
      setDialogOpen(false);
      setSuccess('Settlement request submitted successfully');
    } catch (error) {
      console.error('Error requesting settlement:', error);
      setError(error.response?.data?.error || 'Failed to submit settlement request');
    } finally {
      setProcessing(false);
    }
  };

  const connectSocket = useCallback((fetchData = true) => {
    try {
      if (!storeInfo) {
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) return;

      // Clear any existing socket
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }

      const socket = io('http://localhost:5000', {
        query: { storeId: storeInfo.id },
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      });

      socket.on('connect', () => {
        console.log('Connected to socket server');
        if (fetchData) {
          fetchSettlements().catch(console.error);
          fetchPendingAmount().catch(console.error);
        }
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      socket.on('settlement_update', (data) => {
        console.log('Settlement update received:', data);
        fetchSettlements();
        fetchPendingAmount();
      });

      socket.on('settlement_created', (data) => {
        console.log('New settlement created:', data);
        fetchSettlements();
        fetchPendingAmount();
      });

      socket.on('settlement_completed', (data) => {
        console.log('Settlement completed:', data);
        fetchSettlements();
        fetchPendingAmount();
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      socketRef.current = socket;

      return () => {
        if (socket) {
          socket.disconnect();
          socketRef.current = null;
        }
      };
    } catch (error) {
      console.error('Socket connection error:', error);
    }
  }, [storeInfo, fetchPendingAmount, fetchSettlements]);

  // Initial data fetch and socket setup
  useEffect(() => {
    if (!storeInfo) return;

    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        setError('');
        await Promise.all([
          fetchPendingAmount(),
          fetchSettlements()
        ]);
        connectSocket();
      } catch (error) {
        console.error('Error loading initial data:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('storeInfo');
          navigate('/login');
        } else {
          setError('Failed to load data. Please refresh the page.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [storeInfo, navigate, fetchPendingAmount, fetchSettlements, connectSocket]);

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={3}>
        {error && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          </Grid>
        )}
        {success && (
          <Grid item xs={12}>
            <Alert severity="success" onClose={() => setSuccess('')}>
              {success}
            </Alert>
          </Grid>
        )}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4">Settlements</Typography>
          </Box>
        </Grid>

        {/* Pending Settlement Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="h6">Settlements</Typography>
                </Grid>
                <Grid item xs={12} sm={6} sx={{ textAlign: { sm: 'right' } }}>
                  <Button
                    variant="contained"
                    onClick={() => setDialogOpen(true)}
                    disabled={pendingAmount <= 0}
                  >
                    Request Settlement
                  </Button>
                </Grid>
              </Grid>
              


              <Typography variant="h4" color="primary" gutterBottom>
                ₹{(pendingAmount || 0).toFixed(2)}
              </Typography>
              {requestedAmount > 0 && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  (₹{requestedAmount.toFixed(2)} pending approval)
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Settlement History */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Settlement History
              </Typography>
              <TableContainer component={Paper} sx={{ mt: 4 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date & Time</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Reference ID</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={isMobile ? 3 : 4} align="center">
                          <CircularProgress size={24} />
                        </TableCell>
                      </TableRow>
                    ) : settlements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isMobile ? 3 : 4} align="center">
                          No settlements found
                        </TableCell>
                      </TableRow>
                    ) : (
                      settlements.map((settlement, index) => (
                        <TableRow 
                          key={`${settlement.settlement_id}_${index}_${Date.now()}`}
                        >
                          <TableCell>
                            {format(new Date(settlement.created_at), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography>₹{settlement.total_transaction_amount}</Typography>
                              {settlement.status === 'completed' && (
                                <Typography variant="caption" color="textSecondary">
                                  Settled: ₹{settlement.settled_amount}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>{settlement.reference_id || '-'}</TableCell>
                          <TableCell>
                            <Chip
                              label={settlement.status}
                              color={settlement.status === 'completed' ? 'success' : 'warning'}
                            />
                          </TableCell>
                          <TableCell>
                            {settlement.status.toLowerCase() === 'requested' && (
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => {
                                  setEditingSettlement(settlement);
                                  setEditAmount(settlement.total_transaction_amount);
                                  setEditDialogOpen(true);
                                }}
                              >
                                Edit Amount
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Settlement Request Dialog */}
      <Dialog open={dialogOpen} onClose={() => !processing && setDialogOpen(false)}>
        <DialogTitle>Request Settlement</DialogTitle>
        <DialogContent>
          <Box sx={{ minWidth: 300, mt: 2 }}>
            <TextField
              fullWidth
              label="Settlement Amount"
              type="number"
              value={settlementAmount}
              onChange={(e) => setSettlementAmount(e.target.value)}
              disabled={processing}
              InputProps={{
                inputProps: {
                  min: 0,
                  max: pendingAmount,
                },
              }}
            />
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>

            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={handleSettlementRequest}
            variant="contained"
            disabled={
              processing ||
              !settlementAmount ||
              parseFloat(settlementAmount) <= 0 ||
              parseFloat(settlementAmount) > pendingAmount
            }
            startIcon={processing && <CircularProgress size={20} />}
          >
            {processing ? 'Processing...' : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Settlement Dialog */}
      <Dialog open={editDialogOpen} onClose={() => !processing && setEditDialogOpen(false)}>
        <DialogTitle>Edit Settlement Amount</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              label="New Amount"
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              fullWidth
              required
              disabled={processing}
              InputProps={{
                inputProps: {
                  min: 0,
                  max: pendingAmount,
                  step: 0.01
                },
              }}
            />
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>

            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={processing}>Cancel</Button>
          <Button
            onClick={handleEditSettlement}
            variant="contained"
            disabled={
              processing ||
              !editAmount ||
              parseFloat(editAmount) <= 0 ||
              parseFloat(editAmount) > (parseFloat(editingSettlement?.total_transaction_amount) + parseFloat(pendingAmount) || 0)
            }
            startIcon={processing && <CircularProgress size={20} />}
          >
            {processing ? 'Processing...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {success && (
        <Alert
          severity="success"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 2000,
          }}
        >
          {success}
        </Alert>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 2000,
          }}
        >
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default Settlements;


import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Container,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  InputAdornment,
  Tabs,
  Tab
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import axios from 'axios';
import Header from './Header';

const RechargeManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [dailyLimit, setDailyLimit] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    studentId: null,
    currentStatus: null
  });

  const searchTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const lastDataRef = useRef(null);
  const pollingRef = useRef(null);

  // Separate functions for fetching all students and searching
  const fetchAllStudents = useCallback(async () => {
    try {
      if (loading || isSearchActive) return; // Don't fetch all if we're searching
      
      setLoading(true);
      
      const response = await axios.get('http://localhost:5000/api/students', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      // If component is unmounted, don't update state
      if (!isMountedRef.current) return;

      // Get latest balance for each student
      const studentsWithBalance = await Promise.all(response.data.map(async (student) => {
        try {
          const balanceResponse = await axios.get(`http://localhost:5000/api/students/${student.student_id}/balance`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          });
          return { ...student, balance: balanceResponse.data.balance };
        } catch (error) {
          // If balance fetch fails, return student with 0 balance
          return { ...student, balance: 0 };
        }
      }));

      // Only update if data has changed
      const newDataString = JSON.stringify(studentsWithBalance);
      if (newDataString !== lastDataRef.current) {
        lastDataRef.current = newDataString;
        setAllStudents(studentsWithBalance);
        
        // Only update displayed students if not in search mode
        if (!isSearchActive) {
          setStudents(studentsWithBalance);
        }
      }
    } catch (error) {
      if (isMountedRef.current) {
        setError('Failed to fetch students');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [loading, isSearchActive]);

  const searchStudents = useCallback(async (query) => {
    if (!query) {
      setIsSearchActive(false);
      setStudents(allStudents);
      return;
    }
    
    try {
      setIsSearchActive(true);
      setLoading(true);
      
      // Only allow numeric GR number search
      if (isNaN(query)) {
        setError('Please enter a valid GR number');
        setStudents([]);
        setLoading(false);
        return;
      }

      // Convert query to integer to ensure exact match
      const grNumber = parseInt(query, 10);
      const response = await axios.get(`http://localhost:5000/api/students?gr_number=${grNumber}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      // If component is unmounted, don't update state
      if (!isMountedRef.current) return;

      // Get latest balance for each student
      const studentsWithBalance = await Promise.all(response.data.map(async (student) => {
        try {
          const balanceResponse = await axios.get(`http://localhost:5000/api/students/${student.student_id}/balance`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          });
          return { ...student, balance: balanceResponse.data.balance };
        } catch (error) {
          // If balance fetch fails, return student with 0 balance
          return { ...student, balance: 0 };
        }
      }));

      // Always update search results
      setStudents(studentsWithBalance);
    } catch (error) {
      if (isMountedRef.current) {
        setError('Failed to search students');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [allStudents]);

  // Set isMounted flag on component mount/unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clear any pending timeouts on unmount
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Fetch initial data and setup polling
  useEffect(() => {
    let errorCount = 0;
    const maxErrors = 3; // Stop polling after 3 consecutive errors
    
    const fetchData = async () => {
      try {
        await fetchAllStudents();
        errorCount = 0; // Reset error count on successful fetch
      } catch (error) {
        errorCount++;
        if (errorCount >= maxErrors) {
          console.error('Stopping polling due to consecutive errors');
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
        }
      }
    };

    // Initial fetch
    fetchData();
    
    // Setup polling with 10 second interval
    if (!isSearchActive) { // Don't poll during search mode
      pollingRef.current = setInterval(fetchData, 10000);
    }
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchAllStudents, isSearchActive]);

  // Debounced search handler
  const handleSearch = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    if (query.length >= 3 || query.length === 0) {
      searchTimeoutRef.current = setTimeout(() => {
        searchStudents(query);
      }, 500); // Wait 500ms after user stops typing
    }
  }, [searchStudents]);

  const handleRechargeClick = (student) => {
    setSelectedStudent(student);
    setRechargeAmount('');
    setError('');
  };

  const handleDailyLimitClick = (student) => {
    setSelectedStudent(student);
    setDailyLimit(student.daily_limit?.toString() || '');
    setError('');
  };

  const handleRecharge = async () => {
    if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:5000/api/recharge',
        {
          student_id: selectedStudent.student_id,
          amount: parseFloat(rechargeAmount),
          recharge_type: 'credit',
          notes: 'Account recharge'
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      // Update the student's balance in both state arrays
      const updateStudentBalance = (studentArray) => {
        return studentArray.map(student => {
          if (student.student_id === selectedStudent.student_id) {
            return {
              ...student,
              balance: response.data.new_balance
            };
          }
          return student;
        });
      };
      
      setStudents(updateStudentBalance(students));
      setAllStudents(updateStudentBalance(allStudents));
      
      setSuccess(`Successfully recharged ₹${rechargeAmount} for ${selectedStudent.student_name}. New balance: ₹${response.data.new_balance}`);
      setSelectedStudent(null);
      setRechargeAmount('');
    } catch (error) {
      setError(error.response?.data?.error || 'Recharge failed');
    }
  };

  const handleSetDailyLimit = async () => {
    if (!dailyLimit || parseFloat(dailyLimit) < 0) {
      setError('Please enter a valid daily limit amount');
      return;
    }

    try {
      await axios.post(
        `http://localhost:5000/api/students/${selectedStudent.student_id}/daily-limit`,
        {
          daily_limit: parseFloat(dailyLimit)
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      // Update the daily limit in both state arrays
      const updateStudentDailyLimit = (studentArray) => {
        return studentArray.map(student => {
          if (student.student_id === selectedStudent.student_id) {
            return {
              ...student,
              daily_limit: parseFloat(dailyLimit)
            };
          }
          return student;
        });
      };
      
      setStudents(updateStudentDailyLimit(students));
      setAllStudents(updateStudentDailyLimit(allStudents));

      setSuccess(`Successfully set daily limit to ₹${dailyLimit} for ${selectedStudent.student_name}`);
      setSelectedStudent(null);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to set daily limit');
    }
  };

  const handleToggleClick = (studentId, currentStatus) => {
    setConfirmDialog({
      open: true,
      studentId,
      currentStatus,
      studentName: students.find(s => s.student_id === studentId)?.student_name
    });
  };

  const handleConfirmToggle = async () => {
    try {
      const { studentId, currentStatus } = confirmDialog;
      const token = localStorage.getItem('token');
      
      await axios.patch(`/api/students/${studentId}/toggle-active`, 
        { is_active: !currentStatus },
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Close dialog and refresh list
      setConfirmDialog({ open: false, studentId: null, currentStatus: null });
      fetchAllStudents();
      
      // Show success message
      setSuccess(`Student status successfully ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling student status:', error);
      setError(error.response?.data?.error || 'Error updating student status');
    }
  };

  return (
    <>
      <Header title="Recharge Management" />
      <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 4, textAlign: 'center' }}>
        Recharge Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Recharge" />
            <Tab label="Daily Limit" />
          </Tabs>
        </Box>

        <TextField
          fullWidth
          label="Search Students"
          variant="outlined"
          value={searchQuery}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          helperText="Search by GR Number"
        />
      </Paper>

      <TableContainer component={Paper} sx={{ minHeight: '300px' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Student ID</TableCell>
              <TableCell>GR Number</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Class</TableCell>
              <TableCell>Current Balance</TableCell>
              {activeTab === 1 && <TableCell>Daily Limit</TableCell>}
              <TableCell>Action</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={activeTab === 1 ? 8 : 7} align="center">
                  {loading ? 'Loading...' : 'No students found'}
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => (
                <TableRow 
                  key={student.student_id}
                  sx={{ 
                    backgroundColor: !student.is_active ? 'rgba(244, 67, 54, 0.1)' : 'inherit',
                    '&:hover': {
                      backgroundColor: !student.is_active ? 'rgba(244, 67, 54, 0.15)' : 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                >
                  <TableCell>{student.student_id}</TableCell>
                  <TableCell sx={{ color: !student.is_active ? 'text.disabled' : 'inherit' }}>
                    {student.gr_number}
                  </TableCell>
                  <TableCell sx={{ color: !student.is_active ? 'text.disabled' : 'inherit' }}>
                    {student.student_name}
                  </TableCell>
                  <TableCell sx={{ color: !student.is_active ? 'text.disabled' : 'inherit' }}>
                    {student.class}
                  </TableCell>
                  <TableCell sx={{ color: !student.is_active ? 'text.disabled' : 'inherit' }}>
                    ₹{student.balance || 0}
                  </TableCell>
                  {activeTab === 1 && (
                    <TableCell sx={{ color: !student.is_active ? 'text.disabled' : 'inherit' }}>
                      ₹{student.daily_limit || 0}
                    </TableCell>
                  )}
                  <TableCell>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => activeTab === 0 ? handleRechargeClick(student) : handleDailyLimitClick(student)}
                      disabled={!student.is_active}
                      size="small"
                      sx={{ 
                        minWidth: '90px',
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        opacity: !student.is_active ? 0.5 : 1,
                        mr: 1
                      }}
                    >
                      {activeTab === 0 ? 'Recharge' : 'Set Limit'}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      color={student.is_active ? "error" : "success"}
                      onClick={() => handleToggleClick(student.student_id, student.is_active)}
                      size="small"
                      sx={{ 
                        minWidth: '90px',
                        fontSize: '0.75rem',
                        padding: '4px 8px'
                      }}
                    >
                      {student.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Recharge Dialog */}
      <Dialog 
        open={!!selectedStudent && activeTab === 0} 
        onClose={() => setSelectedStudent(null)}
      >
        <DialogTitle>
          Recharge for {selectedStudent?.student_name}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Current Balance: ₹{selectedStudent?.balance || '0.00'}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Amount"
            type="number"
            fullWidth
            value={rechargeAmount}
            onChange={(e) => setRechargeAmount(e.target.value)}
            disabled={!selectedStudent?.is_active}
            InputProps={{
              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedStudent(null)}>Cancel</Button>
          <Button 
            onClick={handleRecharge} 
            color="primary" 
            variant="contained"
            disabled={!rechargeAmount || !selectedStudent?.is_active}
          >
            Recharge
          </Button>
        </DialogActions>
      </Dialog>

      {/* Daily Limit Dialog */}
      <Dialog 
        open={!!selectedStudent && activeTab === 1} 
        onClose={() => setSelectedStudent(null)}
      >
        <DialogTitle>
          Set Daily Limit for {selectedStudent?.student_name}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Current Daily Limit: ₹{selectedStudent?.daily_limit || '0.00'}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="New Daily Limit"
            type="number"
            fullWidth
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
            disabled={!selectedStudent?.is_active}
            InputProps={{
              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedStudent(null)}>Cancel</Button>
          <Button 
            onClick={handleSetDailyLimit} 
            color="primary" 
            variant="contained"
            disabled={!dailyLimit || !selectedStudent?.is_active}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, studentId: null, currentStatus: null })}
      >
        <DialogTitle>Confirm Status Change</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to {confirmDialog.currentStatus ? 'deactivate' : 'activate'} the card for student{' '}
            {confirmDialog.studentName}? 
            {confirmDialog.currentStatus 
              ? ' This will prevent them from making any transactions.'
              : ' This will allow them to make transactions again.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmDialog({ open: false, studentId: null, currentStatus: null })}
            color="primary"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmToggle} 
            color={confirmDialog.currentStatus ? "error" : "success"}
            variant="contained"
          >
            {confirmDialog.currentStatus ? 'Deactivate' : 'Activate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
    </>
  );
};

export default RechargeManagement;

import React, { useState } from 'react';
import {
  TextField,
  Button,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Container,
} from '@mui/material';
import GetAppIcon from '@mui/icons-material/GetApp';
import axios from 'axios';
import { format } from 'date-fns';
import Header from './Header';

// Set base URL for axios
axios.defaults.baseURL = 'http://localhost:5000';

const StudentSpendHistory = () => {
  const [grNumber, setGrNumber] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [studentInfo, setStudentInfo] = useState(null);

  const handleSearch = async () => {
    if (!grNumber || !startDate || !endDate) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Fetch student transactions
      // Add token to request header
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/students/${grNumber}/transactions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59), 'yyyy-MM-dd HH:mm:ss'),
        },
      });

      setTransactions(response.data.transactions);
      setStudentInfo(response.data.studentInfo);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError(error.response?.data?.message || 'Error fetching transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!transactions || transactions.length === 0) return;

    try {
      // Get PDF directly from the API
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `/api/students/${grNumber}/transactions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            format: 'pdf'
          },
          responseType: 'blob'
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_${grNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError('Failed to download PDF. Please try again.');
    }
  };

  return (
    <>
      <Header title="Student Spend History" />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Student Spend History
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="GR Number"
              value={grNumber}
              onChange={(e) => setGrNumber(e.target.value)}
              type="number"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => setStartDate(new Date(e.target.value))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              type="date"
              label="End Date"
              value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => setEndDate(new Date(e.target.value))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleSearch}
              disabled={loading}
              sx={{ mb: 2 }}
            >
              Search
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={handleDownloadPDF}
              disabled={!transactions || transactions.length === 0}
              startIcon={<GetAppIcon />}
            >
              Download PDF
            </Button>
          </Grid>
        </Grid>

        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </Paper>

      {studentInfo && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Student Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography>Name: {studentInfo.student_name}</Typography>
              <Typography>Class: {studentInfo.class}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography>GR Number: {studentInfo.gr_number}</Typography>
              <Typography>Current Balance: ₹{studentInfo.balance}</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {transactions.length > 0 && (
        <>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Store Name</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Transaction Type</TableCell>
                  <TableCell>Card Holder</TableCell>
                  <TableCell>Card Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.transaction_id}>
                    <TableCell>
                      {format(
                        new Date(transaction.transaction_date),
                        'dd/MM/yyyy HH:mm'
                      )}
                    </TableCell>
                    <TableCell>{transaction.store_name}</TableCell>
                    <TableCell>₹{transaction.amount}</TableCell>
                    <TableCell>{transaction.transaction_type}</TableCell>
                    <TableCell>{transaction.card_holder_name}</TableCell>
                    <TableCell>
                      <Typography color={transaction.card_status ? 'success.main' : 'error.main'}>
                        {transaction.card_status ? 'Active' : 'Deactivated'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Container>
    </>
  );
};

export default StudentSpendHistory;

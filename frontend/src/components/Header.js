import React from 'react';
import { Button, Typography, AppBar, Toolbar } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Header = ({ title }) => {
  const navigate = useNavigate();

  return (
    <AppBar position="static" sx={{ mb: 4 }}>
      <Toolbar>
        <Button
          color="inherit"
          startIcon={<HomeIcon />}
          onClick={() => navigate('/')}
          sx={{ mr: 2 }}
        >
          Home
        </Button>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default Header;

import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <AppBar position="static" color="default" elevation={1} sx={{ width: "100%" }}>
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        {/* Logo / Titre */}
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{
            textDecoration: "none",
            color: "inherit",
            fontWeight: "bold",
            flexGrow: 1, 
          }}
        >
          React App
        </Typography>

        {/* Liens de navigation */}
        <Box sx={{ display: "flex", gap: 2, flexGrow: 1, justifyContent: "flex-end" }}>
          <Button
            component={Link}
            to="/"
            color="inherit"
            sx={{ textTransform: "none", fontWeight: 500 }}
          >
            Accueil
          </Button>
          <Button
            component={Link}
            to="/upload"
            color="inherit"
            sx={{ textTransform: "none", fontWeight: 500 }}
          >
            Upload
          </Button>
          <Button
            component={Link}
            to="/about"
            color="inherit"
            sx={{ textTransform: "none", fontWeight: 500 }}
          >
            À propos
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;

import { Link } from "react-router-dom";
import { Container, Typography, Paper, Button } from "@mui/material";

const NotFound = () => {
  return (
    <Container maxWidth="sm">
      <Paper
        elevation={3}
        sx={{
          p: 6,
          textAlign: "center",
          borderRadius: 3,
          backgroundColor: "#fff",
        }}
      >
        <Typography
          variant="h1"
          fontWeight="bold"
          color="text.primary"
          gutterBottom
        >
          404
        </Typography>

        <Typography variant="h5" color="text.secondary" gutterBottom>
          Page non trouvée
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          Désolé, la page que vous recherchez n'existe pas.
        </Typography>

        <Button
          component={Link}
          to="/"
          variant="contained"
          color="primary"
          sx={{ mt: 2, px: 4, py: 1.2, borderRadius: 2 }}
        >
          Retour à l'accueil
        </Button>
      </Paper>
    </Container>
  );
};

export default NotFound;

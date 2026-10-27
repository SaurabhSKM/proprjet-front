import { Container, Typography, Paper, Box } from "@mui/material";

const Home = () => {
  return (
    <Container maxWidth="md">
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
          variant="h3"
          fontWeight="bold"
          color="primary"
          gutterBottom
        >
          Bienvenue dans votre template React ! 
        </Typography>

        <Typography variant="h6" color="text.primary">
          Ce template de base est conçu pour vous permettre de démarrer
          rapidement avec React, Vite et Material UI.
        </Typography>

        <Box mt={3}>
          <Typography variant="body1" color="text.secondary">
            Explorez la structure du projet et commencez à construire votre
            application !
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default Home;

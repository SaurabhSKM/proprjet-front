import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";

const About = () => {
  return (
    <Card sx={{ p: 3, bgcolor: "white", borderRadius: 2, boxShadow: 3 }}>
      <CardContent>
        {/* Titre */}
        <Typography
          variant="h4"
          component="h1"
          color="primary"
          gutterBottom
          fontWeight="bold"
        >
          À propos de ce template
        </Typography>

        {/* Paragraphe d’introduction */}
        <Typography variant="body1" color="text.secondary" paragraph>
          Ce template a été créé pour offrir un point de départ solide pour vos
          projets React. Il inclut les technologies suivantes :
        </Typography>

        {/* Liste des technos */}
        <List>
          <ListItem>
            <ListItemText
              primary="Vite"
              secondary="Un outil de build ultra-rapide pour une expérience de développement instantanée."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="React & TypeScript"
              secondary="Pour une construction d'interfaces utilisateur moderne et typée."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Tailwind CSS"
              secondary="Un framework CSS utilitaire pour un stylisme rapide et efficace."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="React Router DOM"
              secondary="Pour la gestion de la navigation et des routes."
            />
          </ListItem>
        </List>

        {/* Conclusion */}
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          Vous êtes libre de modifier, d'ajouter ou de supprimer des dépendances
          selon les besoins de votre projet.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default About;

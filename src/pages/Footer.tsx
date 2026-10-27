import { Box, Typography } from "@mui/material";

export default function Footer() {
  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        height: 35,
        bgcolor: "#f5f7fa",
        borderTop: "1px solid #e0e0e0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        px: 2,
        zIndex: 1200, // reste au-dessus
      }}
    >
      {/* Partie gauche */}
      <Typography variant="body2" color="text.secondary">
        grissigj
      </Typography>

      {/* Partie centrale */}
      <Typography variant="body2" color="text.secondary">
        Template <strong>ternary-blend-front</strong>&nbsp;
        <Box component="span" sx={{ bgcolor: "#e5e7eb", px: 1, borderRadius: 1 }}>
          VueJS-3 1.1.0
        </Box>
      </Typography>

      {/* Partie droite */}
      <Typography variant="body2" color="text.secondary">
        powered by <strong>Fast&nbsp;IT</strong>
      </Typography>
    </Box>
  );
}

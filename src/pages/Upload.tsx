import React, { useState, type DragEvent, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Drawer,
  Typography,
  Divider,
  Snackbar,
  Alert
} from "@mui/material";
import TableChartIcon from '@mui/icons-material/TableChart';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import FastITLogo from "../assets/fast-it.svg"; // logo IFPEN ou Fast IT
import IfpenLogo from "../assets/ifpen_logo.svg"; // logo IFPEN ou Fast IT
import { useAuth } from "../app/auth/services/useAuth";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import { IconButton } from "@mui/material";
import { useHealthCheckService } from "../services/useHealthCheckService";
import { useUpload } from "../services/uploadCsvImg";

export default function Upload() {
  const [, setImageFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { username, logout } = useAuth();
  const healthCheckService = useHealthCheckService();
  const { uploadImage, uploadCsv } = useUpload();
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error'>('success');
  const [, setIsUploading] = useState(false);
  const handleLogout = useCallback(() => {
    try {
      sessionStorage.removeItem('serverChecked');
    } catch {
      /* ignore */
    }
    logout();
  }, [logout]);
  // Vérifier la disponibilité du serveur au chargement
  useEffect(() => {
    try {
      const alreadyChecked = sessionStorage.getItem('serverChecked');
      if (alreadyChecked === 'true') return;
    } catch {
      // sessionStorage might be unavailable in some contexts; continue with check
    }

    healthCheckService.checkServer()
      .then(() => {
        setToastMessage('Serveur disponible');
        setToastSeverity('success');
        setToastOpen(true);
        try { sessionStorage.setItem('serverChecked', 'true'); } catch { /* ignore */ }
      })
      .catch(() => {
        setToastMessage('Serveur indisponible');
        setToastSeverity('error');
        setToastOpen(true);
        try { sessionStorage.setItem('serverChecked', 'true'); } catch { /* ignore */ }
      });
  }, [healthCheckService]);

  const handleDrop = (e: DragEvent<HTMLDivElement>, type: "image" | "csv") => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (
      type === "image" &&
      ["image/png", "image/webp", "image/jpeg"].includes(file.type)
    ) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      handleUploadImage(file);
    } else if (
      type === "csv" &&
      (file.type === "text/csv" || file.name.endsWith(".csv"))
    ) {
      setCsvFile(file);
      handleUploadCsv(file);
    } else {
      setToastMessage("Type de fichier non supporté");
      setToastSeverity('error');
      setToastOpen(true);
    }
  };

  const handleBrowse = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "csv"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      type === "image" &&
      ["image/png", "image/webp", "image/jpeg"].includes(file.type)
    ) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      handleUploadImage(file);
    } else if (
      type === "csv" &&
      (file.type === "text/csv" || file.name.endsWith(".csv"))
    ) {
      setCsvFile(file);
      handleUploadCsv(file);
    } else {
      setToastMessage("Type de fichier non supporté");
      setToastSeverity('error');
      setToastOpen(true);
    }
  };

  const handleUploadImage = async (file: File) => {
    setIsUploading(true);
    try {
      await uploadImage(file);
      setToastMessage("Image uploadée avec succès");
      setToastSeverity('success');
      setToastOpen(true);
    } catch (error) {
      console.error("Erreur lors de l'upload de l'image:", error);
      setToastMessage("Erreur lors de l'upload de l'image");
      setToastSeverity('error');
      setToastOpen(true);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadCsv = async (file: File) => {
    setIsUploading(true);
    try {
      await uploadCsv(file);
      setToastMessage("CSV uploadé avec succès");
      setToastSeverity('success');
      setToastOpen(true);
    } catch (error) {
      console.error("Erreur lors de l'upload du CSV:", error);
      setToastMessage("Erreur lors de l'upload du CSV");
      setToastSeverity('error');
      setToastOpen(true);
    } finally {
      setIsUploading(false);
    }
  };

  const resetAll = () => {
    setImageFile(null);
    setCsvFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);

    const imgInput = document.getElementById("imageInput") as HTMLInputElement | null;
    const csvInput = document.getElementById("csvInput") as HTMLInputElement | null;
    if (imgInput) imgInput.value = "";
    if (csvInput) csvInput.value = "";
  };

  return (
    <>
    <Box sx={{ display: "flex", height: "97.5vh", bgcolor: "#f5f7fa" }}>
        {/* Sidebar */}
        <Drawer
            variant="permanent"
            anchor="left"
            sx={{
            width: 340,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
                width: 300,
                boxSizing: "border-box",
                bgcolor: "white",
                borderRight: "1px solid #abbace",
                p: 2,
            },
            }}
        >
          {/* Logo Fast IT + IFPEN */}
            <Box display="flex" alignItems="center" mb={2} gap={3} style={{ marginLeft: 10, marginTop: 15 }}>
              <img src={FastITLogo} alt="IFPEN" style={{ height: 15 }} />
              <Typography variant="body2" fontWeight={500} style={{ marginLeft: -18 }}>
                by
              </Typography>
              <img src={IfpenLogo} alt="IFPEN" style={{ height: 34 }} />
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <Button
                variant="contained"
                color="primary"
                startIcon={<ImageIcon />}
                sx={{
                bgcolor: "#3f5eb6",
                textTransform: "none",
                fontSize: "1rem",
                fontWeight: 500,
                borderRadius: 2
                }}
                onClick={() => document.getElementById("imageInput")?.click()}
            >
                Upload an image
            </Button>

            <Button
                variant="contained"
                color="primary"
                startIcon={<TableChartIcon />}
                sx={{
                bgcolor: "#3f5eb6",
                textTransform: "none",
                fontSize: "1rem",
                fontWeight: 500,
                borderRadius: 2
                }}
                onClick={() => document.getElementById("csvInput")?.click()}
            >
                Upload a CSV file
            </Button>
            </Box>

            <Divider 
              sx={{ 
                marginLeft:0.5,
                width: "88%", 
                mb: 3, 
                bgcolor: "black",
                position: "absolute",
                    bottom: 80, // Ajustez la position pour la marge
                    left: 15, // Ajustez la position pour la marge
              }} 
            />

            <Box 
              style={{  }}
              sx={{
                    position: "absolute",
                    bottom: 42, // Ajustez la position pour la marge
                    left: 15, // Ajustez la position pour la marge
                    width: "270px"
                }}
            >
                <Typography variant="body2" fontWeight={500} style={{marginLeft: 5, fontSize:15}} >
                {username}
              </Typography>
              <a
                onClick={handleLogout}
                rel="noopener noreferrer"
                style={{
                  textDecoration: "none",
                }}
              >
                <IconButton
                  sx={{
                    position: "absolute",
                    bottom: -7, // Ajustez la position pour la marge
                    right: 2, // Ajustez la position pour la marge
                    border: "1px solid #e0e0e0",
                    borderRadius: 2,
                    p: 0.8,
                    color: "#2e4a8b",
                    transition: "0.2s",
                    "&:hover": {
                      bgcolor: "#f5f7fa",
                      borderColor: "#b0b0b0",
                    },
                  }}
                >
                  <ExitToAppIcon fontSize="medium" />
                </IconButton>
              </a>
              </Box>

        </Drawer>

        {/* Main content */}
        <Box
            component="main"
            sx={{
            flexGrow: 1,
            p: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative", // Ajout de la position relative pour positionner le bouton
            }}
        >
          <Typography 
              variant="h4" 
              fontWeight={500} 
              style={{ marginLeft: -18 }}
              sx={{
                    position: "absolute",
                    top: 12, // Ajustez la position pour la marge
                    left: 10, // Ajustez la position pour la marge
                }}
            >
                proprjetgui-front
              </Typography>
            {/* Bouton Reset en haut à droite */}
            <Button
                variant="contained"
                color="error"
                onClick={resetAll}
                disabled={!imagePreview && !csvFile} // Le bouton est désactivé si les deux états sont nuls
                sx={{
                    position: "absolute",
                    top: 12, // Ajustez la position pour la marge
                    right: 10, // Ajustez la position pour la marge
                    borderRadius: 3,
                    textTransform: "none",
                    "&.Mui-disabled": {
                    bgcolor: "white", // Fond blanc quand le bouton est désactivé
                    color: "#abbace", // Couleur du texte pour l'état désactivé (optionnel, pour plus de contraste)
                    border: "0.1px solid #ebeef3", // Bordure optionnelle
                    },
                }}
            >
            Reset
            </Button>
          <Box
            component="main"
            sx={{
            p: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            overflowY: "auto",
            width: "90%",
            maxHeight: "63vh"
            }}
          >
            {/* Dropzone image */}
            <Box
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, "image")}
            onClick={() => document.getElementById("imageInput")?.click()}
            sx={{
                width: "60%",
                height: 250,
                border: "2px dashed #aaa",
                borderRadius: 2,
                bgcolor: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                mb: 3,
                
            }}
            >
            {imagePreview ? (
                <img
                src={imagePreview}
                alt="preview"
                style={{ maxHeight: "100%", maxWidth: "100%", borderRadius: 8 }}
                />
            ) : (
                // Utilisez une Box pour envelopper l'icône et le texte
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <ImageIcon sx={{ fontSize: 40, color: '#abbace', mb: 1 }} /> {/* L'icône */}
                <Typography align="center" color="#5d779a">
                    Browse by clicking here or drag and drop your file here
                    <br />
                    <span style={{ fontSize: "0.9rem", color: "#abbace" }}>PNG, WEBP</span>
                </Typography>
                </Box>
            )}
            <input
                id="imageInput"
                type="file"
                accept="image/png,image/webp,image/jpeg"
                onChange={(e) => handleBrowse(e, "image")}
                style={{ display: "none" }}
            />
            </Box>

            {/* séparateur */}
            <Divider sx={{ width: "60%", mb: 3, bgcolor: "#abbace" }} />

            {/* Dropzone CSV */}
            <Box
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, "csv")}
            onClick={() => document.getElementById("csvInput")?.click()}
            sx={{
                width: "60%",
                height: 250,
                border: "2px dashed #abbace",
                borderRadius: 2,
                bgcolor: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
            }}
            >
            {csvFile ? (
                <Typography color="success.main">{csvFile.name}</Typography>
            ) : (
                // Utilisez une Box pour envelopper l'icône et le texte
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <DescriptionIcon sx={{ fontSize: 40, color: '#abbace', mb: 1 }} /> {/* L'icône */}
                <Typography align="center" color="#5d779a">
                    Browse by clicking here or drag and drop your file here
                    <br />
                    <span style={{ fontSize: "0.9rem", color: "#abbace" }}>CSV</span>
                </Typography>
                </Box>
            )}
            <input
                id="csvInput"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => handleBrowse(e, "csv")}
                style={{ display: "none" }}
            />
            </Box>
          </Box>
          
        {/* Footer */}
        {/* séparateur */}
        <Divider 
              sx={{ 
                marginRight: 5,
                width: "100%", 
                mb: 3, 
                bgcolor: "#abbace",
                position: "absolute",
                    bottom: 69, // Ajustez la position pour la marge
                    //left: 15, // Ajustez la position pour la marge
              }} 
        />
        <Typography 
          variant="h3" 
          fontWeight={500} 
          style={{marginLeft: -35, fontSize:18}}
          sx={{
            position: "absolute",
            bottom: 27, // Ajustez la position pour la marge
            left: 15, // Ajustez la position pour la marge
          }} 
        >
          Template proprjetgui-front
          <span 
            style={{ 
              marginLeft: 7, 
              backgroundColor: "#e1ebf8", 
              color: "#384e95", 
              borderRadius:"1em", 
              padding: "2px 6px" 
            }}
          >
            ReactJS 19.1.0
          </span>
        </Typography>
        <Typography 
          variant="h3" 
          fontWeight={500} 
          style={{fontSize:18}}
          sx={{
            position: "absolute",
            bottom: 27, // Ajustez la position pour la marge
            right: 19, // Ajustez la position pour la marge
          }} 
        >
          powered by Fast IT
        </Typography>
        </Box>
    </Box>
    
    <Snackbar
      open={toastOpen}
      autoHideDuration={4000}
      onClose={() => setToastOpen(false)}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert
        onClose={() => setToastOpen(false)}
        severity={toastSeverity}
        sx={{ width: '100%' }}
      >
        {toastMessage}
      </Alert>
    </Snackbar>
    </>
  );
}
// Unauthorized.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Unauthorized() {
  const navigate = useNavigate();

  useEffect(() => {
    // Supprimer le token (localStorage / cookies)
    localStorage.removeItem("token");
    // Rediriger vers login
    navigate("/login");
  }, [navigate]);

  return null; // Pas besoin d'afficher la page
}

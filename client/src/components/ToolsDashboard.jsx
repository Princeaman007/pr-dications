// src/pages/ToolsDashboard.jsx
import { Link } from "react-router-dom";
import { Card, Button } from "react-bootstrap";

const routes = [
  {
    title: "📊 Advanced Stats",
    description: "Statistiques avancées par équipe (meilleur buteur, efficacité, etc.)",
    path: "/api/advanced-stats?team=Colorado Avalanche"
  },
  {
    title: "🤝 Head-to-Head Analysis",
    description: "Analyse des confrontations entre deux équipes (historique, buteurs, duos).",
    path: "/api/head-to-head?teamA=Toronto Maple Leafs&teamB=Boston Bruins"
  },
  {
    title: "🔮 Match Predictions",
    description: "Prédictions sur les buteurs à venir (matchs à venir).",
    path: "/api/predict-upcoming"
  },
  {
    title: "📅 Confrontations Uniques",
    description: "Liste des confrontations uniques enregistrées en base.",
    path: "/api/confrontations"
  },
  {
    title: "🎯 Vérifier les buteurs",
    description: "Vérifie tous les buteurs à partir des gameId dans la base.",
    path: "/api/scorers/verify-all"
  },
  {
    title: "🎯 Buteurs par Game ID",
    description: "Tester un match spécifique avec un gameId donné.",
    path: "/api/scorers/2023020912"
  }
];

const ToolsDashboard = () => {
  return (
    <div className="container mt-5">
      <h2 className="mb-4 text-center">🛠️ Outils d'administration et d’analyse</h2>
      <div className="row">
        {routes.map((route, index) => (
          <div className="col-md-6 mb-4" key={index}>
            <Card className="h-100 shadow-sm">
              <Card.Body>
                <Card.Title>{route.title}</Card.Title>
                <Card.Text>{route.description}</Card.Text>
                <Button
                  variant="primary"
                  href={route.path}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ouvrir
                </Button>
              </Card.Body>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToolsDashboard;

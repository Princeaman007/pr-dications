// src/pages/AdvancedStats.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Container,
  Form,
  Spinner,
  Alert,
  Card,
  Row,
  Col,
} from "react-bootstrap";

const AdvancedStats = () => {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Charger les équipes
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await axios.get("/api/teams");
        setTeams(res.data || []);
      } catch (err) {
        console.error("Erreur chargement équipes:", err.message);
      }
    };
    fetchTeams();
  }, []);

  const fetchStats = async () => {
    if (!selectedTeam) return;
    setLoading(true);
    setError("");
    setStats(null);
    try {
      const res = await axios.get(`/api/advanced-stats?team=${encodeURIComponent(selectedTeam)}`);
      setStats(res.data);
    } catch (err) {
      console.error("Erreur récupération stats:", err);
      setError("Impossible de charger les statistiques.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="my-4">
      <h2 className="text-center mb-4">📊 Statistiques Avancées</h2>

      <Form className="mb-4 text-center">
        <Form.Select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          style={{ maxWidth: 400, margin: "0 auto" }}
        >
          <option value="">Sélectionnez une équipe...</option>
          {teams.map((team, i) => (
            <option key={i} value={team}>
              {team}
            </option>
          ))}
        </Form.Select>

        <button
          className="btn btn-primary mt-3"
          disabled={!selectedTeam || loading}
          onClick={(e) => {
            e.preventDefault();
            fetchStats();
          }}
        >
          Voir les statistiques
        </button>
      </Form>

      {loading && (
        <div className="text-center">
          <Spinner animation="border" />
          <p>Chargement...</p>
        </div>
      )}

      {error && (
        <Alert variant="danger" className="text-center">
          {error}
        </Alert>
      )}

      {stats && (
        <>
          {/* Meilleurs buteurs / passeurs */}
          <Row className="mb-4">
            <Col md={6}>
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <Card.Title>🏒 Meilleur buteur</Card.Title>
                  <p>
                    <strong>{stats.bestScorer[0]}</strong> — {stats.bestScorer[1].goals} buts, {stats.bestScorer[1].assists} passes
                    ({stats.bestScorer[1].matches} matchs)
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <Card.Title>🎯 Meilleur passeur</Card.Title>
                  <p>
                    <strong>{stats.bestAssists[0]}</strong> — {stats.bestAssists[1].assists} passes, {stats.bestAssists[1].goals} buts
                    ({stats.bestAssists[1].matches} matchs)
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Opposants fréquents */}
          <Card className="mb-4 shadow-sm">
            <Card.Body>
              <Card.Title>💥 Opposants fréquents</Card.Title>
              <ul>
                {stats.topOpponents.map(([team, count], i) => (
                  <li key={i}>{team} — {count} matchs</li>
                ))}
              </ul>
            </Card.Body>
          </Card>

          {/* Top efficients */}
          <Card className="mb-4 shadow-sm">
            <Card.Body>
              <Card.Title>🔥 Joueurs les plus efficaces</Card.Title>
              <ul>
                {stats.efficiency.map((player, i) => (
                  <li key={i}>
                    {player.name} — {player.goals} buts / {player.matches} matchs (
                    {player.efficiency.toFixed(2)} but/match)
                  </li>
                ))}
              </ul>
            </Card.Body>
          </Card>

          {/* Séries de matchs */}
          <Card className="mb-4 shadow-sm">
            <Card.Body>
              <Card.Title>📈 Séries de buts</Card.Title>
              <ul>
                {Object.entries(stats.playerStreaks)
                  .filter(([_, val]) => val.max > 1)
                  .map(([name, val], i) => (
                    <li key={i}>
                      {name} — série max: {val.max}, actuelle: {val.current}
                    </li>
                  ))}
              </ul>
            </Card.Body>
          </Card>
        </>
      )}
    </Container>
  );
};

export default AdvancedStats;

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
  Button,
  Badge
} from "react-bootstrap";

const AdvancedStats = () => {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await axios.get("/api/teams");
        // Trier les équipes par ordre alphabétique
        const sortedTeams = Array.isArray(res.data) 
          ? [...res.data].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
          : [];
        setTeams(sortedTeams);
      } catch (err) {
        console.error("Erreur chargement équipes:", err.message);
        setError("Impossible de charger la liste des équipes.");
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
      console.log("Données stats:", res.data);
      setStats(res.data);
    } catch (err) {
      console.error("Erreur récupération stats:", err);
      setError("Impossible de charger les statistiques.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="my-5">
      <h2 className="text-center mb-5 d-flex align-items-center justify-content-center">
        <Badge bg="primary" pill className="p-2 me-2">📊</Badge>
        Statistiques Avancées
      </h2>

      <Card className="shadow-sm border-0 mb-5">
        <Card.Body className="p-4">
          <Form className="text-center">
            <div className="mb-4">
              <Form.Label className="fw-bold mb-3 text-primary">Sélectionnez une équipe pour voir ses statistiques</Form.Label>
              <div className="d-flex justify-content-center">
                <div style={{ maxWidth: '400px', width: '100%' }}>
                  <Form.Select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="py-3 ps-3 mb-3"
                    style={{ background: selectedTeam ? 'rgba(13, 110, 253, 0.05)' : 'white' }}
                  >
                    <option value="">Choisissez une équipe...</option>
                    {teams.map((team, i) => (
                      <option key={`team-${i}`} value={team}>
                        {team}
                      </option>
                    ))}
                  </Form.Select>
                </div>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="px-4 py-2 rounded-pill shadow-sm"
                style={{ transition: 'all 0.2s ease' }}
                disabled={!selectedTeam || loading}
                onClick={(e) => {
                  e.preventDefault();
                  fetchStats();
                }}
              >
                {loading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Chargement...
                  </>
                ) : (
                  'Voir les statistiques'
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {loading && (
        <div className="text-center my-5">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted">Chargement des statistiques...</p>
        </div>
      )}

      {error && (
        <Alert variant="danger" className="text-center shadow-sm">
          {error}
        </Alert>
      )}

      {stats && (
        <div className="stats-container">
          {selectedTeam && (
            <h4 className="text-center mb-4 pb-2" style={{ 
              borderBottom: '3px solid #0d6efd', 
              display: 'inline-block', 
              margin: '0 auto 2rem',
              paddingBottom: '0.5rem'
            }}>
              Statistiques de {selectedTeam}
            </h4>
          )}

          {/* Moyennes offensives/défensives */}
          <Card className="mb-4 shadow-sm border-0 hover-card">
            <Card.Header className="bg-gradient bg-primary text-white py-3">
              <h5 className="mb-0">📊 Moyennes de buts</h5>
            </Card.Header>
            <Card.Body className="p-4">
              <Row>
                <Col md={6} className="text-center mb-3 mb-md-0">
                  <div className="p-3 rounded" style={{ background: 'rgba(25, 135, 84, 0.1)' }}>
                    <h6 className="text-success mb-3">Buts marqués</h6>
                    <div className="display-4 fw-bold text-success">
                      {stats.goalsForAvg.toFixed(2)}
                    </div>
                    <p className="text-muted mb-0">par match</p>
                  </div>
                </Col>
                <Col md={6} className="text-center">
                  <div className="p-3 rounded" style={{ background: 'rgba(220, 53, 69, 0.1)' }}>
                    <h6 className="text-danger mb-3">Buts encaissés</h6>
                    <div className="display-4 fw-bold text-danger">
                      {stats.goalsAgainstAvg.toFixed(2)}
                    </div>
                    <p className="text-muted mb-0">par match</p>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Meilleurs joueurs */}
          <Row className="mb-4">
            <Col md={6} className="mb-4 mb-md-0">
              <Card className="shadow-sm border-0 h-100 hover-card">
                <Card.Header className="bg-gradient bg-primary text-white py-3">
                  <h5 className="mb-0">🏒 Meilleur buteur</h5>
                </Card.Header>
                <Card.Body className="p-4 d-flex flex-column justify-content-center">
                  <div className="text-center">
                    <div className="player-badge bg-light rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
                      <span className="fs-1">🏆</span>
                    </div>
                    <h4 className="mb-2">{stats.bestScorer[0]}</h4>
                    <p className="text-muted mb-4">Buteur d'élite</p>
                    <div className="d-flex justify-content-center gap-4">
                      <div className="text-center">
                        <h3 className="mb-0 text-primary">{stats.bestScorer[1].goals}</h3>
                        <small className="text-muted">buts</small>
                      </div>
                      <div className="text-center">
                        <h3 className="mb-0 text-info">{stats.bestScorer[1].assists}</h3>
                        <small className="text-muted">passes</small>
                      </div>
                      <div className="text-center">
                        <h3 className="mb-0 text-secondary">{stats.bestScorer[1].matches}</h3>
                        <small className="text-muted">matchs</small>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="shadow-sm border-0 h-100 hover-card">
                <Card.Header className="bg-gradient bg-success text-white py-3">
                  <h5 className="mb-0">🎯 Meilleur passeur</h5>
                </Card.Header>
                <Card.Body className="p-4 d-flex flex-column justify-content-center">
                  <div className="text-center">
                    <div className="player-badge bg-light rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
                      <span className="fs-1">🎯</span>
                    </div>
                    <h4 className="mb-2">{stats.topAssist[0]}</h4>
                    <p className="text-muted mb-4">Créateur de jeu</p>
                    <div className="d-flex justify-content-center gap-4">
                      <div className="text-center">
                        <h3 className="mb-0 text-success">{stats.topAssist[1].assists}</h3>
                        <small className="text-muted">passes</small>
                      </div>
                      <div className="text-center">
                        <h3 className="mb-0 text-primary">{stats.topAssist[1].goals}</h3>
                        <small className="text-muted">buts</small>
                      </div>
                      <div className="text-center">
                        <h3 className="mb-0 text-secondary">{stats.topAssist[1].matches}</h3>
                        <small className="text-muted">matchs</small>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Opposants fréquents */}
          <Card className="mb-4 shadow-sm border-0 hover-card">
            <Card.Header className="bg-gradient bg-info text-white py-3">
              <h5 className="mb-0">💥 Opposants fréquents</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="p-3">
                {stats.topOpponents.map(({ team, count }, i) => (
                  <div key={i} className={`opponent-item p-3 d-flex align-items-center ${i % 2 === 0 ? '' : 'bg-light rounded'}`}>
                    <Badge 
                      bg={i < 3 ? 'info' : 'secondary'} 
                      className="rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '32px', height: '32px' }}
                    >
                      {i + 1}
                    </Badge>
                    <div className="opponent-name flex-grow-1">
                      <span className="fw-bold">{team}</span>
                    </div>
                    <Badge bg="light" text="dark" className="px-3 py-2">
                      {count} match{count > 1 ? 's' : ''}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>

          {/* Joueurs les plus efficaces */}
          <Card className="mb-4 shadow-sm border-0 hover-card">
            <Card.Header className="bg-gradient bg-warning text-white py-3">
              <h5 className="mb-0">🔥 Joueurs les plus efficaces</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="p-3">
                {stats.efficiency.map((player, i) => (
                  <div key={i} className={`player-item p-3 d-flex align-items-center ${i % 2 === 0 ? '' : 'bg-light rounded'}`}>
                    <Badge 
                      bg={i < 3 ? 'warning' : 'secondary'} 
                      text={i < 3 ? 'dark' : 'light'}
                      className="rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '32px', height: '32px' }}
                    >
                      {i + 1}
                    </Badge>
                    <div className="player-info flex-grow-1">
                      <div className="fw-bold">{player.name}</div>
                      <div className="small text-muted">
                        {player.goals} but{player.goals > 1 ? 's' : ''} en {player.matches} match{player.matches > 1 ? 's' : ''}
                      </div>
                    </div>
                    <Badge bg="primary" className="px-3 py-2">
                      {player.efficiency.toFixed(2)} <small>but/match</small>
                    </Badge>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>

          {/* Séries de buts */}
          <Card className="mb-4 shadow-sm border-0 hover-card">
            <Card.Header className="bg-gradient bg-secondary text-white py-3">
              <h5 className="mb-0">📈 Séries de buts</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="p-3">
                {stats.topStreaks
                  .filter((s) => s.max > 1)
                  .map((s, i) => (
                    <div key={i} className={`streak-item p-3 d-flex align-items-center ${i % 2 === 0 ? '' : 'bg-light rounded'}`}>
                      <Badge 
                        bg={i < 3 ? 'primary' : 'secondary'}
                        className="rounded-circle d-flex align-items-center justify-content-center me-3"
                        style={{ width: '32px', height: '32px' }}
                      >
                        {i + 1}
                      </Badge>
                      <div className="streak-info flex-grow-1">
                        <span className="fw-bold">{s.name}</span>
                      </div>
                      <div className="streak-value d-flex align-items-center">
                        <div className="me-3 text-center">
                          <div className="small text-muted">Série Max</div>
                          <Badge bg="primary" className="px-3 py-2">
                            {s.max}
                          </Badge>
                        </div>
                        <div className="text-center">
                          <div className="small text-muted">Série Actuelle</div>
                          <Badge bg={s.current > 0 ? "success" : "light"} text={s.current > 0 ? "white" : "dark"} className="px-3 py-2">
                            {s.current}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </Card.Body>
          </Card>
        </div>
      )}

      <style jsx="true">{`
        .hover-card {
          transition: all 0.2s ease;
        }
        .hover-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1) !important;
        }
        .player-item, .opponent-item, .streak-item {
          transition: all 0.2s ease;
        }
        .player-item:hover, .opponent-item:hover, .streak-item:hover {
          background-color: rgba(13, 110, 253, 0.05) !important;
        }
      `}</style>
    </Container>
  );
};

export default AdvancedStats;
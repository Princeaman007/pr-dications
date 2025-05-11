// src/components/TeamTrioAnalysis.jsx
import React, { useState, useEffect } from "react";
import {
  Card,
  Badge,
  ProgressBar,
  Table,
  Button,
  ListGroup,
  Row,
  Col,
  Spinner,
  Alert
} from "react-bootstrap";
import {
  FaUserFriends,
  FaHockeyPuck,
  FaHandsHelping,
  FaHistory,
  FaChartLine,
  FaTrophy,
  FaCalendarAlt,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaArrowRight
} from "react-icons/fa";

const TeamTrioAnalysis = ({ teamName, onSelectTrio, minGoals = 1 }) => {
  const [trioData, setTrioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTrio, setSelectedTrio] = useState(null);

  useEffect(() => {
    const fetchTrioData = async () => {
      if (!teamName) {
        setError("Équipe non spécifiée");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/team-trios?team=${encodeURIComponent(teamName)}&minGoals=${minGoals}`);
        
        if (!response.ok) {
          throw new Error(`Erreur serveur: ${response.status}`);
        }
        
        const data = await response.json();
        setTrioData(data);
        
        // Si des trios existent, sélectionner le premier par défaut
        if (data.trios && data.trios.length > 0) {
          setSelectedTrio(data.trios[0]);
          if (onSelectTrio) {
            onSelectTrio(data.trios[0]);
          }
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des trios:", err);
        setError(`Impossible de charger les données: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTrioData();
  }, [teamName, minGoals]);

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString("fr-FR", {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Fonction pour gérer la sélection d'un trio
  const handleTrioSelect = (trio) => {
    setSelectedTrio(trio);
    if (onSelectTrio) {
      onSelectTrio(trio);
    }
  };

  if (loading) {
    return (
      <div className="text-center my-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Chargement de l'analyse des trios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <FaInfoCircle className="me-2" />
        {error}
      </Alert>
    );
  }

  if (!trioData || !trioData.trios || trioData.trios.length === 0) {
    return (
      <Alert variant="info">
        <FaInfoCircle className="me-2" />
        Aucun trio trouvé pour cette équipe. Il est possible qu'il n'y ait pas eu 3 joueurs 
        ayant marqué au moins {minGoals} but(s) chacun dans un même match.
      </Alert>
    );
  }

  return (
    <div className="team-trio-analysis">
      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-primary text-white py-3">
          <h5 className="mb-0 d-flex align-items-center">
            <FaUserFriends className="me-2" />
            Analyse des trios pour {teamName}
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="p-3 border-bottom bg-light">
            <Row className="align-items-center">
              <Col md={8}>
                <h6 className="mb-0">
                  {trioData.trios.length} trio{trioData.trios.length > 1 ? 's' : ''} identifié{trioData.trios.length > 1 ? 's' : ''}
                  <span className="ms-2 text-muted small">
                    (min. {minGoals} but{minGoals > 1 ? 's' : ''} par joueur)
                  </span>
                </h6>
              </Col>
              <Col md={4} className="text-end">
                <Badge bg="info" className="py-2 px-3">
                  <FaCalendarAlt className="me-1" /> Saison 2024-2025
                </Badge>
              </Col>
            </Row>
          </div>
          
          <Row className="g-0">
            <Col md={4} className="border-end">
              <div className="p-3">
                <h6 className="text-muted mb-3">Trios identifiés</h6>
                <ListGroup variant="flush">
                  {trioData.trios.map((trio, index) => (
                    <ListGroup.Item 
                      key={index}
                      action
                      active={selectedTrio && selectedTrio.players.join() === trio.players.join()}
                      onClick={() => handleTrioSelect(trio)}
                      className="trio-list-item"
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <FaUserFriends className="me-2 text-primary" />
                          <strong>{trio.players.join(" + ")}</strong>
                          <div className="small text-muted mt-1">
                            {trio.matches} match{trio.matches !== 1 ? 's' : ''} ensemble
                          </div>
                        </div>
                        <Badge bg="primary" pill>
                          {trio.totalGoals} buts
                        </Badge>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            </Col>
            <Col md={8}>
              {selectedTrio && (
                <div className="p-3">
                  <div className="trio-details-header mb-3">
                    <h5 className="border-bottom pb-2">
                      <FaUserFriends className="me-2" />
                      Trio Offensif
                    </h5>
                    
                    <div className="players-display d-flex flex-wrap gap-2 mb-3">
                      {selectedTrio.players.map((player, index) => (
                        <Badge 
                          key={index} 
                          bg="primary" 
                          className="px-3 py-2"
                        >
                          {player}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="stats-overview d-flex flex-wrap gap-3 mb-4">
                      <Card className="stats-card flex-grow-1 border-0 shadow-sm">
                        <Card.Body className="text-center">
                          <div className="text-muted mb-1">Matchs</div>
                          <h3 className="text-primary">{selectedTrio.matches}</h3>
                        </Card.Body>
                      </Card>
                      
                      <Card className="stats-card flex-grow-1 border-0 shadow-sm">
                        <Card.Body className="text-center">
                          <div className="text-muted mb-1">Buts</div>
                          <h3 className="text-success">{selectedTrio.totalGoals}</h3>
                        </Card.Body>
                      </Card>
                      
                      <Card className="stats-card flex-grow-1 border-0 shadow-sm">
                        <Card.Body className="text-center">
                          <div className="text-muted mb-1">Buts/Match</div>
                          <h3 className="text-info">{selectedTrio.goalsPerMatch}</h3>
                        </Card.Body>
                      </Card>
                      
                      <Card className="stats-card flex-grow-1 border-0 shadow-sm">
                        <Card.Body className="text-center">
                          <div className="text-muted mb-1">% Victoires</div>
                          <h3 className="text-warning">{selectedTrio.winRate}%</h3>
                        </Card.Body>
                      </Card>
                    </div>
                    
                    <h6 className="text-muted mb-2">
                      <FaMapMarkerAlt className="me-2" />
                      Adversaires
                    </h6>
                    <div className="opponents-list mb-3">
                      {selectedTrio.opponents.map((opponent, i) => (
                        <Badge 
                          key={i} 
                          bg="light" 
                          text="dark" 
                          className="me-2 mb-2 px-2 py-1"
                        >
                          {opponent.opponent} ({opponent.count})
                        </Badge>
                      ))}
                    </div>
                    
                    <h6 className="text-muted mb-2">
                      <FaCalendarAlt className="me-2" />
                      Matchs
                    </h6>
                    <Table hover responsive size="sm" className="match-history-table">
                      <thead className="table-light">
                        <tr>
                          <th>Date</th>
                          <th>Adversaire</th>
                          <th>Lieu</th>
                          <th>Score</th>
                          <th>Résultat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTrio.matchList.map((match, i) => (
                          <tr key={i}>
                            <td>{formatDate(match.date)}</td>
                            <td>
                              <Badge bg="light" text="dark" className="px-2">
                                {match.opponent}
                              </Badge>
                            </td>
                            <td>
                              <small className="text-muted">
                                {match.isHome ? "Domicile" : "Extérieur"}
                              </small>
                            </td>
                            <td>{match.score}</td>
                            <td>
                              <Badge 
                                bg={match.win ? "success" : "danger"} 
                                pill
                              >
                                {match.win ? "Victoire" : "Défaite"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </div>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <style jsx="true">{`
        .team-trio-analysis .trio-list-item {
          transition: all 0.2s ease;
        }
        .team-trio-analysis .trio-list-item:hover {
          background-color: rgba(13, 110, 253, 0.05);
        }
        .team-trio-analysis .stats-card {
          min-width: 120px;
          transition: all 0.2s ease;
        }
        .team-trio-analysis .stats-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1) !important;
        }
      `}</style>
    </div>
  );
};

export default TeamTrioAnalysis;
// src/components/TeamQuartetAnalysis.jsx
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
  FaUsers,
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

const TeamQuartetAnalysis = ({ teamName, onSelectQuartet, minGoals = 1 }) => {
  const [quartetData, setQuartetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQuartet, setSelectedQuartet] = useState(null);

  useEffect(() => {
    const fetchQuartetData = async () => {
      if (!teamName) {
        setError("Équipe non spécifiée");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/team-quartets?team=${encodeURIComponent(teamName)}&minGoals=${minGoals}`);
        
        if (!response.ok) {
          throw new Error(`Erreur serveur: ${response.status}`);
        }
        
        const data = await response.json();
        setQuartetData(data);
        
        // Si des quatuors existent, sélectionner le premier par défaut
        if (data.quartets && data.quartets.length > 0) {
          setSelectedQuartet(data.quartets[0]);
          if (onSelectQuartet) {
            onSelectQuartet(data.quartets[0]);
          }
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des quatuors:", err);
        setError(`Impossible de charger les données: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchQuartetData();
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

  // Fonction pour gérer la sélection d'un quatuor
  const handleQuartetSelect = (quartet) => {
    setSelectedQuartet(quartet);
    if (onSelectQuartet) {
      onSelectQuartet(quartet);
    }
  };

  if (loading) {
    return (
      <div className="text-center my-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Chargement de l'analyse des quatuors...</p>
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

  if (!quartetData || !quartetData.quartets || quartetData.quartets.length === 0) {
    return (
      <Alert variant="info">
        <FaInfoCircle className="me-2" />
        Aucun quatuor trouvé pour cette équipe. Il est possible qu'il n'y ait pas eu 4 joueurs 
        ayant marqué au moins {minGoals} but(s) chacun dans un même match.
      </Alert>
    );
  }

  return (
    <div className="team-quartet-analysis">
      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-primary text-white py-3">
          <h5 className="mb-0 d-flex align-items-center">
            <FaUsers className="me-2" />
            Analyse des quatuors pour {teamName}
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="p-3 border-bottom bg-light">
            <Row className="align-items-center">
              <Col md={8}>
                <h6 className="mb-0">
                  {quartetData.quartets.length} quatuor{quartetData.quartets.length > 1 ? 's' : ''} identifié{quartetData.quartets.length > 1 ? 's' : ''}
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
                <h6 className="text-muted mb-3">Quatuors identifiés</h6>
                <ListGroup variant="flush">
                  {quartetData.quartets.map((quartet, index) => (
                    <ListGroup.Item 
                      key={index}
                      action
                      active={selectedQuartet && selectedQuartet.players.join() === quartet.players.join()}
                      onClick={() => handleQuartetSelect(quartet)}
                      className="quartet-list-item"
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <FaUsers className="me-2 text-primary" />
                          <strong>
                            {quartet.players.slice(0, 2).join(" + ")}
                            <br />
                            {quartet.players.slice(2, 4).join(" + ")}
                          </strong>
                          <div className="small text-muted mt-1">
                            {quartet.matches} match{quartet.matches !== 1 ? 's' : ''} ensemble
                          </div>
                        </div>
                        <Badge bg="primary" pill>
                          {quartet.totalGoals} buts
                        </Badge>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            </Col>
            <Col md={8}>
              {selectedQuartet && (
                <div className="p-3">
                  <div className="quartet-details-header mb-3">
                    <h5 className="border-bottom pb-2">
                      <FaUsers className="me-2" />
                      Quatuor Offensif
                    </h5>
                    
                    <div className="players-display d-flex flex-wrap gap-2 mb-3">
                      {selectedQuartet.players.map((player, index) => (
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
                          <h3 className="text-primary">{selectedQuartet.matches}</h3>
                        </Card.Body>
                      </Card>
                      
                      <Card className="stats-card flex-grow-1 border-0 shadow-sm">
                        <Card.Body className="text-center">
                          <div className="text-muted mb-1">Buts</div>
                          <h3 className="text-success">{selectedQuartet.totalGoals}</h3>
                        </Card.Body>
                      </Card>
                      
                      <Card className="stats-card flex-grow-1 border-0 shadow-sm">
                        <Card.Body className="text-center">
                          <div className="text-muted mb-1">Buts/Match</div>
                          <h3 className="text-info">{selectedQuartet.goalsPerMatch}</h3>
                        </Card.Body>
                      </Card>
                      
                      <Card className="stats-card flex-grow-1 border-0 shadow-sm">
                        <Card.Body className="text-center">
                          <div className="text-muted mb-1">% Victoires</div>
                          <h3 className="text-warning">{selectedQuartet.winRate}%</h3>
                        </Card.Body>
                      </Card>
                    </div>
                    
                    <h6 className="text-muted mb-2">
                      <FaMapMarkerAlt className="me-2" />
                      Adversaires
                    </h6>
                    <div className="opponents-list mb-3">
                      {selectedQuartet.opponents.map((opponent, i) => (
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
                        {selectedQuartet.matchList.map((match, i) => (
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
        .team-quartet-analysis .quartet-list-item {
          transition: all 0.2s ease;
        }
        .team-quartet-analysis .quartet-list-item:hover {
          background-color: rgba(13, 110, 253, 0.05);
        }
        .team-quartet-analysis .stats-card {
          min-width: 120px;
          transition: all 0.2s ease;
        }
        .team-quartet-analysis .stats-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1) !important;
        }
      `}</style>
    </div>
  );
};

export default TeamQuartetAnalysis;
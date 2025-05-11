// src/components/TeamDuoAnalysis.jsx
import React, { useState, useEffect } from "react";
import DuoNetworkGraph from "../components/DuoNetworkGraph";
import {
  Card,
  Badge,
  ProgressBar,
  Table,
  Button,
  Tabs,
  Tab,
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

const TeamDuoAnalysis = ({ teamName, onSelectDuo }) => {
  const [duoData, setDuoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDuo, setSelectedDuo] = useState(null);
  const [activeTab, setActiveTab] = useState("duos");

  useEffect(() => {
    const fetchDuoData = async () => {
      if (!teamName) {
        setError("Équipe non spécifiée");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/team-duos?team=${encodeURIComponent(teamName)}`);
        
        if (!response.ok) {
          throw new Error(`Erreur serveur: ${response.status}`);
        }
        
        const data = await response.json();
        setDuoData(data);
        
        // Si des duos existent, sélectionner le premier par défaut
        if (data.duos && data.duos.length > 0) {
          setSelectedDuo(data.duos[0]);
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des duos:", err);
        setError(`Impossible de charger les données: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchDuoData();
  }, [teamName]);

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

  // Fonction pour gérer la sélection d'un duo
  const handleDuoSelect = (duo) => {
    setSelectedDuo(duo);
    if (onSelectDuo) {
      onSelectDuo(duo);
    }
  };

  if (loading) {
    return (
      <div className="text-center my-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Chargement de l'analyse des duos...</p>
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

  if (!duoData || !duoData.duos || duoData.duos.length === 0) {
    return (
      <Alert variant="info">
        <FaInfoCircle className="me-2" />
        Aucun duo trouvé pour cette équipe. 
      </Alert>
    );
  }

  return (
    <div className="team-duo-analysis">
      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-primary text-white py-3">
          <h5 className="mb-0 d-flex align-items-center">
            <FaUserFriends className="me-2" />
            Analyse des duos pour {teamName}
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-3"
            fill
          >
            <Tab eventKey="duos" title={<><FaUserFriends className="me-2" />Duos</>}>
              <Row>
                <Col md={4} className="border-end">
                  <div className="p-3">
                    <h6 className="text-muted mb-3">Top duos ({duoData.duos.length})</h6>
                    <ListGroup variant="flush">
                      {duoData.duos.map((duo, index) => (
                        <ListGroup.Item 
                          key={index}
                          action
                          active={selectedDuo && selectedDuo.players.join() === duo.players.join()}
                          onClick={() => handleDuoSelect(duo)}
                          className="duo-list-item"
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <FaUserFriends className="me-2 text-primary" />
                              <strong>{duo.players.join(" + ")}</strong>
                              <div className="small text-muted mt-1">
                                {duo.matches} match{duo.matches !== 1 ? 's' : ''} ensemble
                              </div>
                            </div>
                            <Badge bg="primary" pill>
                              {duo.totalGoals} buts
                            </Badge>
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </div>
                </Col>
                <Col md={8}>
                  {selectedDuo && (
                    <div className="p-3">
                      <div className="duo-details-header mb-3">
                        <h5 className="border-bottom pb-2">
                          <FaUserFriends className="me-2" />
                          {selectedDuo.players.join(" + ")}
                        </h5>
                        
                        <div className="stats-overview d-flex flex-wrap gap-3 mb-3">
                          <Card className="stats-card flex-grow-1 border-0 shadow-sm">
                            <Card.Body className="text-center">
                              <div className="text-muted mb-1">Matchs</div>
                              <h3 className="text-primary">{selectedDuo.matches}</h3>
                            </Card.Body>
                          </Card>
                          
                          <Card className="stats-card flex-grow-1 border-0 shadow-sm">
                            <Card.Body className="text-center">
                              <div className="text-muted mb-1">Buts</div>
                              <h3 className="text-success">{selectedDuo.totalGoals}</h3>
                            </Card.Body>
                          </Card>
                          
                          <Card className="stats-card flex-grow-1 border-0 shadow-sm">
                            <Card.Body className="text-center">
                              <div className="text-muted mb-1">Victoires</div>
                              <h3 className="text-info">{selectedDuo.victories}</h3>
                            </Card.Body>
                          </Card>
                          
                          <Card className="stats-card flex-grow-1 border-0 shadow-sm">
                            <Card.Body className="text-center">
                              <div className="text-muted mb-1">% Victoires</div>
                              <h3 className="text-warning">{selectedDuo.winRate}%</h3>
                            </Card.Body>
                          </Card>
                        </div>
                        
                        <h6 className="text-muted mb-2">
                          <FaMapMarkerAlt className="me-2" />
                          Adversaires fréquents
                        </h6>
                        <div className="opponents-list mb-3">
                          {selectedDuo.opponents.slice(0, 5).map((opponent, i) => (
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
                          Matchs récents
                        </h6>
                        <Table hover responsive size="sm" className="match-history-table">
                          <thead className="table-light">
                            <tr>
                              <th>Date</th>
                              <th>Adversaire</th>
                              <th>Score</th>
                              <th>Résultat</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDuo.matchList.slice(0, 5).map((match, i) => (
                              <tr key={i}>
                                <td>{formatDate(match.date)}</td>
                                <td>
                                  <Badge bg="light" text="dark" className="px-2">
                                    {match.opponent}
                                  </Badge>
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
            </Tab>
            
            <Tab eventKey="matches" title={<><FaCalendarAlt className="me-2" />Matchs</>}>
              <div className="p-3">
                <h6 className="mb-3">Matchs avec duos de buteurs ({duoData.matchesWithDuos.length})</h6>
                <ListGroup variant="flush">
                  {duoData.matchesWithDuos.map((match, index) => (
                    <ListGroup.Item key={index} className="p-3 mb-2 bg-light rounded">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div>
                          <div className="fw-bold">{formatDate(match.date)}</div>
                          <div className="text-muted">
                            vs {match.opponent} ({match.isHome ? "Domicile" : "Extérieur"})
                          </div>
                        </div>
                        <Badge bg={match.score.split('-')[0] > match.score.split('-')[1] ? "success" : "danger"}>
                          {match.score}
                        </Badge>
                      </div>
                      
                      <div className="scorers-list mb-2">
                        <small className="text-muted d-block mb-1">Buteurs:</small>
                        <div>
                          {match.scorers.filter(s => s.goals > 0).map((scorer, i) => (
                            <Badge 
                              key={i} 
                              bg="primary" 
                              className="me-2 mb-1 px-2 py-1"
                            >
                              {scorer.name} ({scorer.goals} but{scorer.goals !== 1 ? 's' : ''})
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="duos-list">
                        <small className="text-muted d-block mb-1">Duos:</small>
                        <div>
                          {match.duos.map((duo, i) => (
                            <Badge 
                              key={i} 
                              bg="info" 
                              className="me-2 mb-1 px-2 py-1"
                            >
                              {duo.players.join(" + ")} ({duo.goals} but{duo.goals !== 1 ? 's' : ''})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      <style jsx="true">{`
        .team-duo-analysis .duo-list-item {
          transition: all 0.2s ease;
        }
        .team-duo-analysis .duo-list-item:hover {
          background-color: rgba(13, 110, 253, 0.05);
        }
        .team-duo-analysis .stats-card {
          min-width: 120px;
          transition: all 0.2s ease;
        }
        .team-duo-analysis .stats-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1) !important;
        }
      `}</style>
    </div>
  );
};

export default TeamDuoAnalysis;
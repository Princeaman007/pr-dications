import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  Container,
  Card,
  Row,
  Col,
  Spinner,
  Alert,
  Badge,
  Table,
  ListGroup,
  ProgressBar,
  Button
} from "react-bootstrap";
import {
  FaUserFriends,
  FaCalendarAlt,
  FaUsers,
  FaTrophy,
  FaMapMarkerAlt,
  FaFutbol,
  FaHandsHelping,
  FaChartLine,
  FaLightbulb,
  FaRegLightbulb,
  FaNetworkWired
} from "react-icons/fa";

// Composant pour visualiser les relations entre joueurs
const DuoNetwork = ({ duos, scorers }) => {
  const [showAll, setShowAll] = useState(false);
  
  if (!duos || duos.length === 0) return null;
  
  // Limiter le nombre de duos affichés sauf si showAll est true
  const displayedDuos = showAll ? duos : duos.slice(0, 3);
  
  return (
    <Card className="shadow-sm border-0 mt-3">
      <Card.Header className="bg-light">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <FaNetworkWired className="me-2 text-primary" />
            Réseau de joueurs
          </h6>
          {duos.length > 3 && (
            <Button 
              variant="link" 
              size="sm" 
              className="p-0 text-muted"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Afficher moins" : `Voir tous les ${duos.length} duos`}
            </Button>
          )}
        </div>
      </Card.Header>
      <Card.Body className="p-3">
        <div className="duo-network">
          {displayedDuos.map((duo, i) => {
            // Extraire les noms des joueurs
            const [player1, player2] = duo.duo.split(" + ");
            
            // Trouver les stats des joueurs
            const p1Stats = scorers.find(s => s.name === player1) || { goals: 0, assists: 0 };
            const p2Stats = scorers.find(s => s.name === player2) || { goals: 0, assists: 0 };
            
            return (
              <div key={i} className={`duo-connection ${i % 2 === 0 ? 'bg-light' : ''} p-3 rounded mb-2`}>
                <div className="d-flex justify-content-between mb-2">
                  <div className="text-center">
                    <Badge bg="primary" className="mb-2 px-3 py-2">{player1}</Badge>
                    <div className="mt-1">
                      <small className="d-block text-muted">Performance</small>
                      <div>
                        <Badge bg="success" pill className="me-1">{p1Stats.goals} buts</Badge>
                        <Badge bg="info" pill>{p1Stats.assists} passes</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="connection-line d-flex flex-column align-items-center justify-content-center">
                    <Badge bg="warning" text="dark" className="px-3 py-2">
                      <FaLightbulb className="me-1" /> 
                      {duo.goalsTogether} but{duo.goalsTogether !== 1 ? 's' : ''} ensemble
                    </Badge>
                    <div className="line my-2" style={{ height: '2px', width: '50px', background: '#dee2e6' }}></div>
                  </div>
                  
                  <div className="text-center">
                    <Badge bg="danger" className="mb-2 px-3 py-2">{player2}</Badge>
                    <div className="mt-1">
                      <small className="d-block text-muted">Performance</small>
                      <div>
                        <Badge bg="success" pill className="me-1">{p2Stats.goals} buts</Badge>
                        <Badge bg="info" pill>{p2Stats.assists} passes</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card.Body>
    </Card>
  );
};

// IMPORTANT: Définir MatchDetails après DuoNetwork, mais ne pas l'exporter avant sa définition
const MatchDetails = () => {
  const { teamA, teamB } = useParams();
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [duoCombinedGoals, setDuoCombinedGoals] = useState([]); // ✅ utilisé pour nombre de matchs ensemble
  const [selectedMatch, setSelectedMatch] = useState(null);

  useEffect(() => {
    const fetchMatchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.post("/api/head-to-head/details", {
          teamA: decodeURIComponent(teamA),
          teamB: decodeURIComponent(teamB)
        });
        const matches = res.data.matchDetails || [];

        const duoTotalMap = new Map(); // ✅ Pour compter le nombre de matchs ensemble
        const duoSeenPerMatch = new Set(); // éviter les doublons dans un match

        matches.forEach(match => {
          const scorers = match.scorers || [];
          const goalScorers = scorers.filter(p => p.goals > 0);

          const duoMap = new Map();

          for (let i = 0; i < goalScorers.length; i++) {
            for (let j = i + 1; j < goalScorers.length; j++) {
              const a = goalScorers[i];
              const b = goalScorers[j];
              const sameTeam = a.team === b.team;
              if (!sameTeam) continue;

              const key = [a.name, b.name].sort().join(" + ");
              const team = a.team;

              // ⚙️ Duos du match pour affichage
              const duo = {
                duo: key,
                goalsTogether: Math.min(a.goals, b.goals),
                team
              };
              if (!duoMap.has(key)) {
                duoMap.set(key, duo);
              } else {
                duoMap.get(key).goalsTogether += Math.min(a.goals, b.goals);
              }

              // ✅ Comptage : si ce duo n'a pas encore été compté pour ce match
              const matchKey = `${match.date}_${key}`;
              if (!duoSeenPerMatch.has(matchKey)) {
                duoSeenPerMatch.add(matchKey);
                if (!duoTotalMap.has(key)) {
                  duoTotalMap.set(key, {
                    duo: key,
                    totalGoals: 1, // ← ici, total = nombre de matchs ensemble
                    team
                  });
                } else {
                  duoTotalMap.get(key).totalGoals += 1;
                }
              }
            }
          }

          match.duos = Array.from(duoMap.values()).sort((a, b) => b.goalsTogether - a.goalsTogether);
        });

        setDuoCombinedGoals(Array.from(duoTotalMap.values()));
        setDetails(matches);
        
        // Sélectionner le premier match par défaut
        if (matches.length > 0) {
          setSelectedMatch(matches[0]);
        }
      } catch (err) {
        setError("Erreur lors de la récupération des détails des matchs.");
      } finally {
        setLoading(false);
      }
    };

    if (teamA && teamB) {
      fetchMatchDetails();
    }
  }, [teamA, teamB]);

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

  const getWinningTeam = (match) => {
    const scores = match.score.split('-').map(s => parseInt(s.trim()));
    if (scores[0] > scores[1]) {
      return match.homeTeam;
    } else if (scores[0] < scores[1]) {
      return match.awayTeam;
    }
    return null;
  };

  return (
    <Container fluid className="py-4 px-md-5 bg-light">
      <div className="bg-white rounded-3 shadow-sm p-4 mb-4">
        <h2 className="text-center mb-3 fw-bold text-primary">
          <FaTrophy className="me-2" />
          Détails des confrontations
        </h2>
        <h3 className="text-center mb-4">
          <span className="badge bg-primary me-2 px-3 py-2">{decodeURIComponent(teamA)}</span>
          <span className="text-muted mx-2">vs</span>
          <span className="badge bg-danger ms-2 px-3 py-2">{decodeURIComponent(teamB)}</span>
        </h3>
      </div>

      {loading && (
        <div className="text-center my-5 py-5">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted">Chargement des détails des matchs...</p>
        </div>
      )}

      {error && (
        <Alert variant="danger" className="text-center shadow-sm">
          <strong>{error}</strong>
        </Alert>
      )}

      {details.length > 0 && (
        <Row>
          {/* Liste des matchs sur la gauche */}
          <Col lg={3} className="mb-4">
            <Card className="shadow-sm border-0 sticky-top" style={{ top: '1rem' }}>
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0"><FaCalendarAlt className="me-2" /> Matchs</h5>
              </Card.Header>
              <ListGroup variant="flush">
                {details.map((match, idx) => {
                  const winningTeam = getWinningTeam(match);
                  const isMatchNul = winningTeam === null;
                  const isSelected = selectedMatch && selectedMatch.date === match.date && 
                                    selectedMatch.homeTeam === match.homeTeam;
                  
                  return (
                    <ListGroup.Item 
                      key={idx}
                      action
                      active={isSelected}
                      onClick={() => setSelectedMatch(match)}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <div className="fw-bold">{formatDate(match.date)}</div>
                        <small>
                          {match.score} {' '}
                          {isMatchNul ? 
                            <Badge bg="secondary" pill>Nul</Badge> : 
                            <Badge bg={winningTeam === decodeURIComponent(teamA) ? "primary" : "danger"} pill>
                              {winningTeam}
                            </Badge>
                          }
                        </small>
                      </div>
                      {match.duos.length > 0 && (
                        <Badge bg="warning" text="dark" pill>
                          <FaUserFriends /> {match.duos.length}
                        </Badge>
                      )}
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            </Card>
          </Col>

          {/* Détails du match sélectionné sur la droite */}
          <Col lg={9}>
            {selectedMatch ? (
              <Card className="shadow-sm border-0 rounded-3 mb-4 overflow-hidden">
                {(() => {
                  const winningTeam = getWinningTeam(selectedMatch);
                  const isMatchNul = winningTeam === null;
                  const headerBg = isMatchNul ? 'bg-secondary' : 
                                  (winningTeam === decodeURIComponent(teamA) ? 'bg-primary' : 'bg-danger');
                  
                  return (
                    <>
                      <Card.Header className={`py-3 ${headerBg} text-white`}>
                        <div className="d-flex justify-content-between align-items-center">
                          <h5 className="mb-0 fw-bold">
                            <FaCalendarAlt className="me-2" />
                            {formatDate(selectedMatch.date)}
                          </h5>
                          <div>
                            {isMatchNul ? (
                              <Badge bg="light" text="dark" className="px-3 py-2">Match nul</Badge>
                            ) : (
                              <Badge bg="light" text="dark" className="px-3 py-2">
                                <FaTrophy className="me-1 text-warning" />
                                {winningTeam}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Card.Header>

                      <Card.Body className="p-0">
                        <div className="match-header p-4 bg-light border-bottom">
                          <Row className="align-items-center text-center">
                            <Col xs={5} className={selectedMatch.homeTeam === decodeURIComponent(teamA) ? 'text-primary' : 'text-danger'}>
                              <h5 className="fw-bold">{selectedMatch.homeTeam}</h5>
                              <div className="text-muted small">
                                <FaMapMarkerAlt className="me-1" /> Domicile
                              </div>
                            </Col>
                            <Col xs={2}>
                              <div className="match-score py-2 px-3 rounded bg-dark text-white fw-bold fs-4">
                                {selectedMatch.score}
                              </div>
                            </Col>
                            <Col xs={5} className={selectedMatch.awayTeam === decodeURIComponent(teamA) ? 'text-primary' : 'text-danger'}>
                              <h5 className="fw-bold">{selectedMatch.awayTeam}</h5>
                              <div className="text-muted small">
                                <FaMapMarkerAlt className="me-1" /> Extérieur
                              </div>
                            </Col>
                          </Row>
                        </div>

                        <Row className="p-4 g-4">
                          <Col md={6}>
                            <div className="h-100 p-3 border rounded-3 bg-light">
                              <h5 className="border-bottom pb-2 mb-3">
                                <FaFutbol className="me-2 text-success" />
                                Buteurs & Passeurs
                              </h5>

                              <Table responsive hover className="align-middle">
                                <thead className="table-light">
                                  <tr>
                                    <th>Joueur</th>
                                    <th className="text-center">Buts</th>
                                    <th className="text-center">Passes</th>
                                    <th>Équipe</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedMatch.scorers.map((scorer, i) => (
                                    <tr key={i}>
                                      <td className="fw-bold">{scorer.name}</td>
                                      <td className="text-center">
                                        {scorer.goals > 0 && (
                                          <Badge bg="success" pill className="px-2">
                                            {scorer.goals}
                                          </Badge>
                                        )}
                                      </td>
                                      <td className="text-center">
                                        {scorer.assists > 0 && (
                                          <Badge bg="info" pill className="px-2">
                                            {scorer.assists}
                                          </Badge>
                                        )}
                                      </td>
                                      <td>
                                        <Badge
                                          bg={scorer.team === decodeURIComponent(teamA) ? "primary" : "danger"}
                                          className="opacity-75"
                                          pill
                                        >
                                          {scorer.team}
                                        </Badge>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            </div>
                          </Col>

                          <Col md={6}>
                            <div className="h-100 p-3 border rounded-3 bg-light">
                              <h5 className="border-bottom pb-2 mb-3">
                                <FaHandsHelping className="me-2 text-info" />
                                Duos qui marquent ensemble
                              </h5>

                              {selectedMatch.duos.length > 0 ? (
                                <div className="duos-container">
                                  {selectedMatch.duos.map((duo, j) => (
                                    <div 
                                      key={j} 
                                      className={`duo-item p-3 mb-2 ${j % 2 === 0 ? 'bg-white' : 'bg-light'} rounded`}
                                    >
                                      <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                          <div className="d-flex align-items-center mb-2">
                                            <FaUserFriends className="me-2 text-secondary" />
                                            <span className="fw-bold">{duo.duo}</span>
                                          </div>
                                          <Badge
                                            bg={duo.team === decodeURIComponent(teamA) ? "primary" : "danger"}
                                            className="opacity-75"
                                            pill
                                          >
                                            {duo.team || "-"}
                                          </Badge>
                                        </div>
                                        <div className="text-center">
                                          <Badge bg="warning" text="dark" className="p-2 d-flex align-items-center">
                                            <FaLightbulb className="me-2" />
                                            <span className="fs-5">{duo.goalsTogether}</span>
                                          </Badge>
                                          <div className="mt-1 small text-muted">buts ensemble</div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  
                                  {/* Visualisation du réseau de joueurs */}
                                  <DuoNetwork duos={selectedMatch.duos} scorers={selectedMatch.scorers} />
                                </div>
                              ) : (
                                <div className="text-center py-4">
                                  <div className="text-muted">
                                    <FaUserFriends className="mb-2" style={{ fontSize: '2rem', opacity: 0.3 }} />
                                    <p>Aucun duo de buteurs enregistré pour ce match</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </Col>
                        </Row>
                      </Card.Body>
                    </>
                  );
                })()}
              </Card>
            ) : (
              <Alert variant="info">
                Sélectionnez un match pour voir ses détails
              </Alert>
            )}
          </Col>
        </Row>
      )}

      {/* ✅ Carte : nombre de matchs où chaque duo a marqué ensemble */}
      {duoCombinedGoals.length > 0 && (
        <Card className="mt-4 shadow-sm border-0 rounded-3">
          <Card.Header className="bg-primary text-white py-3">
            <h5 className="mb-0">
              <FaChartLine className="me-2" />
              Duos les plus fréquents (nombre de matchs où ils ont marqué ensemble)
            </h5>
          </Card.Header>
          <Card.Body className="p-0">
            <Row className="p-3">
              {[...duoCombinedGoals]
                .sort((a, b) => b.totalGoals - a.totalGoals)
                .slice(0, 6)
                .map((duo, i) => (
                  <Col md={6} lg={4} key={i} className="mb-3">
                    <Card className={`h-100 ${i < 3 ? 'border-primary' : 'border-light'}`}>
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="mb-0 fw-bold">{duo.duo}</h6>
                          <Badge
                            bg={duo.team === decodeURIComponent(teamA) ? "primary" : "danger"}
                            pill
                          >
                            {duo.team}
                          </Badge>
                        </div>
                        <div className="mt-3 text-center">
                          <div className="display-4 fw-bold mb-0 text-primary">{duo.totalGoals}</div>
                          <div className="text-muted">match{duo.totalGoals !== 1 ? 's' : ''} ensemble</div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
            </Row>
            
            {duoCombinedGoals.length > 6 && (
              <div className="p-3">
                <h6 className="mb-3 text-muted">Autres duos</h6>
                <Table responsive hover className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Duo</th>
                      <th className="text-center">Matchs ensemble</th>
                      <th>Équipe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...duoCombinedGoals]
                      .sort((a, b) => b.totalGoals - a.totalGoals)
                      .slice(6)
                      .map((duo, i) => (
                        <tr key={i}>
                          <td className="fw-bold">{duo.duo}</td>
                          <td className="text-center">
                            <Badge bg="info" pill>{duo.totalGoals}</Badge>
                          </td>
                          <td>
                            <Badge
                              bg={duo.team === decodeURIComponent(teamA) ? "primary" : "danger"}
                              pill
                            >
                              {duo.team}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {details.length === 0 && !loading && !error && (
        <Alert variant="info" className="text-center shadow-sm">
          Aucun match trouvé entre ces deux équipes.
        </Alert>
      )}
    </Container>
  );
};

// Exporter ici, APRÈS la définition complète du composant
export default MatchDetails;
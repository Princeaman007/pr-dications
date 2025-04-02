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
  Table
} from "react-bootstrap";
import {
  FaUserFriends,
  FaCalendarAlt,
  FaUsers,
  FaTrophy,
  FaMapMarkerAlt,
  FaFutbol,
  FaHandsHelping
} from "react-icons/fa";

const MatchDetails = () => {
  const { teamA, teamB } = useParams();
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [duoCombinedGoals, setDuoCombinedGoals] = useState([]); // ✅ utilisé pour nombre de matchs ensemble

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

              // ✅ Comptage : si ce duo n’a pas encore été compté pour ce match
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
          🏆 Détails des confrontations
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
        <div className="match-details-container">
          {details.map((match, idx) => {
            const winningTeam = getWinningTeam(match);
            const isMatchNul = winningTeam === null;

            return (
              <Card key={idx} className="shadow-sm border-0 rounded-3 mb-4 overflow-hidden">
                <Card.Header className={`py-3 ${isMatchNul ? 'bg-secondary' : (winningTeam === decodeURIComponent(teamA) ? 'bg-primary' : 'bg-danger')} text-white`}>
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold">
                      <FaCalendarAlt className="me-2" />
                      {formatDate(match.date)}
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
                      <Col xs={5} className={match.homeTeam === decodeURIComponent(teamA) ? 'text-primary' : 'text-danger'}>
                        <h5 className="fw-bold">{match.homeTeam}</h5>
                        <div className="text-muted small">
                          <FaMapMarkerAlt className="me-1" /> Domicile
                        </div>
                      </Col>
                      <Col xs={2}>
                        <div className="match-score py-2 px-3 rounded bg-dark text-white fw-bold fs-4">
                          {match.score}
                        </div>
                      </Col>
                      <Col xs={5} className={match.awayTeam === decodeURIComponent(teamA) ? 'text-primary' : 'text-danger'}>
                        <h5 className="fw-bold">{match.awayTeam}</h5>
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
                            {match.scorers.map((scorer, i) => (
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

                        {match.duos.length > 0 ? (
                          <Table responsive hover className="align-middle">
                            <thead className="table-light">
                              <tr>
                                <th>Duo</th>
                                <th className="text-center">Buts marqués ensemble</th>
                                <th>Équipe</th>
                              </tr>
                            </thead>
                            <tbody>
                              {match.duos.map((duo, j) => (
                                <tr key={j}>
                                  <td>
                                    <div className="d-flex align-items-center">
                                      <FaUserFriends className="me-2 text-secondary" />
                                      <span className="fw-bold">{duo.duo}</span>
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    <Badge bg="danger" pill className="px-2">
                                      {duo.goalsTogether}
                                    </Badge>
                                  </td>
                                  <td>
                                    <Badge
                                      bg={duo.team === decodeURIComponent(teamA) ? "primary" : "danger"}
                                      className="opacity-75"
                                      pill
                                    >
                                      {duo.team || "-"}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
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
              </Card>
            );
          })}
          
        </div>
      )}

      {/* ✅ Carte : nombre de matchs où chaque duo a marqué ensemble */}
      {duoCombinedGoals.length > 0 && (
        <Card className="mt-4 shadow-sm border-0 rounded-3">
          <Card.Body>
            <h5 className="fw-bold text-secondary mb-4">
              <FaHandsHelping className="me-2 text-success" />
              Nombre de matchs où les duos ont marqué ensemble
            </h5>
            <Table responsive hover className="align-middle">
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

export default MatchDetails;

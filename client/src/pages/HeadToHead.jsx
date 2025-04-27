import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Spinner,
  Alert,
  Table,
  Badge,
} from "react-bootstrap";
import {
  FaSearch,
  FaSkating,
  FaUserFriends,
  FaChartBar,
  FaTrophy,
  FaEquals,
  FaArrowRight,
  FaHockeyPuck,
  FaFire,
  FaHandsHelping  // Ajoutez cette ligne
} from "react-icons/fa";

// Importer le nouveau composant DuoSynergy
import DuoSynergy from "../components/DuoSynergy";

const HeadToHead = () => {
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [teams, setTeams] = useState([]);

  const { teamA: paramTeamA, teamB: paramTeamB } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await axios.get("/api/teams");
        if (res.data && Array.isArray(res.data)) {
          const sortedTeams = [...res.data].sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: "base" })
          );
          setTeams(sortedTeams);
        } else {
          setError("Format de données des équipes invalide.");
        }
      } catch {
        setError("Impossible de charger la liste des équipes.");
      } finally {
        setInitialLoading(false);
      }
    };
    fetchTeams();
  }, []);

  useEffect(() => {
    if (paramTeamA && paramTeamB) {
      setTeamA(decodeURIComponent(paramTeamA));
      setTeamB(decodeURIComponent(paramTeamB));
    }
  }, [paramTeamA, paramTeamB]);

  useEffect(() => {
    if (teamA && teamB) {
      handleSubmit({ preventDefault: () => {} });
    }
  }, [teamA, teamB]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!teamA || !teamB) {
        setError("Veuillez sélectionner les deux équipes.");
        return;
      }

      if (teamA === teamB) {
        setError("Veuillez choisir deux équipes différentes.");
        return;
      }

      setLoading(true);
      setError(null);
      setData(null);

      try {
        const res = await axios.post("/api/head-to-head", { teamA, teamB });
        if (res.data) {
          setData(res.data);
        } else {
          setError("Aucune donnée reçue du serveur.");
        }
      } catch (err) {
        if (err.response) {
          switch (err.response.status) {
            case 400:
              setError("Requête invalide. Vérifiez les noms d'équipes.");
              break;
            case 404:
              setError(`Aucune confrontation trouvée entre ${teamA} et ${teamB}.`);
              break;
            default:
              setError(`Erreur serveur: ${err.response.status}`);
          }
        } else {
          setError("Erreur réseau ou serveur non joignable.");
        }
      } finally {
        setLoading(false);
      }
    },
    [teamA, teamB]
  );

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString("fr-FR");
    } catch {
      return dateString;
    }
  };

  // Adapter les duos au format attendu par le composant DuoSynergy
  const formatDuosForComponent = (duos) => {
    if (!duos || !Array.isArray(duos)) return [];
    
    return duos.map(duo => ({
      pair: duo.duo.split(' + '),
      matchesTogether: duo.matches || 0,
      goalsTogether: duo.goalsTogether || 0,
      score: duo.goalsTogether * 1.5 + duo.matches,
      team: "unknown" // À déterminer dynamiquement si possible
    }));
  };

  return (
    <Container className="my-5 px-4">
      <h2 className="text-center mb-5 display-5 fw-bold text-primary">
        <FaHockeyPuck className="me-3" />
        Analyse de Confrontation
      </h2>

      <Card className="mb-4 shadow-sm border-0">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row className="align-items-end">
              <Col md={5}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Equipe A</Form.Label>
                  <Form.Select
                    value={teamA}
                    onChange={(e) => setTeamA(e.target.value)}
                    disabled={initialLoading}
                  >
                    <option value="">Choisissez l'équipe A</option>
                    {teams.map((team, idx) => (
                      <option key={`teamA-${idx}`} value={team}>
                        {team}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={5}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Equipe B</Form.Label>
                  <Form.Select
                    value={teamB}
                    onChange={(e) => setTeamB(e.target.value)}
                    disabled={initialLoading}
                  >
                    <option value="">Choisissez l'équipe B</option>
                    {teams.map((team, idx) => (
                      <option key={`teamB-${idx}`} value={team}>
                        {team}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Button
                  type="submit"
                  className="w-100 btn btn-outline-primary fw-semibold"
                  disabled={!teamA || !teamB || teamA === teamB || loading}
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Chargement...
                    </>
                  ) : (
                    <>
                      <FaSearch className="me-1" /> Comparer
                    </>
                  )}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {error && (
        <Alert variant="danger" className="text-center">
          {error}
        </Alert>
      )}

      {loading && !data && (
        <div className="text-center my-5">
          <Spinner animation="border" />
          <p className="mt-3 text-muted">Chargement des données...</p>
        </div>
      )}

      {data && (
        <>
          {/* Statistiques globales */}
          <Card className="mb-4 shadow-sm border-0 hover-card">
            <Card.Body>
              <Card.Title className="text-center fs-4 mb-4 text-uppercase text-primary">
                <FaChartBar className="me-2" /> Statistiques Globales
              </Card.Title>
              <Row className="text-center">
                <Col md={4} className="mb-3 mb-md-0">
                  <div className="p-3 rounded h-100" style={{ background: 'rgba(13, 110, 253, 0.1)' }}>
                    <h5 className="fw-bold text-primary">{data.stats.teamA}</h5>
                    <div className="d-flex justify-content-center gap-3 mt-3">
                      <div>
                        <Badge bg="primary" className="p-2">
                          <FaTrophy className="me-1" /> {data.stats.teamAWins}
                        </Badge>
                        <div className="mt-1 small text-muted">Victoire{data.stats.teamAWins !== 1 ? 's' : ''}</div>
                      </div>
                      <div>
                        <Badge bg="primary" className="p-2">
                          <FaHockeyPuck className="me-1" /> {data.stats.teamAGoals}
                        </Badge>
                        <div className="mt-1 small text-muted">But{data.stats.teamAGoals !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  </div>
                </Col>
                <Col md={4} className="mb-3 mb-md-0">
                  <div className="p-3 rounded h-100" style={{ background: 'rgba(108, 117, 125, 0.1)' }}>
                    <h5 className="fw-bold text-secondary">Statistiques</h5>
                    <div className="d-flex justify-content-center gap-3 mt-3">
                      <div>
                        <Badge bg="secondary" className="p-2">
                          <FaEquals className="me-1" /> {data.stats.draws}
                        </Badge>
                        <div className="mt-1 small text-muted">Match{data.stats.draws !== 1 ? 's' : ''} nul{data.stats.draws !== 1 ? 's' : ''}</div>
                      </div>
                      <div>
                        <Badge bg="secondary" className="p-2">
                          {data.stats.avgGoalsPerMatch}
                        </Badge>
                        <div className="mt-1 small text-muted">Buts/match</div>
                      </div>
                    </div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="p-3 rounded h-100" style={{ background: 'rgba(220, 53, 69, 0.1)' }}>
                    <h5 className="fw-bold text-danger">{data.stats.teamB}</h5>
                    <div className="d-flex justify-content-center gap-3 mt-3">
                      <div>
                        <Badge bg="danger" className="p-2">
                          <FaTrophy className="me-1" /> {data.stats.teamBWins}
                        </Badge>
                        <div className="mt-1 small text-muted">Victoire{data.stats.teamBWins !== 1 ? 's' : ''}</div>
                      </div>
                      <div>
                        <Badge bg="danger" className="p-2">
                          <FaHockeyPuck className="me-1" /> {data.stats.teamBGoals}
                        </Badge>
                        <div className="mt-1 small text-muted">But{data.stats.teamBGoals !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Historique des confrontations */}
          <Card className="mb-4 shadow-sm border-0 hover-card">
            <Card.Header className="bg-white fw-bold text-primary">
              <FaChartBar className="me-2" /> Historique des confrontations
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover borderless striped size="sm" className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Affiche</th>
                    <th>Score</th>
                    <th>Résultat</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((match, idx) => {
                    const isDraw =
                      match.result !== data.stats.teamA &&
                      match.result !== data.stats.teamB;

                    return (
                      <tr key={idx}>
                        <td>{formatDate(match.date)}</td>
                        <td>
                          <span className={match.awayTeam === data.stats.teamA ? 'text-primary fw-bold' : 
                                         match.awayTeam === data.stats.teamB ? 'text-danger fw-bold' : ''}>
                            {match.awayTeam}
                          </span>
                          <span className="mx-2">@</span>
                          <span className={match.homeTeam === data.stats.teamA ? 'text-primary fw-bold' : 
                                         match.homeTeam === data.stats.teamB ? 'text-danger fw-bold' : ''}>
                            {match.homeTeam}
                          </span>
                        </td>
                        <td>{match.score}</td>
                        <td>
                          <Badge
                            bg={
                              isDraw
                                ? "secondary"
                                : match.result === data.stats.teamA
                                ? "primary"
                                : "danger"
                            }
                            className="px-3 py-2 rounded-pill text-uppercase fw-semibold"
                          >
                            {isDraw ? (
                              <><FaEquals className="me-1" /> Nul</>
                            ) : (
                              <><FaTrophy className="me-1" /> {match.result}</>
                            )}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {/* Top buteurs et duos */}
          <Row className="mt-4">
            <Col md={6}>
              <Card className="shadow-sm border-0 h-100 hover-card mb-4 mb-md-0">
                <Card.Header className="bg-gradient bg-primary text-white py-3">
                  <h5 className="mb-0 d-flex align-items-center">
                    <FaSkating className="me-2" /> Top buteurs
                  </h5>
                </Card.Header>
                <Card.Body className="p-0">
                  <div className="p-3">
                    {data.topScorers.slice(0, 5).map((scorer, i) => (
                      <div key={i} className={`p-3 d-flex align-items-center ${i % 2 === 0 ? 'bg-light rounded' : ''}`}>
                        <Badge 
                          bg={i < 3 ? 'primary' : 'secondary'} 
                          className="rounded-circle d-flex align-items-center justify-content-center me-3"
                          style={{ width: '32px', height: '32px' }}
                        >
                          {i + 1}
                        </Badge>
                        <div className="flex-grow-1">
                          <div className="fw-bold">{scorer.name}</div>
                          <div className="small text-muted">
                            {scorer.matches} match{scorer.matches !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="d-flex align-items-center">
                          <Badge bg="success" className="px-2 py-1 me-2">
                            <FaHockeyPuck className="me-1" /> {scorer.goals}
                          </Badge>
                          <Badge bg="info" className="px-2 py-1">
                            <FaHandsHelping className="me-1" /> {scorer.assists}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              {/* Utiliser le composant DuoSynergy pour afficher les duos */}
              <DuoSynergy 
                duos={formatDuosForComponent(data.topDuos)} 
                title="Duos Efficaces"
                teamA={data.stats.teamA}
                teamB={data.stats.teamB}
              />
            </Col>
          </Row>

          {/* 🔗 Bouton vers les détails complets */}
          <div className="text-center mt-5">
            <Button
              variant="outline-primary"
              className="fw-bold px-4 py-2 rounded-pill"
              onClick={() =>
                navigate(`/head-to-head/details/${encodeURIComponent(teamA)}/${encodeURIComponent(teamB)}`)
              }
            >
              Voir tous les détails par match <FaArrowRight className="ms-2" />
            </Button>
          </div>
        </>
      )}
      <style jsx="true">{`
        .hover-card {
          transition: all 0.2s ease;
        }
        .hover-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1) !important;
        }
      `}</style>
    </Container>
  );
};

export default HeadToHead;
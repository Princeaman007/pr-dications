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
  FaArrowRight
} from "react-icons/fa";

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

  return (
    <Container className="my-5 px-4">
      <h2 className="text-center mb-5 display-5 fw-bold text-primary">
        🎔️ Analyse de Confrontation
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
          <Card className="mb-4 shadow-sm border-0">
            <Card.Body>
              <Card.Title className="text-center fs-4 mb-4 text-uppercase text-primary">
                <FaChartBar className="me-2" /> Statistiques Globales
              </Card.Title>
              <Row className="text-center">
                <Col>
                  <h5 className="fw-bold">{data.stats.teamA}</h5>
                  <p className="text-muted small">
                    {data.stats.teamAWins} victoire(s), {data.stats.teamAGoals} but(s)
                  </p>
                </Col>
                <Col>
                  <h5 className="fw-bold text-secondary">Égalité</h5>
                  <p className="text-muted small">
                    {data.stats.draws} nul(s), {data.stats.avgGoalsPerMatch} buts/match
                  </p>
                </Col>
                <Col>
                  <h5 className="fw-bold">{data.stats.teamB}</h5>
                  <p className="text-muted small">
                    {data.stats.teamBWins} victoire(s), {data.stats.teamBGoals} but(s)
                  </p>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Historique des confrontations */}
          <Card className="mb-4 shadow-sm border-0">
            <Card.Header className="bg-white fw-bold text-primary">
              <FaChartBar className="me-2" /> Historique des confrontations
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover borderless striped size="sm" className="align-middle">
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
                        <td>{match.awayTeam} @ {match.homeTeam}</td>
                        <td>{match.score}</td>
                        <td>
                          <Badge
                            bg={
                              isDraw
                                ? "secondary"
                                : match.result === data.stats.teamA
                                ? "success"
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
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <Card.Title>
                    <FaSkating className="me-2" /> Top buteurs
                  </Card.Title>
                  <ul className="list-unstyled mb-0">
                    {data.topScorers.map((s, i) => (
                      <li key={i} className="mb-2">
                        <span className="fw-semibold">{s.name}</span>{" "}
                        <small className="text-muted">— {s.goals} ⚽, {s.assists} 🎯</small>
                      </li>
                    ))}
                  </ul>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <Card.Title>
                    <FaUserFriends className="me-2" /> Duos efficaces
                  </Card.Title>
                  <ul className="list-unstyled mb-0">
                    {data.topDuos.map((d, i) => (
                      <li key={i} className="mb-2">
                        <span className="fw-semibold">{d.duo}</span>{" "}
                        <small className="text-muted">
                          — {d.goalsTogether} buts en {d.matches} match(s)
                        </small>
                      </li>
                    ))}
                  </ul>
                </Card.Body>
              </Card>
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
    </Container>
  );
};

export default HeadToHead;
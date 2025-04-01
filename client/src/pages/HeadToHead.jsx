import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
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

  // 🔁 Chargement des équipes
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
      } catch (err) {
        console.error("Erreur chargement équipes:", err);
        setError("Impossible de charger la liste des équipes.");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchTeams();
  }, []);

  // ⚙️ Met à jour les équipes depuis les paramètres URL
  useEffect(() => {
    if (paramTeamA && paramTeamB) {
      setTeamA(decodeURIComponent(paramTeamA));
      setTeamB(decodeURIComponent(paramTeamB));
    }
  }, [paramTeamA, paramTeamB]);

  // 📡 Lancement auto de la requête une fois les deux équipes définies
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
        console.error("Erreur confrontation:", err);
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
    <Container className="my-5">
      <h2 className="text-center mb-4">⚔️ Analyse de Confrontation</h2>

      <Form onSubmit={handleSubmit} className="mb-4">
        <Row className="align-items-end">
          <Col md={5}>
            <Form.Label>Équipe A</Form.Label>
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
          </Col>
          <Col md={5}>
            <Form.Label>Équipe B</Form.Label>
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
          </Col>
          <Col md={2}>
            <Button
              type="submit"
              className="w-100"
              disabled={!teamA || !teamB || teamA === teamB || loading}
            >
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    className="me-2"
                  />
                  Chargement...
                </>
              ) : (
                <>
                  <FaSearch className="me-1" />
                  Comparer
                </>
              )}
            </Button>
          </Col>
        </Row>
      </Form>

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
          <Card className="mb-4 shadow-sm">
            <Card.Body>
              <Card.Title>
                <FaChartBar className="me-2" />
                Statistiques Globales
              </Card.Title>
              <Row className="text-center">
                <Col>
                  <h5>{data.stats.teamA}</h5>
                  <p>
                    {data.stats.teamAWins} victoire(s), {data.stats.teamAGoals} but(s)
                  </p>
                </Col>
                <Col>
                  <h5>Égalité</h5>
                  <p>
                    {data.stats.draws} nul(s), {data.stats.avgGoalsPerMatch} buts/match
                  </p>
                </Col>
                <Col>
                  <h5>{data.stats.teamB}</h5>
                  <p>
                    {data.stats.teamBWins} victoire(s), {data.stats.teamBGoals} but(s)
                  </p>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Historique des matchs */}
          <Card className="mb-4 shadow-sm">
            <Card.Header>
              <FaChartBar className="me-2" />
              Historique des confrontations
            </Card.Header>
            <Card.Body className="p-0">
              <Table striped responsive>
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
                          {match.awayTeam} @ {match.homeTeam}
                        </td>
                        <td>{match.score}</td>
                        <td>
                          {isDraw ? (
                            <Badge bg="secondary">
                              <FaEquals className="me-1" />
                              Nul
                            </Badge>
                          ) : (
                            <Badge
                              bg={
                                match.result === data.stats.teamA
                                  ? "primary"
                                  : "danger"
                              }
                            >
                              <FaTrophy className="me-1" />
                              {match.result}
                            </Badge>
                          )}
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
              <Card className="shadow-sm">
                <Card.Body>
                  <Card.Title>
                    <FaSkating className="me-2" />
                    Top buteurs
                  </Card.Title>
                  <ul>
                    {data.topScorers.map((s, i) => (
                      <li key={i}>
                        <strong>{s.name}</strong> — {s.goals} buts, {s.assists} passes
                      </li>
                    ))}
                  </ul>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="shadow-sm">
                <Card.Body>
                  <Card.Title>
                    <FaUserFriends className="me-2" />
                    Duos efficaces
                  </Card.Title>
                  <ul>
                    {data.topDuos.map((d, i) => (
                      <li key={i}>
                        <strong>{d.duo}</strong> — {d.goalsTogether} buts en {d.matches} match(s)
                      </li>
                    ))}
                  </ul>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
};

export default HeadToHead;

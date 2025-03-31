import React, { useState } from "react";
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
} from "react-bootstrap";
import { FaSearch, FaSkating, FaUserFriends, FaChartBar } from "react-icons/fa";

const HeadToHead = () => {
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teamA || !teamB || teamA === teamB) {
      setError("Veuillez choisir deux équipes différentes.");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await axios.post("/api/head-to-head", { teamA, teamB });
      setData(res.data);
    } catch (err) {
      setError("Impossible de récupérer les données de confrontation.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const allTeams = [
    "Colorado Avalanche",
    "Dallas Stars",
    "Minnesota Wild",
    "Calgary Flames",
    "Philadelphia Flyers",
    "Seattle Kraken",
    "Nashville Predators",
    "New Jersey Devils",
    // ajoute les autres équipes ici...
  ];

  return (
    <Container className="my-5">
      <h2 className="mb-4">⚔️ Confrontation entre deux équipes</h2>

      <Form onSubmit={handleSubmit} className="mb-4">
        <Row className="align-items-end">
          <Col md={5}>
            <Form.Label>Équipe A</Form.Label>
            <Form.Select value={teamA} onChange={(e) => setTeamA(e.target.value)}>
              <option value="">Choisissez l'équipe A</option>
              {allTeams.map((team, idx) => (
                <option key={idx} value={team}>
                  {team}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={5}>
            <Form.Label>Équipe B</Form.Label>
            <Form.Select value={teamB} onChange={(e) => setTeamB(e.target.value)}>
              <option value="">Choisissez l'équipe B</option>
              {allTeams.map((team, idx) => (
                <option key={idx} value={team}>
                  {team}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={2}>
            <Button type="submit" className="w-100">
              <FaSearch className="me-1" /> Comparer
            </Button>
          </Col>
        </Row>
      </Form>

      {loading && (
        <div className="text-center my-5">
          <Spinner animation="border" />
          <p>Chargement des données...</p>
        </div>
      )}

      {error && (
        <Alert variant="danger" className="text-center">
          {error}
        </Alert>
      )}

      {data && (
        <>
          <Card className="mb-4 shadow-sm">
            <Card.Body>
              <Card.Title>
                <FaChartBar className="me-2" />
                Statistiques Globales
              </Card.Title>
              <Row>
                <Col><strong>{data.stats.teamA} :</strong> {data.stats.teamAWins} victoires</Col>
                <Col><strong>{data.stats.teamB} :</strong> {data.stats.teamBWins} victoires</Col>
                <Col><strong>Matchs nuls :</strong> {data.stats.draws}</Col>
                <Col><strong>Moyenne de buts :</strong> {data.stats.avgGoalsPerMatch}</Col>
              </Row>
            </Card.Body>
          </Card>

          <h5 className="text-primary mb-3">📆 Historique des matchs</h5>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Date</th>
                <th>Match</th>
                <th>Score</th>
                <th>Résultat</th>
              </tr>
            </thead>
            <tbody>
              {data.history.map((m, idx) => (
                <tr key={idx}>
                  <td>{new Date(m.date).toLocaleDateString("fr-FR")}</td>
                  <td>{m.awayTeam} @ {m.homeTeam}</td>
                  <td>{m.score}</td>
                  <td><strong>{m.result}</strong></td>
                </tr>
              ))}
            </tbody>
          </Table>

          <Row className="mt-4">
            <Col md={6}>
              <Card className="mb-4 shadow-sm">
                <Card.Body>
                  <Card.Title>
                    <FaSkating className="me-2" />
                    Top buteurs
                  </Card.Title>
                  <ul className="ps-3 mb-0">
                    {data.topScorers.map((s, idx) => (
                      <li key={idx}>
                        {s.name} — {s.goals} buts, {s.assists} passes en {s.matches} matchs
                      </li>
                    ))}
                  </ul>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="mb-4 shadow-sm">
                <Card.Body>
                  <Card.Title>
                    <FaUserFriends className="me-2" />
                    Duos efficaces
                  </Card.Title>
                  <ul className="ps-3 mb-0">
                    {data.topDuos.map((d, idx) => (
                      <li key={idx}>
                        {d.duo} — {d.goalsTogether} buts (en {d.matches} matchs)
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

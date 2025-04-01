import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Badge,
  Tab,
  Nav,
  Button
} from "react-bootstrap";
import {
  FaClock,
  FaSkating,
  FaExclamationTriangle,
  FaCalendarAlt
} from "react-icons/fa";

const CACHE_KEY = "upcoming_predictions_cache";
const CACHE_TIME_KEY = "upcoming_predictions_cache_time";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const UpcomingPredictions = () => {
  const [gamesByDate, setGamesByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true);
      setError(null);

      const cached = localStorage.getItem(CACHE_KEY);
      const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
      const now = Date.now();

      if (cached && cachedTime && now - parseInt(cachedTime, 10) < CACHE_TTL) {
        setGamesByDate(JSON.parse(cached));
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get("/api/upcoming-predictions");
        if (res.data && typeof res.data === "object") {
          setGamesByDate(res.data);
          localStorage.setItem(CACHE_KEY, JSON.stringify(res.data));
          localStorage.setItem(CACHE_TIME_KEY, now.toString());
        } else {
          setError("Format de données invalide reçu du serveur.");
        }
      } catch (err) {
        console.error("Erreur de récupération des prédictions:", err);
        if (err.response) {
          setError(`Erreur serveur: ${err.response.status}`);
        } else if (err.request) {
          setError("Pas de réponse du serveur.");
        } else {
          setError(`Erreur: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, []);

  const sortedDates = useMemo(() => {
    if (!gamesByDate) return [];
    return Object.keys(gamesByDate).sort((a, b) => {
      const [dA, mA, yA] = a.split("/").map(Number);
      const [dB, mB, yB] = b.split("/").map(Number);
      return new Date(`${yA}-${mA}-${dA}`) - new Date(`${yB}-${mB}-${dB}`);
    });
  }, [gamesByDate]);

  const formatDate = (str) => {
    try {
      const [d, m, y] = str.split("/");
      return new Date(`${y}-${m}-${d}`).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long"
      });
    } catch {
      return str;
    }
  };

  if (loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" />
        <p className="mt-3">Chargement des prédictions...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="my-5">
        <Alert variant="danger" className="text-center">
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
      </Container>
    );
  }

  if (sortedDates.length === 0) {
    return (
      <Container className="my-5">
        <Alert variant="info" className="text-center">
          <FaCalendarAlt className="me-2" />
          Aucun match à venir.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="my-5">
      <h2 className="text-center mb-4">🔮 Prédictions des matchs à venir</h2>

      <Tab.Container defaultActiveKey={sortedDates[0]}>
        <Nav variant="tabs" className="mb-4 flex-nowrap overflow-auto">
          {sortedDates.map((date) => (
            <Nav.Item key={date}>
              <Nav.Link eventKey={date} className="px-3">
                <FaCalendarAlt className="me-1" />
                {formatDate(date)}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>

        <Tab.Content>
          {sortedDates.map((date) => (
            <Tab.Pane key={date} eventKey={date}>
              <Row>
                {gamesByDate[date].map((game, i) => (
                  <Col key={i} md={6} lg={4} className="mb-4">
                    <Card className="h-100 shadow-sm border-0">
                      <Card.Header className="text-center">
                        <Badge bg="light" text="dark">{game.away}</Badge> @
                        <Badge bg="light" text="dark">{game.home}</Badge>
                        <div className="mt-2 text-muted">
                          <FaClock className="me-1" />
                          {game.time || "TBD"}
                        </div>
                      </Card.Header>
                      <Card.Body className="d-flex flex-column">
                        {game.prediction ? (
                          <>
                            <div className="text-center mb-3">
                              <strong>Score estimé:</strong>
                              <div>
                                {game.prediction.teamAGoals} - {game.prediction.teamBGoals}
                              </div>
                            </div>
                            {game.prediction.sortedScorers?.length > 0 && (
                              <div className="mt-3">
                                <h6>
                                  <FaSkating className="me-2 text-info" /> Buteurs clés:
                                </h6>
                                <ul className="mb-0">
                                  {game.prediction.sortedScorers.slice(0, 2).map((p, idx) => (
                                    <li key={idx}>
                                      {p.name} - {p.goals} buts, {p.assists} passes
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div className="mt-auto pt-3">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="w-100"
                                onClick={() =>
                                  navigate(
                                    `/head-to-head/${encodeURIComponent(game.home)}/${encodeURIComponent(game.away)}`
                                  )
                                }
                              >
                                Voir la confrontation
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="text-danger text-center">
                            <FaExclamationTriangle className="me-2" />
                            Aucune prédiction disponible.
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Tab.Pane>
          ))}
        </Tab.Content>
      </Tab.Container>
    </Container>
  );
};

export default UpcomingPredictions;
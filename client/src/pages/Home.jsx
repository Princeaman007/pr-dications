import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Spinner, Alert, Badge, Button } from "react-bootstrap";
import { FaClock, FaExclamationTriangle, FaCalendarAlt, FaArrowRight } from "react-icons/fa";

const CACHE_KEY = "upcoming_matches";
const CACHE_TIME_KEY = "upcoming_matches_timestamp";
const CACHE_TTL_MS = 30 * 60 * 1000; //  30 minutes

const Home = () => {
  const [gamesByDate, setGamesByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);
      setError("");

      const cached = localStorage.getItem(CACHE_KEY);
      const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
      const now = Date.now();

      if (cached && cachedTime && now - parseInt(cachedTime) < CACHE_TTL_MS) {
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
        console.error("Erreur API:", err);
        setError("Impossible de charger les matchs.");
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  const sortedDates = useMemo(() => {
    return Object.keys(gamesByDate).sort((a, b) => {
      const [dayA, monthA, yearA] = a.split("/").map(Number);
      const [dayB, monthB, yearB] = b.split("/").map(Number);
      return new Date(`${yearA}-${monthA}-${dayA}`) - new Date(`${yearB}-${monthB}-${dayB}`);
    });
  }, [gamesByDate]);

  const formatDate = (dateString) => {
    try {
      const [day, month, year] = dateString.split("/");
      const date = new Date(`${year}-${month}-${day}`);
      const options = { weekday: "long", day: "numeric", month: "long" };
      return date.toLocaleDateString("fr-FR", options);
    } catch {
      return dateString;
    }
  };

  const goToConfrontation = (teamA, teamB) => {
    navigate(`/head-to-head/${encodeURIComponent(teamA)}/${encodeURIComponent(teamB)}`);
  };

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center my-5" style={{ minHeight: "300px" }}>
        <Spinner animation="border" role="status" />
        <span className="mt-3 text-muted">Chargement des matchs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Container className="my-5">
        <Alert variant="danger" className="text-center shadow-sm">
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
      </Container>
    );
  }

  if (sortedDates.length === 0) {
    return (
      <Container className="my-5">
        <Alert variant="info" className="text-center shadow-sm">
          <FaCalendarAlt className="me-2" />
          Aucun match à venir pour le moment.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="my-5">
      <div className="text-center mb-5">
        <h1 className="fw-bold display-5 mb-3 text-primary">📅 Matchs à venir</h1>
        <p className="text-muted fs-5">Restez à jour sur les prochaines confrontations</p>
      </div>

      {sortedDates.map((date) => (
        <div key={date} className="mb-5">
          <h4 className="text-uppercase text-secondary fw-bold mb-4 border-start border-4 ps-3">
            <FaCalendarAlt className="me-2 text-primary" />
            {formatDate(date)}
          </h4>

          <Row className="g-4">
            {Array.isArray(gamesByDate[date]) ? (
              gamesByDate[date].map((game, i) => (
                <Col md={6} lg={4} key={`game-${date}-${i}`}>
                  <Card className="h-100 shadow-sm border-0 game-card hover-transition">
                    <Card.Body className="text-center p-4">
                      <div className="mb-3">
                        <FaClock className="me-2 text-primary" />
                        <strong>{game.time || "Horaire à confirmer"}</strong>
                      </div>
                      <div className="fs-5 fw-semibold mb-3">
                        <Badge bg="light" text="dark" className="me-2 px-3 py-2">
                          {game.away}
                        </Badge>
                        <span className="text-muted">@</span>
                        <Badge bg="light" text="dark" className="ms-2 px-3 py-2">
                          {game.home}
                        </Badge>
                      </div>
                      <Button 
                        variant="outline-primary" 
                        className="rounded-pill mt-2"
                        onClick={() => goToConfrontation(game.home, game.away)}
                      >
                        Voir confrontation <FaArrowRight className="ms-2" />
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              ))
            ) : (
              <Col xs={12}>
                <Alert variant="warning">
                  <FaExclamationTriangle className="me-2" />
                  Format de données invalide pour la date {date}
                </Alert>
              </Col>
            )}
          </Row>
        </div>
      ))}

      <style jsx="true">{`
        .game-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          border-radius: 12px;
        }

        .game-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </Container>
  );
};

export default Home;
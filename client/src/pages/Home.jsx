import React, { useEffect, useState } from "react";
import axios from "axios";
import { Container, Row, Col, Card, Spinner, Alert, Badge } from "react-bootstrap";
import { FaClock, FaSkating, FaChartBar, FaUserFriends } from "react-icons/fa";

const Home = () => {
  const [gamesByDate, setGamesByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await axios.get("/api/upcoming-predictions");
        setGamesByDate(res.data || {});
      } catch (err) {
        console.error(err);
        setError("Impossible de charger les prédictions.");
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center my-5">
        <Spinner animation="border" role="status" />
        <span className="mt-3">Chargement des prédictions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Container className="my-5">
        <Alert variant="danger" className="text-center">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container className="my-5">
      <h2 className="text-center mb-4">🔮 Matchs à venir & Prédictions</h2>

      {Object.keys(gamesByDate).map((date) => (
        <div key={date} className="mb-5">
          <h5 className="text-primary fw-bold mb-3 text-center">📅 {date}</h5>
          <Row className="g-4 justify-content-center">
            {gamesByDate[date].map((game, i) => (
              <Col md={6} lg={4} key={i}>
                <Card className="h-100 shadow border-0">
                  <Card.Body>
                    <Card.Title className="text-center">
                      <FaClock className="me-2" />
                      {game.time} — {game.away} @ {game.home}
                    </Card.Title>

                    <hr />

                    <div className="text-center mb-2">
                      <FaChartBar className="me-2 text-secondary" />
                      <strong>Score estimé :</strong><br />
                      <Badge bg="light" text="dark" className="mt-1">
                        {game.home} {game.prediction.teamAGoals} - {game.prediction.teamBGoals} {game.away}
                      </Badge>
                    </div>

                    {game.prediction.sortedScorers?.length > 0 && (
                      <div className="mt-3">
                        <h6 className="fw-semibold">🔝 Buteurs à surveiller :</h6>
                        <ul className="ps-3 mb-2">
                          {game.prediction.sortedScorers.map((p, idx) => (
                            <li key={idx}>
                              <FaSkating className="me-1 text-info" />
                              {p.name} — {p.goals} G, {p.assists} A ({p.efficiency?.toFixed(2)} but/match)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {game.prediction.topSynergy?.length > 0 && (
                      <div className="mt-3 text-success text-center">
                        <FaUserFriends className="me-1" />
                        <strong>Duo :</strong> {game.prediction.topSynergy[0].pair.join(" + ")}<br />
                        <small>({game.prediction.topSynergy[0].matchesTogether} matchs ensemble)</small>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      ))}
    </Container>
  );
};

export default Home;

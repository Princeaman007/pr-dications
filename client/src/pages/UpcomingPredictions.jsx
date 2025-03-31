import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
} from "react-bootstrap";
import {
  FaClock,
  FaChartBar,
  FaUserFriends,
  FaSkating,
  FaExclamationTriangle,
} from "react-icons/fa";

const UpcomingPredictions = () => {
  const [gamesByDate, setGamesByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const res = await axios.get("/api/upcoming-predictions");
        setGamesByDate(res.data || {});
      } catch (err) {
        console.error("Erreur de récupération des prédictions :", err);
        setError("Impossible de charger les prédictions.");
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, []);

  if (loading) {
    return (
      <Container className="d-flex flex-column justify-content-center align-items-center my-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Chargement des prédictions en cours...</p>
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

  if (Object.keys(gamesByDate).length === 0) {
    return (
      <Container className="my-5">
        <Alert variant="info" className="text-center">
          Aucun match à venir pour le moment.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="my-5" style={{ maxWidth: "1200px" }}>
      <h2 className="text-center mb-5">🔮 Prédictions des matchs à venir</h2>

      {Object.keys(gamesByDate).sort().map((date) => (
        <div key={date} className="mb-5">
          <h4 className="text-center text-primary mb-4">📅 {date}</h4>

          <Row className="justify-content-center">
            {gamesByDate[date].map((game, i) => (
              <Col
                key={i}
                xs={12}
                sm={10}
                md={6}
                lg={4}
                className="d-flex align-items-stretch mb-4"
              >
                <Card className="shadow-lg w-100 border-0">
                  <Card.Body className="d-flex flex-column">
                    <Card.Title className="mb-3 text-dark">
                      <FaClock className="me-2 text-secondary" />
                      <strong>{game.time}</strong> — {game.away} @ {game.home}
                    </Card.Title>

                    {game.prediction ? (
                      <>
                        <div className="text-muted mb-2">
                          {game.prediction.source === "individual" ? (
                            <>
                              <FaChartBar className="me-1" />
                              Basé sur forme récente ({game.prediction.matchCount} matchs) :
                              <br />
                              {game.home} {game.prediction.teamAGoals} - {game.prediction.teamBGoals} {game.away}
                            </>
                          ) : (
                            <>
                              <FaChartBar className="me-1" />
                              Historique direct ({game.prediction.matchCount} matchs) :
                              <br />
                              {game.home} {game.prediction.teamAGoals} - {game.prediction.teamBGoals} {game.away}
                            </>
                          )}
                        </div>

                        {game.prediction.sortedScorers?.length > 0 ? (
                          <>
                            <strong className="d-block mb-2">🎯 Buteurs probables :</strong>
                            <ul className="ps-3 mb-2">
                              {game.prediction.sortedScorers.map((p, idx) => (
                                <li key={idx} className="mb-1">
                                  <FaSkating className="me-1 text-info" />
                                  <strong>{p.name}</strong> — {p.goals} buts, {p.assists} passes ({p.efficiency?.toFixed(2)} but/match)
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : (
                          <div className="text-warning">
                            <FaExclamationTriangle className="me-1" />
                            Aucun buteur identifié
                          </div>
                        )}

                        {game.prediction.topSynergy?.length > 0 && (
                          <div className="mt-auto pt-2 text-success">
                            <FaUserFriends className="me-1" />
                            Duo :{" "}
                            <strong>
                              {game.prediction.topSynergy[0].pair.join(" + ")}
                            </strong>{" "}
                            — {game.prediction.topSynergy[0].matchesTogether} matchs ensemble
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-danger mt-auto">
                        <FaExclamationTriangle className="me-1" />
                        Aucune donnée historique disponible
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

export default UpcomingPredictions;

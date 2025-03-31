// src/components/MatchCard.jsx
import { Card } from "react-bootstrap";
import { FaClock, FaSkating, FaUserFriends, FaBolt } from "react-icons/fa";

const MatchCard = ({ game }) => {
  const { home, away, time, prediction } = game;

  return (
    <Card className="shadow-sm h-100 border-0">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="fw-bold">
            🏒 {away} @ {home}
          </h5>
          <span className="text-muted">
            <FaClock className="me-1" />
            {time}
          </span>
        </div>

        {prediction ? (
          <>
            <div className="mb-2">
              <FaBolt className="text-warning me-2" />
              <strong>Score estimé :</strong>
              <br />
              <span className="ms-4">{home} {prediction.teamAGoals} - {prediction.teamBGoals} {away}</span>
            </div>

            <div className="mb-2">
              <FaSkating className="text-primary me-2" />
              <strong>Buteurs probables :</strong>
              <ul className="ms-4">
                {prediction.sortedScorers.map((p, i) => (
                  <li key={i}>
                    {p.name} — {p.goals} buts, {p.assists} assists
                    <small className="text-muted"> ({p.efficiency.toFixed(2)} buts/match)</small>
                  </li>
                ))}
              </ul>
            </div>

            {prediction.topSynergy?.length > 0 && (
              <div>
                <FaUserFriends className="text-success me-2" />
                <strong>Duo :</strong>
                <span className="ms-2">
                  {prediction.topSynergy[0].pair.join(" + ")} ({prediction.topSynergy[0].matchesTogether} matchs ensemble)
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="text-danger">
            ❌ Pas de données historiques suffisantes.
          </p>
        )}
      </Card.Body>
    </Card>
  );
};

export default MatchCard;

// src/components/DuoSynergy.jsx
import React, { useState } from 'react';
import { Card, Badge, ProgressBar, Table, Accordion, Button } from 'react-bootstrap';
import { FaUserFriends, FaHockeyPuck, FaHandsHelping, FaHistory, FaChartLine } from 'react-icons/fa';

const DuoSynergy = ({ duos, title = "Duos Synergiques", teamA, teamB }) => {
  const [expandedDuo, setExpandedDuo] = useState(null);

  // Si pas de duos, afficher un message
  if (!duos || duos.length === 0) {
    return (
      <Card className="shadow-sm border-0 mb-4">
        <Card.Body className="text-center p-4">
          <FaUserFriends className="mb-3 text-muted" style={{ fontSize: '2rem', opacity: 0.5 }} />
          <p className="mb-0 text-muted">Aucun duo synergique identifié</p>
        </Card.Body>
      </Card>
    );
  }

  // Calculer la valeur max pour la normalisation des scores
  const maxScore = Math.max(...duos.map(d => d.score || 0));
  
  return (
    <Card className="shadow-sm border-0 mb-4 duo-synergy-card">
      <Card.Header className="bg-gradient bg-primary text-white py-3">
        <h5 className="mb-0 d-flex align-items-center">
          <FaUserFriends className="me-2" /> {title}
        </h5>
      </Card.Header>
      <Card.Body className="p-0">
        <div className="p-3">
          {duos.map((duo, index) => {
            // Normaliser le score pour la barre de progression
            const normalizedScore = maxScore > 0 ? (duo.score / maxScore) * 100 : 50;
            const duoKey = `duo-${index}`;
            const isExpanded = expandedDuo === duoKey;
            
            // Déterminer la couleur du badge d'équipe
            const teamColor = duo.team === "teamA" ? "primary" : 
                              duo.team === "teamB" ? "danger" : "secondary";
            const teamName = duo.team === "teamA" ? teamA : 
                             duo.team === "teamB" ? teamB : "Équipe inconnue";
            
            return (
              <div 
                key={duoKey} 
                className={`duo-item p-3 ${index % 2 === 0 ? 'bg-light rounded' : ''}`}
              >
                <div className="d-flex align-items-center mb-2">
                  <Badge 
                    bg={index < 2 ? 'primary' : 'secondary'} 
                    className="rounded-circle d-flex align-items-center justify-content-center me-3"
                    style={{ width: '32px', height: '32px' }}
                  >
                    {index + 1}
                  </Badge>
                  <div className="duo-info flex-grow-1">
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="fw-bold">{duo.pair.join(' + ')}</span>
                      <Badge bg={teamColor} className="ms-2">{teamName}</Badge>
                    </div>
                    <div className="mt-2">
                      <ProgressBar 
                        now={normalizedScore} 
                        variant={index === 0 ? 'success' : index === 1 ? 'info' : 'primary'} 
                        className="mt-1" 
                        style={{ height: '8px' }}
                      />
                    </div>
                  </div>
                </div>
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <div className="d-flex">
                    <div className="me-3 text-center">
                      <small className="text-muted d-block">Matchs ensemble</small>
                      <Badge bg="light" text="dark" className="mt-1">
                        <FaHistory className="me-1" />
                        {duo.matchesTogether || duo.appearances || 0}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <small className="text-muted d-block">Buts ensemble</small>
                      <Badge bg="light" text="dark" className="mt-1">
                        <FaHockeyPuck className="me-1" />
                        {duo.goalsTogether || 0}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="text-muted p-0"
                    onClick={() => setExpandedDuo(isExpanded ? null : duoKey)}
                  >
                    {isExpanded ? "Masquer les détails" : "Voir les détails"}
                  </Button>
                </div>
                
                {isExpanded && (
                  <div className="mt-3 pt-3 border-top">
                    <h6 className="text-muted mb-2">
                      <FaChartLine className="me-2" /> Statistiques détaillées
                    </h6>
                    <Table size="sm" borderless className="mb-0">
                      <tbody>
                        <tr>
                          <td><small>Efficacité</small></td>
                          <td>
                            <Badge bg="success">
                              {duo.matchesTogether ? (duo.goalsTogether / duo.matchesTogether).toFixed(2) : '0.00'} buts/match
                            </Badge>
                          </td>
                        </tr>
                        <tr>
                          <td><small>Score de synergie</small></td>
                          <td>
                            <Badge bg="info">
                              {duo.score ? duo.score.toFixed(2) : 'N/A'}
                            </Badge>
                          </td>
                        </tr>
                        {duo.lastMatchDate && (
                          <tr>
                            <td><small>Dernier match ensemble</small></td>
                            <td>
                              <Badge bg="secondary">
                                {new Date(duo.lastMatchDate).toLocaleDateString()}
                              </Badge>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card.Body>
    </Card>
  );
};

export default DuoSynergy;
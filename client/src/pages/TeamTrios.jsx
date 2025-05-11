// src/pages/TeamTrios.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Container,
  Form,
  Button,
  Alert,
  Spinner,
  Card,
  Row,
  Col,
  Badge,
  Tabs,
  Tab,
  InputGroup
} from "react-bootstrap";
import {
  FaUserFriends,
  FaSearch,
  FaHockeyPuck,
  FaInfoCircle,
  FaTable,
  FaChartLine,
  FaFilter
} from "react-icons/fa";

// Importer les composants
import TeamTrioAnalysis from "../components/TeamTrioAnalysis";
import TrioComparisonTable from "../components/TrioComparisonTable";

const TeamTrios = () => {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trioData, setTrioData] = useState(null);
  const [activeTab, setActiveTab] = useState("analysis");
  const [minGoals, setMinGoals] = useState(1);

  // Récupérer la liste des équipes
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
        setError("Impossible de charger la liste des équipes.");
      } finally {
        setInitialLoading(false);
      }
    };
    fetchTeams();
  }, []);

  // Récupérer les données des trios pour une équipe
  const fetchTrioData = async (team) => {
    if (!team) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/team-trios?team=${encodeURIComponent(team)}&minGoals=${minGoals}`);
      setTrioData(response.data);
    } catch (err) {
      console.error("Erreur lors de la récupération des trios:", err);
      setError(`Impossible de charger les données: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Gestion du changement d'équipe
  const handleTeamChange = (event) => {
    const team = event.target.value;
    setSelectedTeam(team);
    if (team) {
      fetchTrioData(team);
    } else {
      setTrioData(null);
    }
  };

  // Rechercher les données quand minGoals change
  useEffect(() => {
    if (selectedTeam) {
      fetchTrioData(selectedTeam);
    }
  }, [minGoals]);

  if (initialLoading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Chargement des données...</p>
      </Container>
    );
  }

  return (
    <Container className="my-5">
      <div className="text-center mb-5">
        <h2 className="display-5 fw-bold text-primary mb-3">
          <FaUserFriends className="me-3" />
          Trios Offensifs par Équipe
        </h2>
        <p className="lead text-muted">
          Découvrez les groupes de 3 joueurs qui marquent ensemble sur la saison 2024-2025
        </p>
      </div>

      <Card className="shadow-sm border-0 mb-5">
        <Card.Body className="p-4">
          <Form>
            <div className="mb-4">
              <Form.Label className="fw-bold mb-3 text-primary">
                Sélectionnez une équipe pour voir ses trios offensifs
              </Form.Label>
              <Row className="justify-content-center">
                <Col md={6}>
                  <Form.Select
                    value={selectedTeam}
                    onChange={handleTeamChange}
                    className="py-3 ps-3 mb-3"
                    style={{ background: selectedTeam ? 'rgba(13, 110, 253, 0.05)' : 'white' }}
                  >
                    <option value="">Choisissez une équipe...</option>
                    {teams.map((team, i) => (
                      <option key={`team-${i}`} value={team}>
                        {team}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <InputGroup className="mb-3">
                    <InputGroup.Text>
                      <FaFilter />
                    </InputGroup.Text>
                    <Form.Select 
                      value={minGoals}
                      onChange={(e) => setMinGoals(parseInt(e.target.value))}
                    >
                      <option value="1">Min. 1 but par joueur</option>
                      <option value="2">Min. 2 buts par joueur</option>
                      <option value="3">Min. 3 buts par joueur</option>
                    </Form.Select>
                  </InputGroup>
                </Col>
              </Row>
            </div>
          </Form>
        </Card.Body>
      </Card>
      
      {error && (
        <Alert variant="danger" className="text-center shadow-sm">
          <FaInfoCircle className="me-2" />
          {error}
        </Alert>
      )}
      
      {loading && (
        <div className="text-center my-5">
          <Spinner animation="border" role="status" variant="primary" />
          <p className="mt-3 text-muted">Chargement de l'analyse des trios...</p>
        </div>
      )}
      
      {selectedTeam && trioData && !loading && (
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-4"
          fill
        >
          <Tab 
            eventKey="analysis" 
            title={
              <span>
                <FaChartLine className="me-2" />
                Analyse détaillée
              </span>
            }
          >
            <TeamTrioAnalysis 
              teamName={selectedTeam} 
              minGoals={minGoals}
            />
          </Tab>
          <Tab 
            eventKey="table" 
            title={
              <span>
                <FaTable className="me-2" />
                Tableau comparatif
              </span>
            }
          >
            <TrioComparisonTable 
              trios={trioData.trios} 
              teamName={selectedTeam} 
            />
          </Tab>
        </Tabs>
      )}
      
      {!selectedTeam && !error && !loading && (
        <div className="text-center py-5 my-3">
          <div className="mb-4">
            <FaUserFriends style={{ fontSize: '4rem', opacity: 0.3 }} className="text-primary" />
          </div>
          <h5 className="text-muted">Sélectionnez une équipe pour voir l'analyse des trios</h5>
          <p className="text-muted mt-3 w-75 mx-auto">
            Cette analyse identifie les groupes de 3 joueurs qui marquent ensemble dans un même match,
            permettant de découvrir les formations offensives les plus efficaces.
          </p>
        </div>
      )}
      
      <Card className="shadow-sm border-0 mt-5">
        <Card.Header className="bg-light">
          <h5 className="mb-0">
            <FaInfoCircle className="me-2 text-primary" />
            À propos de cette analyse
          </h5>
        </Card.Header>
        <Card.Body>
          <p>
            L'analyse des trios identifie les groupes de 3 joueurs qui marquent ensemble durant le même match.
            Elle permet de découvrir les combinaisons offensives les plus puissantes de l'équipe et d'évaluer 
            leur efficacité contre différents adversaires.
          </p>
          <Row className="mt-4">
            <Col md={4} className="mb-3 mb-md-0">
              <div className="feature-card p-3 h-100 border rounded text-center">
                <FaHockeyPuck className="mb-3 text-primary" style={{ fontSize: '2rem' }} />
                <h5>Puissance offensive</h5>
                <p className="text-muted mb-0">Identifie les groupes de 3 joueurs qui produisent le plus de buts ensemble, révélant les lignes offensives les plus efficaces.</p>
              </div>
            </Col>
            <Col md={4} className="mb-3 mb-md-0">
              <div className="feature-card p-3 h-100 border rounded text-center">
                <FaUserFriends className="mb-3 text-primary" style={{ fontSize: '2rem' }} />
                <h5>Synergie d'équipe</h5>
                <p className="text-muted mb-0">Mesure la fréquence à laquelle certains trios de joueurs marquent ensemble, indiquant des synergies établies.</p>
              </div>
            </Col>
            <Col md={4}>
              <div className="feature-card p-3 h-100 border rounded text-center">
                <FaSearch className="mb-3 text-primary" style={{ fontSize: '2rem' }} />
                <h5>Matchs décisifs</h5>
                <p className="text-muted mb-0">Révèle les matchs où ces trios ont été particulièrement efficaces et contre quels adversaires ils performent le mieux.</p>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default TeamTrios;
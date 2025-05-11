// src/pages/TeamDuos.jsx - Version finale complète
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
  Tab
} from "react-bootstrap";
import {
  FaUserFriends,
  FaSearch,
  FaHockeyPuck,
  FaInfoCircle,
  FaTable,
  FaNetworkWired,
  FaChartLine
} from "react-icons/fa";

// Importer les composants
import TeamDuoAnalysis from "../components/TeamDuoAnalysis";
import DuoNetworkGraph from "../components/DuoNetworkGraph";
import DuoComparisonTable from "../components/DuoComparisonTable";

const TeamDuos = () => {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [duoData, setDuoData] = useState(null);
  const [activeTab, setActiveTab] = useState("analysis");

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

  // Récupérer les données des duos pour une équipe
  const fetchDuoData = async (team) => {
    if (!team) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/team-duos?team=${encodeURIComponent(team)}`);
      setDuoData(response.data);
    } catch (err) {
      console.error("Erreur lors de la récupération des duos:", err);
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
      fetchDuoData(team);
    } else {
      setDuoData(null);
    }
  };

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
          Analyse des Duos par Équipe
        </h2>
        <p className="lead text-muted">
          Découvrez les duos de joueurs qui marquent ensemble sur la saison 2024-2025
        </p>
      </div>

      <Card className="shadow-sm border-0 mb-5">
        <Card.Body className="p-4">
          <Form>
            <div className="mb-4">
              <Form.Label className="fw-bold mb-3 text-primary">Sélectionnez une équipe pour voir ses duos de joueurs efficaces</Form.Label>
              <div className="d-flex justify-content-center">
                <div style={{ maxWidth: '400px', width: '100%' }}>
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
                </div>
              </div>
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
          <p className="mt-3 text-muted">Chargement de l'analyse des duos...</p>
        </div>
      )}
      
      {selectedTeam && duoData && !loading && (
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
            <TeamDuoAnalysis teamName={selectedTeam} />
          </Tab>
          <Tab 
            eventKey="network" 
            title={
              <span>
                <FaNetworkWired className="me-2" />
                Visualisation réseau
              </span>
            }
          >
            {duoData.duos && duoData.duos.length > 1 ? (
              <DuoNetworkGraph 
                duos={duoData.duos} 
                teamName={selectedTeam} 
              />
            ) : (
              <Alert variant="info" className="text-center">
                Pas assez de duos pour générer un réseau de visualisation.
              </Alert>
            )}
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
            <DuoComparisonTable duos={duoData.duos} teamName={selectedTeam} />
          </Tab>
        </Tabs>
      )}
      
      {!selectedTeam && !error && !loading && (
        <div className="text-center py-5 my-3">
          <div className="mb-4">
            <FaUserFriends style={{ fontSize: '4rem', opacity: 0.3 }} className="text-primary" />
          </div>
          <h5 className="text-muted">Sélectionnez une équipe pour voir l'analyse des duos</h5>
          <p className="text-muted mt-3 w-75 mx-auto">
            Cette analyse vous montre les joueurs qui marquent efficacement ensemble, 
            leurs statistiques, et les matchs où ils ont été décisifs.
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
            L'analyse des duos identifie les paires de joueurs qui marquent efficacement 
            ensemble au cours d'un même match. Elle se base sur l'ensemble de la saison 2024-2025.
          </p>
          <Row className="mt-4">
            <Col md={4} className="mb-3 mb-md-0">
              <div className="feature-card p-3 h-100 border rounded text-center">
                <FaHockeyPuck className="mb-3 text-primary" style={{ fontSize: '2rem' }} />
                <h5>Buts ensemble</h5>
                <p className="text-muted mb-0">Comptabilise le nombre total de buts marqués par les deux joueurs dans les matchs où ils ont joué ensemble.</p>
              </div>
            </Col>
            <Col md={4} className="mb-3 mb-md-0">
              <div className="feature-card p-3 h-100 border rounded text-center">
                <FaUserFriends className="mb-3 text-primary" style={{ fontSize: '2rem' }} />
                <h5>Matchs ensemble</h5>
                <p className="text-muted mb-0">Indique le nombre de matchs où les deux joueurs ont marqué au moins un but chacun.</p>
              </div>
            </Col>
            <Col md={4}>
              <div className="feature-card p-3 h-100 border rounded text-center">
                <FaSearch className="mb-3 text-primary" style={{ fontSize: '2rem' }} />
                <h5>Tendances</h5>
                <p className="text-muted mb-0">Découvrez contre quels adversaires ces duos sont les plus efficaces.</p>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default TeamDuos;
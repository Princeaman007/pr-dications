// src/components/DuoComparisonTable.jsx
import React, { useState } from "react";
import { Card, Table, Form, Badge, Button } from "react-bootstrap";
import { FaTable, FaSort, FaSortUp, FaSortDown, FaFilter, FaDownload } from "react-icons/fa";

/**
 * Composant tableau comparatif des duos de joueurs
 * @param {Array} duos - Liste des duos à comparer
 * @param {String} teamName - Nom de l'équipe
 */
const DuoComparisonTable = ({ duos, teamName }) => {
  const [sortField, setSortField] = useState("matches");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filterValue, setFilterValue] = useState("");
  const [minMatches, setMinMatches] = useState(2);
  
  // Si pas de duos, ne pas afficher le composant
  if (!duos || duos.length === 0) {
    return null;
  }
  
  // Fonction pour trier les duos
  const sortDuos = (a, b) => {
    let valueA, valueB;
    
    // Déterminer les valeurs à comparer selon le champ de tri
    switch (sortField) {
      case "names":
        valueA = a.players.join(" + ");
        valueB = b.players.join(" + ");
        return sortDirection === "asc" 
          ? valueA.localeCompare(valueB) 
          : valueB.localeCompare(valueA);
      case "totalGoals":
        valueA = a.totalGoals;
        valueB = b.totalGoals;
        break;
      case "victories":
        valueA = a.victories;
        valueB = b.victories;
        break;
      case "winRate":
        valueA = a.winRate;
        valueB = b.winRate;
        break;
      case "matches":
      default:
        valueA = a.matches;
        valueB = b.matches;
        break;
    }
    
    return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
  };
  
  // Fonction pour filtrer les duos
  const filterDuos = (duo) => {
    // Filtrer par nombre de matchs minimum
    if (duo.matches < minMatches) {
      return false;
    }
    
    // Filtrer par recherche textuelle (nom des joueurs)
    if (filterValue && filterValue.trim() !== "") {
      const duoName = duo.players.join(" ").toLowerCase();
      return duoName.includes(filterValue.toLowerCase());
    }
    
    return true;
  };
  
  // Fonction pour gérer le changement de direction de tri
  const handleSortChange = (field) => {
    if (field === sortField) {
      // Inverser la direction si on clique sur le même champ
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Nouveau champ, initialiser avec desc par défaut
      setSortField(field);
      setSortDirection("desc");
    }
  };
  
  // Fonction pour exporter les données en CSV
  const exportCSV = () => {
    // Entêtes des colonnes
    const headers = ["Duo", "Matchs", "Buts", "Victoires", "% Victoires", "Adversaires"];
    
    // Données formatées pour l'export
    const rows = duos
      .filter(filterDuos)
      .sort(sortDuos)
      .map(duo => [
        duo.players.join(" + "),
        duo.matches,
        duo.totalGoals,
        duo.victories,
        duo.winRate + "%",
        duo.opponents.map(o => o.opponent).join(", ")
      ]);
    
    // Formatter le CSV
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
    // Créer le lien de téléchargement
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `duos_${teamName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    // Déclencher le téléchargement
    link.click();
    document.body.removeChild(link);
  };
  
  // Filtrer et trier les duos
  const filteredAndSortedDuos = duos
    .filter(filterDuos)
    .sort(sortDuos);
  
  // Obtenir l'icône de tri pour un champ donné
  const getSortIcon = (field) => {
    if (field !== sortField) {
      return <FaSort className="ms-1 text-muted" />;
    }
    return sortDirection === "asc" ? <FaSortUp className="ms-1 text-primary" /> : <FaSortDown className="ms-1 text-primary" />;
  };
  
  return (
    <Card className="shadow-sm border-0 mt-4">
      <Card.Header className="bg-light d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <FaTable className="me-2 text-primary" />
          Tableau comparatif des duos
        </h5>
        <Button 
          variant="outline-primary" 
          size="sm"
          onClick={exportCSV}
          className="d-flex align-items-center"
        >
          <FaDownload className="me-1" /> Exporter CSV
        </Button>
      </Card.Header>
      <Card.Body className="p-0">
        <div className="p-3 bg-light border-bottom">
          <Form className="row align-items-center">
            <div className="col-md-6 mb-3 mb-md-0">
              <Form.Group>
                <Form.Label className="small text-muted">Rechercher un joueur</Form.Label>
                <div className="input-group">
                  <span className="input-group-text">
                    <FaFilter />
                  </span>
                  <Form.Control
                    type="text"
                    placeholder="Nom du joueur..."
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                  />
                </div>
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group>
                <Form.Label className="small text-muted">Min. matchs ensemble</Form.Label>
                <Form.Select
                  value={minMatches}
                  onChange={(e) => setMinMatches(parseInt(e.target.value))}
                >
                  <option value="1">Tous les duos</option>
                  <option value="2">2+ matchs</option>
                  <option value="3">3+ matchs</option>
                  <option value="4">4+ matchs</option>
                  <option value="5">5+ matchs</option>
                </Form.Select>
              </Form.Group>
            </div>
          </Form>
        </div>
        
        <div className="table-responsive">
          <Table hover className="mb-0">
            <thead>
              <tr>
                <th 
                  className="cursor-pointer"
                  onClick={() => handleSortChange("names")}
                >
                  Duo {getSortIcon("names")}
                </th>
                <th 
                  className="cursor-pointer text-center"
                  onClick={() => handleSortChange("matches")}
                >
                  Matchs {getSortIcon("matches")}
                </th>
                <th 
                  className="cursor-pointer text-center"
                  onClick={() => handleSortChange("totalGoals")}
                >
                  Buts {getSortIcon("totalGoals")}
                </th>
                <th 
                  className="cursor-pointer text-center"
                  onClick={() => handleSortChange("victories")}
                >
                  Victoires {getSortIcon("victories")}
                </th>
                <th 
                  className="cursor-pointer text-center"
                  onClick={() => handleSortChange("winRate")}
                >
                  % Victoires {getSortIcon("winRate")}
                </th>
                <th>Adversaires fréquents</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedDuos.length > 0 ? (
                filteredAndSortedDuos.map((duo, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-light' : ''}>
                    <td>
                      <strong>{duo.players.join(" + ")}</strong>
                    </td>
                    <td className="text-center">
                      <Badge bg="primary" pill>{duo.matches}</Badge>
                    </td>
                    <td className="text-center">
                      <Badge bg="success" pill>{duo.totalGoals}</Badge>
                    </td>
                    <td className="text-center">
                      <Badge bg="info" pill>{duo.victories}</Badge>
                    </td>
                    <td className="text-center">
                      <Badge 
                        bg={duo.winRate >= 75 ? "success" : duo.winRate >= 50 ? "info" : "secondary"} 
                        pill
                      >
                        {duo.winRate}%
                      </Badge>
                    </td>
                    <td>
                      {duo.opponents.slice(0, 3).map((opponent, i) => (
                        <Badge 
                          key={i} 
                          bg="light" 
                          text="dark" 
                          className="me-1 mb-1"
                        >
                          {opponent.opponent} ({opponent.count})
                        </Badge>
                      ))}
                      {duo.opponents.length > 3 && (
                        <Badge bg="light" text="dark" pill>+{duo.opponents.length - 3}</Badge>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-3 text-muted">
                    Aucun duo ne correspond aux critères de filtrage
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
        
        <div className="p-2 bg-light border-top small text-muted text-end">
          {filteredAndSortedDuos.length} duo{filteredAndSortedDuos.length !== 1 ? 's' : ''} affichés
        </div>
      </Card.Body>
      
      <style jsx="true">{`
        .cursor-pointer {
          cursor: pointer;
        }
        .cursor-pointer:hover {
          background-color: rgba(13, 110, 253, 0.05);
        }
      `}</style>
    </Card>
  );
};

export default DuoComparisonTable;
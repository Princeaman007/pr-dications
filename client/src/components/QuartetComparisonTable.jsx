// src/components/QuartetComparisonTable.jsx
import React, { useState } from "react";
import { Card, Table, Form, Badge, Button } from "react-bootstrap";
import { FaTable, FaSort, FaSortUp, FaSortDown, FaFilter, FaDownload, FaSearch } from "react-icons/fa";

/**
 * Composant tableau comparatif des quatuors de joueurs
 * @param {Array} quartets - Liste des quatuors à comparer
 * @param {String} teamName - Nom de l'équipe
 */
const QuartetComparisonTable = ({ quartets, teamName }) => {
  const [sortField, setSortField] = useState("matches");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filterValue, setFilterValue] = useState("");
  
  // Si pas de quatuors, ne pas afficher le composant
  if (!quartets || quartets.length === 0) {
    return null;
  }
  
  // Fonction pour trier les quatuors
  const sortQuartets = (a, b) => {
    let valueA, valueB;
    
    // Déterminer les valeurs à comparer selon le champ de tri
    switch (sortField) {
      case "players":
        valueA = a.players.join(" ");
        valueB = b.players.join(" ");
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
      case "goalsPerMatch":
        valueA = a.goalsPerMatch;
        valueB = b.goalsPerMatch;
        break;
      case "matches":
      default:
        valueA = a.matches;
        valueB = b.matches;
        break;
    }
    
    return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
  };
  
  // Fonction pour filtrer les quatuors
  const filterQuartets = (quartet) => {
    // Si aucun filtre, retourner tous les quatuors
    if (!filterValue || filterValue.trim() === "") {
      return true;
    }
    
    // Filtrer par nom de joueur (au moins un des joueurs doit correspondre)
    const searchTerm = filterValue.toLowerCase();
    return quartet.players.some(player => 
      player.toLowerCase().includes(searchTerm)
    );
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
    const headers = ["Joueurs", "Matchs", "Buts", "Buts/Match", "Victoires", "% Victoires", "Adversaires"];
    
    // Données formatées pour l'export
    const rows = quartets
      .filter(filterQuartets)
      .sort(sortQuartets)
      .map(quartet => [
        quartet.players.join(", "),
        quartet.matches,
        quartet.totalGoals,
        quartet.goalsPerMatch,
        quartet.victories,
        quartet.winRate + "%",
        quartet.opponents.map(o => o.opponent).join("; ")
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
    link.setAttribute("download", `quatuors_${teamName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    // Déclencher le téléchargement
    link.click();
    document.body.removeChild(link);
  };
  
  // Filtrer et trier les quatuors
  const filteredAndSortedQuartets = quartets
    .filter(filterQuartets)
    .sort(sortQuartets);
  
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
          Tableau comparatif des quatuors
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
          <Form>
            <Form.Group>
              <Form.Label className="small text-muted">Rechercher un joueur</Form.Label>
              <div className="input-group">
                <span className="input-group-text">
                  <FaSearch />
                </span>
                <Form.Control
                  type="text"
                  placeholder="Nom du joueur..."
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                />
              </div>
              <Form.Text className="text-muted">
                Filtrer les quatuors contenant le joueur recherché
              </Form.Text>
            </Form.Group>
          </Form>
        </div>
        
        <div className="table-responsive">
          <Table hover className="mb-0">
            <thead>
              <tr>
                <th 
                  className="cursor-pointer"
                  onClick={() => handleSortChange("players")}
                >
                  Joueurs {getSortIcon("players")}
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
                  onClick={() => handleSortChange("goalsPerMatch")}
                >
                  Buts/Match {getSortIcon("goalsPerMatch")}
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
              {filteredAndSortedQuartets.length > 0 ? (
                filteredAndSortedQuartets.map((quartet, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-light' : ''}>
                    <td>
                      <div>
                        {quartet.players.slice(0, 2).map((player, i) => (
                          <Badge 
                            key={`top-${i}`} 
                            bg="primary" 
                            className="me-1 mb-1 px-2 py-1"
                          >
                            {player}
                          </Badge>
                        ))}
                      </div>
                      <div>
                        {quartet.players.slice(2, 4).map((player, i) => (
                          <Badge 
                            key={`bottom-${i}`} 
                            bg="primary" 
                            className="me-1 mb-1 px-2 py-1"
                          >
                            {player}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="text-center">
                      <Badge bg="primary" pill>{quartet.matches}</Badge>
                    </td>
                    <td className="text-center">
                      <Badge bg="success" pill>{quartet.totalGoals}</Badge>
                    </td>
                    <td className="text-center">
                      <Badge bg="info" pill>{quartet.goalsPerMatch}</Badge>
                    </td>
                    <td className="text-center">
                      <Badge 
                        bg={quartet.winRate >= 75 ? "success" : quartet.winRate >= 50 ? "info" : "secondary"} 
                        pill
                      >
                        {quartet.winRate}%
                      </Badge>
                    </td>
                    <td>
                      {quartet.opponents.slice(0, 2).map((opponent, i) => (
                        <Badge 
                          key={i} 
                          bg="light" 
                          text="dark" 
                          className="me-1 mb-1"
                        >
                          {opponent.opponent} ({opponent.count})
                        </Badge>
                      ))}
                      {quartet.opponents.length > 2 && (
                        <Badge bg="light" text="dark" pill>+{quartet.opponents.length - 2}</Badge>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-3 text-muted">
                    Aucun quatuor ne correspond aux critères de filtrage
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
        
        <div className="p-2 bg-light border-top small text-muted text-end">
          {filteredAndSortedQuartets.length} quatuor{filteredAndSortedQuartets.length !== 1 ? 's' : ''} affichés
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

export default QuartetComparisonTable;
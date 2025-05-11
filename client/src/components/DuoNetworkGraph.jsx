// src/components/DuoNetworkGraph.jsx
import React, { useRef, useEffect } from "react";
import { Card } from "react-bootstrap";
import { FaNetworkWired } from "react-icons/fa";

/**
 * Composant de visualisation des relations entre joueurs sous forme de graphe
 * @param {Array} duos - Liste des duos de joueurs
 * @param {String} teamName - Nom de l'équipe
 */
const DuoNetworkGraph = ({ duos, teamName }) => {
  const canvasRef = useRef(null);
  
  // Convertir les duos en nœuds et liens
  const prepareGraphData = (duos) => {
    if (!duos || duos.length === 0) return { nodes: [], links: [] };
    
    // Création d'un map des joueurs (nœuds)
    const playerMap = new Map();
    
    // Parcourir les duos pour collecter tous les joueurs
    duos.forEach(duo => {
      duo.players.forEach(player => {
        if (!playerMap.has(player)) {
          playerMap.set(player, { 
            id: player, 
            name: player,
            goalsCount: 0,
            matchesCount: 0,
            connectionsCount: 0
          });
        }
        
        // Mettre à jour les statistiques du joueur
        const playerNode = playerMap.get(player);
        playerNode.goalsCount += Math.floor(duo.totalGoals / 2); // Approximation
        playerNode.matchesCount += duo.matches;
        playerNode.connectionsCount += 1;
      });
    });
    
    // Créer les liens entre les joueurs
    const links = duos.map(duo => ({
      source: duo.players[0],
      target: duo.players[1],
      weight: duo.matches,
      totalGoals: duo.totalGoals
    }));
    
    return {
      nodes: Array.from(playerMap.values()),
      links
    };
  };
  
  // Fonction pour dessiner le graphe
  const drawGraph = (canvas, data) => {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Effacer le canvas
    ctx.clearRect(0, 0, width, height);
    
    // Si pas de données, ne rien dessiner
    if (!data.nodes || data.nodes.length === 0) return;
    
    // Configuration du graphe
    const nodeRadius = 30;
    const colors = {
      node: '#3498db',
      highlight: '#2980b9',
      text: '#fff',
      link: '#aaa',
      strongLink: '#2ecc71'
    };
    
    // Calculer la position des nœuds (disposition en cercle)
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - nodeRadius * 3;
    
    // Positionner les nœuds en cercle
    const nodes = data.nodes.map((node, index) => {
      const angle = (index / data.nodes.length) * 2 * Math.PI;
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        radius: nodeRadius + Math.min(10, node.connectionsCount * 3)
      };
    });
    
    // Trouver le lien avec le poids maximal pour la normalisation
    const maxWeight = Math.max(...data.links.map(link => link.weight));
    
    // Dessiner les liens
    data.links.forEach(link => {
      const sourceNode = nodes.find(n => n.id === link.source);
      const targetNode = nodes.find(n => n.id === link.target);
      
      if (sourceNode && targetNode) {
        // Calculer l'épaisseur du lien en fonction du poids
        const linkWidth = 1 + (link.weight / maxWeight) * 8;
        
        // Calculer la couleur du lien en fonction du poids
        const linkColor = link.weight > maxWeight / 2 ? colors.strongLink : colors.link;
        const linkOpacity = 0.3 + (link.weight / maxWeight) * 0.7;
        
        // Dessiner le lien
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.strokeStyle = linkColor;
        ctx.globalAlpha = linkOpacity;
        ctx.lineWidth = linkWidth;
        ctx.stroke();
        
        // Afficher le nombre de matchs sur le lien
        if (link.weight > 1) {
          const midX = (sourceNode.x + targetNode.x) / 2;
          const midY = (sourceNode.y + targetNode.y) / 2;
          
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#333';
          ctx.font = '14px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${link.weight} matchs`, midX, midY);
        }
      }
    });
    
    // Dessiner les nœuds
    ctx.globalAlpha = 1;
    nodes.forEach(node => {
      // Dessiner le cercle du nœud
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = colors.node;
      ctx.fill();
      
      // Dessiner le texte du nœud (nom du joueur)
      ctx.fillStyle = colors.text;
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Afficher seulement le prénom si le nom est trop long
      let displayName = node.name;
      if (node.name.length > 12) {
        displayName = node.name.split(' ')[0];
      }
      
      ctx.fillText(displayName, node.x, node.y);
    });
  };
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Adapter la taille du canvas à son conteneur
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = 400; // Hauteur fixe
      
      // Redessiner le graphe
      const graphData = prepareGraphData(duos);
      drawGraph(canvas, graphData);
    };
    
    // Appeler la fonction de redimensionnement au chargement et à chaque changement de taille
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [duos]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Préparer et dessiner le graphe
    const graphData = prepareGraphData(duos);
    drawGraph(canvas, graphData);
  }, [duos]);
  
  // Si pas de duos, ne pas afficher le composant
  if (!duos || duos.length === 0) {
    return null;
  }
  
  return (
    <Card className="shadow-sm border-0 mt-4">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">
          <FaNetworkWired className="me-2" />
          Réseau de joueurs • {teamName}
        </h5>
      </Card.Header>
      <Card.Body className="p-0">
        <div className="network-container">
          <canvas ref={canvasRef} style={{ width: '100%', height: '400px' }}></canvas>
        </div>
        <div className="p-3 bg-light">
          <p className="mb-0 text-muted small">
            <strong>Note:</strong> Cette visualisation représente les liens entre les joueurs qui marquent ensemble. 
            La taille des nœuds indique le nombre de connexions et l'épaisseur des liens indique 
            le nombre de matchs où les joueurs ont marqué ensemble.
          </p>
        </div>
      </Card.Body>
    </Card>
  );
};

export default DuoNetworkGraph;
import { Link, useLocation } from "react-router-dom";
import { Navbar, Nav, Container } from "react-bootstrap";

const Header = () => {
  const location = useLocation();

  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container className="position-relative">
        <Navbar.Brand as={Link} to="/" className="position-absolute start-0">
          🏒 NHL Pred
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="nav" className="ms-auto" />
        <Navbar.Collapse id="nav" className="justify-content-center">
          <Nav className="text-center">
            <Nav.Link
              as={Link}
              to="/upcoming"
              active={location.pathname === "/upcoming"}
            >
              Prochains matchs
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/head-to-head"
              active={location.pathname === "/head-to-head"}
            >
              Confrontations
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/advanced-stats"
              active={location.pathname === "/advanced-stats"}
            >
              Stats avancées
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/team-duos"
              active={location.pathname === "/team-duos"}
            >
              Duos par équipe
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/team-trios"
              active={location.pathname === "/team-trios"}
            >
              Trios offensifs
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/team-quartets"
              active={location.pathname === "/team-quartets"}
            >
              Quatuors offensifs
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;

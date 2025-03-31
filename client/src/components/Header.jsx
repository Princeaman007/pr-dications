import { Link, useLocation } from "react-router-dom";
import { Navbar, Nav, Container } from "react-bootstrap";

const Header = () => {
  const location = useLocation(); // Pour détecter la route active

  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">🏒 NHL Pred</Navbar.Brand>
        <Navbar.Toggle aria-controls="nav" />
        <Navbar.Collapse id="nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/upcoming" active={location.pathname === "/upcoming"}>
              Prochains matchs
            </Nav.Link>
            <Nav.Link as={Link} to="/head-to-head" active={location.pathname === "/head-to-head"}>
              Confrontations
            </Nav.Link>
            <Nav.Link as={Link} to="/advanced-stats" active={location.pathname === "/advanced-stats"}>
              Stats avancées
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;

// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import UpcomingPredictions from "./pages/UpcomingPredictions";
import HeadToHead from "./pages/HeadToHead";
import AdvancedStats from "./pages/AdvancedStats";

const App = () => {
  return (
    <Router>
      <Header /> {/* Affiché en haut partout */}

      <main className="container my-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upcoming" element={<UpcomingPredictions />} />
          <Route path="/head-to-head" element={<HeadToHead />} />
          <Route path="/head-to-head/:teamA/:teamB" element={<HeadToHead />} />
          <Route path="/advanced-stats" element={<AdvancedStats />} />
        </Routes>
      </main>

      <Footer /> {/* Affiché en bas partout */}
    </Router>
  );
};

export default App;
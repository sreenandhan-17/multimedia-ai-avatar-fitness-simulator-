import React from 'react';
import AvatarScene from './components/AvatarScene';

export default function App() {
  return (
    <div className="app-container">
      <AvatarScene />

      <div className="ui-overlay">
        <header style={{ pointerEvents: 'none', padding: '20px' }}>
          <h1 style={{ color: '#f8fafc', fontSize: '20px', fontWeight: 700 }}>
            Multimedia AI Avatar Fitness Simulator
          </h1>
          <p style={{ color: '#00f2fe', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>
            Phase 1 — Base Scene & Placeholder Avatar
          </p>
        </header>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { toLocalDayKey } from '../utils/dateKeys';
import './ProgressionChart.css';

const CHART_WIDTH = 600;
const CHART_HEIGHT = 220;
const PADDING = 32;

// Groups sessions by calendar day (YYYY-MM-DD) and sums their reps.
// Returns days oldest first, so the bar chart reads left to right.
function getRepsByDay(sessions) {
  const repsByDay = {};
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const dayKey = toLocalDayKey(new Date(session.date));
    repsByDay[dayKey] = (repsByDay[dayKey] || 0) + (session.reps || 0);
  }

  const dayKeys = Object.keys(repsByDay).sort();
  const points = [];
  for (let i = 0; i < dayKeys.length; i++) {
    points.push({ label: dayKeys[i], value: repsByDay[dayKeys[i]] });
  }
  return points;
}

// Sessions come newest first from sessions.js. Oldest first reads left to
// right on a chart, the direction people expect progress to flow.
function getAccuracyBySession(sessions) {
  const chronological = sessions.slice().reverse();
  const points = [];
  for (let i = 0; i < chronological.length; i++) {
    const session = chronological[i];
    const dayKey = toLocalDayKey(new Date(session.date));
    points.push({ label: dayKey, value: session.accuracy || 0 });
  }
  return points;
}

export default function ProgressionChart({ sessions }) {
  const [mode, setMode] = useState('accuracy');

  const points = mode === 'accuracy' ? getAccuracyBySession(sessions) : getRepsByDay(sessions);

  const plotWidth = CHART_WIDTH - PADDING * 2;
  const plotHeight = CHART_HEIGHT - PADDING * 2;

  // Reps has no fixed ceiling like accuracy's 0-100, so scale to the tallest bar.
  let maxValue = mode === 'accuracy' ? 100 : 1;
  if (mode === 'reps') {
    for (let i = 0; i < points.length; i++) {
      if (points[i].value > maxValue) {
        maxValue = points[i].value;
      }
    }
  }

  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;
  const barSlot = points.length > 0 ? plotWidth / points.length : plotWidth;

  const linePoints = [];
  for (let i = 0; i < points.length; i++) {
    const x = PADDING + (points.length > 1 ? i * stepX : plotWidth / 2);
    const y = PADDING + plotHeight - (points[i].value / maxValue) * plotHeight;
    linePoints.push({ x, y, ...points[i] });
  }
  const linePath = linePoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="progression-chart-card">
      <div className="progression-chart-header">
        <h2 className="progression-chart-title">Progression</h2>
        <div className="progression-chart-toggle" role="group" aria-label="Chart data">
          <button
            type="button"
            className={`progression-toggle-btn ${mode === 'accuracy' ? 'active' : ''}`}
            onClick={() => setMode('accuracy')}
          >
            Accuracy
          </button>
          <button
            type="button"
            className={`progression-toggle-btn ${mode === 'reps' ? 'active' : ''}`}
            onClick={() => setMode('reps')}
          >
            Reps per day
          </button>
        </div>
      </div>

      {points.length === 0 ? (
        <p className="progression-chart-empty">Not enough data yet.</p>
      ) : (
        <svg
          className="progression-chart-svg"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={mode === 'accuracy' ? 'Accuracy per session' : 'Reps per day'}
        >
          {/* Axis lines */}
          <line
            x1={PADDING}
            y1={PADDING}
            x2={PADDING}
            y2={PADDING + plotHeight}
            className="progression-axis-line"
          />
          <line
            x1={PADDING}
            y1={PADDING + plotHeight}
            x2={PADDING + plotWidth}
            y2={PADDING + plotHeight}
            className="progression-axis-line"
          />

          {mode === 'accuracy' ? (
            <>
              <polyline points={linePath} className="progression-line" />
              {linePoints.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3.5} className="progression-dot" />
              ))}
            </>
          ) : (
            points.map((point, i) => {
              const barHeight = (point.value / maxValue) * plotHeight;
              const barWidth = Math.min(32, barSlot * 0.6);
              const x = PADDING + i * barSlot + (barSlot - barWidth) / 2;
              const y = PADDING + plotHeight - barHeight;
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  className="progression-bar"
                />
              );
            })
          )}
        </svg>
      )}
    </div>
  );
}

import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function SkinRadarChart({ metrics }) {
  if (!metrics) return null;

  const dataMap = {
    oiliness: 'Grasosidad',
    dryness: 'Resequedad',
    sensitivity: 'Sensibilidad',
    redness: 'Rojeces',
    texture: 'Textura',
    imperfections: 'Imperfecciones'
  };

  const data = Object.keys(dataMap).map(key => ({
    subject: dataMap[key],
    score: metrics[key]?.score || 0,
    fullMark: 100
  }));

  const customTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'var(--color-crema, #F6F3EC)',
          padding: '8px 12px',
          border: '1px solid var(--color-arena, #E7DFD2)',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(29, 40, 37, 0.05)'
        }}>
          <p style={{ margin: 0, color: 'var(--color-bosque-profundo, #163B35)', fontWeight: 'bold' }}>
            {payload[0].payload.subject}: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 300, position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="var(--color-arena, #E7DFD2)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-carbon, #1D2825)', fontSize: 12, fontWeight: 500 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip content={customTooltip} />
          <Radar
            name="Análisis Actual"
            dataKey="score"
            stroke="var(--color-bosque-medio, #2D6658)"
            strokeWidth={2}
            fill="var(--color-salvia, #A9C4B5)"
            fillOpacity={0.6}
            animationDuration={800}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

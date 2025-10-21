'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { PollenData } from '@/types';
import {
  getFrontendLevelFromCount,
  getPollenColor,
  type Level
} from '@/utils/pollenLevels';

interface PollenVisualizationProps {
  pollenData: PollenData[];
  selectedRegion: string | null;
  onRegionClick: (region: string) => void;
}

const LEVEL_DENSITY_MULTIPLIERS: Record<Level, number> = {
  low: 0.25,
  moderate: 0.55,
  high: 0.9,
  very_high: 1.2,
};

// Individual pollen particle
function PollenParticle({ 
  position, 
  color, 
  size, 
  velocity 
}: { 
  position: [number, number, number];
  color: string;
  size: number;
  velocity: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Move particle based on wind velocity
      meshRef.current.position.x += velocity[0] * delta;
      meshRef.current.position.y += velocity[1] * delta;
      meshRef.current.position.z += velocity[2] * delta;

      // Wrap around if out of bounds
      if (meshRef.current.position.x > 10) meshRef.current.position.x = -10;
      if (meshRef.current.position.x < -10) meshRef.current.position.x = 10;
      if (meshRef.current.position.y > 5) meshRef.current.position.y = -5;
      if (meshRef.current.position.z > 10) meshRef.current.position.z = -10;
      if (meshRef.current.position.z < -10) meshRef.current.position.z = 10;

      // Gentle rotation
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 8, 8]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color}
        emissiveIntensity={0.5}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

// Pollen storm system
function PollenStorm({
  pollenData,
  selectedRegion
}: {
  pollenData: PollenData[];
  selectedRegion: string | null;
}) {
  const particles = useMemo(() => {
    const particleArray: any[] = [];

    const regionList = selectedRegion
      ? pollenData.filter((region) => region.region === selectedRegion)
      : pollenData;

    const fallbackList = regionList.length > 0 ? regionList : pollenData;

    fallbackList.forEach((region, regionIndex) => {
      const rawCount = region.pollenCount ?? 0;
      if (rawCount <= 0) {
        return;
      }

      const pollenIndex = Math.max(0, rawCount);
      const intensity = pollenIndex * 6;
      const visualLevel = getFrontendLevelFromCount(pollenIndex);
      const levelMultiplier = LEVEL_DENSITY_MULTIPLIERS[visualLevel];
      const isLowLevel = visualLevel === 'low';
      const densityFactor = (selectedRegion ? 1.2 : 0.8) * levelMultiplier;
  const minimumBase = selectedRegion ? 120 : 45;
      const minimumCount = Math.round(minimumBase * Math.max(levelMultiplier, 0.35));
      let count = Math.max(
        minimumCount,
        Math.min(800, Math.round(intensity * densityFactor))
      );

      if (isLowLevel) {
        const fallbackBase = selectedRegion ? 35 : 18;
        count = Math.max(
          Math.round(fallbackBase * Math.max(levelMultiplier, 0.2)),
          count
        );
      }

      const windSpeed = region.weatherData?.windSpeed ?? 0;
      const windDir = (region.weatherData?.windDirection ?? 180) * (Math.PI / 180);
      
      // Color based on pollen level
  const color = getPollenColor(visualLevel);
      
      for (let i = 0; i < count; i++) {
        const angle = (regionIndex / Math.max(1, pollenData.length)) * Math.PI * 2;
        const radius = 5 + Math.random() * 3;
        
        const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 2;
        const y = (Math.random() - 0.5) * 8;
        const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 2;
        
        const velX = Math.cos(windDir) * windSpeed * 0.1;
        const velZ = Math.sin(windDir) * windSpeed * 0.1;
        const velY = (Math.random() - 0.5) * 0.1;
        
        particleArray.push({
          key: `${region.region}-${i}`,
          position: [x, y, z] as [number, number, number],
          color,
          size:
            0.04 +
            Math.random() * 0.06 +
            (selectedRegion ? intensity / 1500 : intensity / 3000) +
            (count && isLowLevel && intensity === 0 ? 0.02 : 0),
          velocity: [velX, velY, velZ] as [number, number, number]
        });
      }
    });
    
    return particleArray;
  }, [pollenData, selectedRegion]);

  return (
    <>
      {particles.map((particle: any) => {
        const { key, ...rest } = particle;
        return <PollenParticle key={key} {...rest} />;
      })}
    </>
  );
}

export default function PollenVisualization({
  pollenData,
  selectedRegion,
  onRegionClick
}: PollenVisualizationProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 5, 15], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} color="#ffd700" />
        
        <Stars 
          radius={100} 
          depth={50} 
          count={1000} 
          factor={4} 
          saturation={0} 
          fade 
          speed={1}
        />

        <PollenStorm pollenData={pollenData} selectedRegion={selectedRegion} />
        
        <OrbitControls 
          enablePan={false} 
          minDistance={10} 
          maxDistance={30}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
      
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center text-white text-sm bg-black bg-opacity-50 px-4 py-2 rounded">
        マウスでドラッグして回転 | スクロールでズーム
      </div>
    </div>
  );
}
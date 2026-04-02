import { Canvas } from '@react-three/fiber';
import { Environment, Float, MeshDistortMaterial, OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';

function Capsule({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <Float speed={2} rotationIntensity={1.2} floatIntensity={1.8} position={position}>
      <group>
        <mesh position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.34, 32, 32]} />
          <meshStandardMaterial color={color} roughness={0.18} metalness={0.1} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <sphereGeometry args={[0.34, 32, 32]} />
          <meshStandardMaterial color="#ffffff" roughness={0.08} metalness={0.04} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.34, 0.34, 0.62, 32]} />
          <meshStandardMaterial color={color} roughness={0.16} metalness={0.06} />
        </mesh>
      </group>
    </Float>
  );
}

function Bottle() {
  return (
    <Float speed={1.5} rotationIntensity={0.8} floatIntensity={1.5} position={[0, -0.3, 0]}>
      <mesh>
        <cylinderGeometry args={[0.6, 0.75, 1.8, 40]} />
        <MeshDistortMaterial color="#daf8ee" distort={0.15} speed={1.2} roughness={0.25} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 0.45, 32]} />
        <meshStandardMaterial color="#1f7cff" roughness={0.16} />
      </mesh>
    </Float>
  );
}

export function HeroScene() {
  return (
    <div className="relative h-[380px] overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(235,247,255,0.7))] shadow-[0_25px_70px_rgba(17,36,60,0.12)] sm:h-[440px]">
      <Canvas camera={{ position: [0, 0, 5.5], fov: 42 }}>
        <ambientLight intensity={1.2} />
        <directionalLight position={[4, 4, 4]} intensity={2} />
        <Suspense fallback={null}>
          <Environment preset="city" />
          <Bottle />
          <Capsule position={[-1.8, 0.4, -0.2]} color="#197dff" />
          <Capsule position={[1.8, 0.7, -0.8]} color="#16a679" />
          <Capsule position={[1.1, -1.2, 0.4]} color="#7fb8ff" />
          <Capsule position={[-1.2, -1.1, -0.6]} color="#8be0c1" />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.85))]" />
    </div>
  );
}

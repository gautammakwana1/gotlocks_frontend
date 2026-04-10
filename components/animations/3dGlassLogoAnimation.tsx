"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { SVGLoader } from "three-stdlib";
import * as THREE from "three";
import { useRef, useMemo, useLayoutEffect, JSX } from "react";

function ExtrudedLogo() {
    const pivotRef = useRef<THREE.Group>(null);
    const groupRef = useRef<THREE.Group>(null);

    const svgData = useLoader(
        SVGLoader,
        "/logocolorblackborder.svg"
    );

    // Create meshes (React way)
    const meshes = useMemo(() => {
        const items: JSX.Element[] = [];

        svgData.paths.forEach((path, i) => {
            const shapes = SVGLoader.createShapes(path);

            shapes.forEach((shape, j) => {
                const geometry =
                    new THREE.ExtrudeGeometry(shape, {
                        depth: 6,
                        bevelEnabled: true,
                        bevelThickness: 0.5,
                        bevelSize: 0.3,
                        bevelSegments: 2,
                    });

                items.push(
                    <mesh
                        key={`${i}-${j}`}
                        geometry={geometry}
                    >
                        <meshStandardMaterial
                            color={
                                path.color ||
                                new THREE.Color("#00ff99")
                            }
                            metalness={0.7}
                            roughness={0.2}
                            envMapIntensity={2}
                        />
                    </mesh>
                );
            });
        });

        return items;
    }, [svgData]);

    // ⭐ CENTER AFTER RENDER (IMPORTANT FIX)
    useLayoutEffect(() => {
        if (!groupRef.current) return;

        const box = new THREE.Box3().setFromObject(
            groupRef.current
        );

        const center = new THREE.Vector3();
        box.getCenter(center);

        groupRef.current.position.set(
            -center.x,
            -center.y,
            -center.z
        );
    }, [meshes]);

    // Spinner rotation
    useFrame((_, delta) => {
        if (pivotRef.current) {
            pivotRef.current.rotation.y += delta * 1.5;
        }
    });

    return (
        <group ref={pivotRef}>
            <group
                ref={groupRef}
                scale={[0.1, -0.1, 0.1]}
            >
                {meshes}
            </group>
        </group>
    );
}

export default function Logo3D() {
    return (
        <div className="w-[120px] h-[120px]">
            <Canvas
                camera={{
                    position: [0, 0, 45],
                    fov: 32,
                }}
            >
                {/* Lighting */}

                <ambientLight intensity={0.5} />

                <directionalLight
                    position={[10, 10, 10]}
                    intensity={2}
                />

                <pointLight
                    position={[-10, -10, 10]}
                    intensity={1.5}
                />

                {/* Reflections */}

                <Environment preset="night" />

                {/* Logo */}

                <ExtrudedLogo />

            </Canvas>
        </div>
    );
}
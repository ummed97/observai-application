import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const NetworkBackground: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mountRef.current) return;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0F111A); // Dark background

        // Camera
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / 2 / window.innerHeight, 0.1, 1000);
        camera.position.z = 30;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth / 2, window.innerHeight);
        mountRef.current.appendChild(renderer.domElement);

        // Particles (Nodes)
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 100;
        const posArray = new Float32Array(particlesCount * 3);

        for (let i = 0; i < particlesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 50;
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.2,
            color: 0x4f46e5, // Indigo-600
            transparent: true,
            opacity: 0.8,
        });

        const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particlesMesh);

        // Connections (Lines)
        const linesMaterial = new THREE.LineBasicMaterial({
            color: 0x4f46e5,
            transparent: true,
            opacity: 0.15,
        });

        const linesGeometry = new THREE.BufferGeometry();
        const linesMesh = new THREE.LineSegments(linesGeometry, linesMaterial);
        scene.add(linesMesh);

        // Animation Loop
        const animate = () => {
            requestAnimationFrame(animate);

            particlesMesh.rotation.y += 0.001;
            particlesMesh.rotation.x += 0.0005;

            // Update lines based on particle positions (simplified for performance)
            // For a static network effect that rotates, we can just rotate the mesh
            // If we want dynamic connections, we'd need to update geometry every frame
            // Here we'll stick to rotating the whole group for smooth performance

            // Optional: Add a gentle wave effect
            const time = Date.now() * 0.0005;
            particlesMesh.position.y = Math.sin(time) * 0.5;
            linesMesh.rotation.y += 0.001;
            linesMesh.rotation.x += 0.0005;
            linesMesh.position.y = Math.sin(time) * 0.5;

            renderer.render(scene, camera);
        };

        // Create initial connections
        const updateConnections = () => {
            const positions = particlesMesh.geometry.attributes.position.array;
            const linePositions = [];

            // Simple distance-based connection
            for (let i = 0; i < particlesCount; i++) {
                for (let j = i + 1; j < particlesCount; j++) {
                    const x1 = positions[i * 3];
                    const y1 = positions[i * 3 + 1];
                    const z1 = positions[i * 3 + 2];

                    const x2 = positions[j * 3];
                    const y2 = positions[j * 3 + 1];
                    const z2 = positions[j * 3 + 2];

                    const dist = Math.sqrt(
                        Math.pow(x1 - x2, 2) +
                        Math.pow(y1 - y2, 2) +
                        Math.pow(z1 - z2, 2)
                    );

                    if (dist < 12) { // Connection threshold
                        linePositions.push(x1, y1, z1);
                        linePositions.push(x2, y2, z2);
                    }
                }
            }

            linesMesh.geometry.setAttribute(
                'position',
                new THREE.Float32BufferAttribute(linePositions, 3)
            );
        };

        updateConnections();
        animate();

        // Handle Resize
        const handleResize = () => {
            camera.aspect = (window.innerWidth / 2) / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth / 2, window.innerHeight);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (mountRef.current) {
                mountRef.current.removeChild(renderer.domElement);
            }
            particlesGeometry.dispose();
            particlesMaterial.dispose();
            linesGeometry.dispose();
            linesMaterial.dispose();
        };
    }, []);

    return <div ref={mountRef} className="absolute inset-0 z-0" />;
};

export default NetworkBackground;

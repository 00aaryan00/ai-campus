import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

const ParticlesBg = () => {
  const particlesInit = async (main: any) => {
    await loadFull(main);
  };

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        background: { color: "#0A192F" },
        particles: {
          number: { value: 60 },
          size: { value: 2 },
          move: { enable: true, speed: 1 },
          links: { enable: true, color: "#FFD700" },
        },
      }}
    />
  );
};

export default ParticlesBg;
export default function SpaceBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* Base deep space background */}
      <div className="absolute inset-0 bg-[#020617]" />

      {/* Dense tiny stars */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(2px 2px at 20px 30px, rgba(255,255,255,0.9), transparent),
            radial-gradient(1.5px 1.5px at 120px 80px, rgba(255,255,255,0.8), transparent),
            radial-gradient(2px 2px at 250px 150px, rgba(255,255,255,0.9), transparent),
            radial-gradient(1.5px 1.5px at 400px 60px, rgba(255,255,255,0.8), transparent),
            radial-gradient(2px 2px at 550px 200px, rgba(255,255,255,0.9), transparent),
            radial-gradient(1.5px 1.5px at 700px 120px, rgba(255,255,255,0.8), transparent),
            radial-gradient(2px 2px at 900px 250px, rgba(255,255,255,0.9), transparent),
            radial-gradient(1.5px 1.5px at 1100px 180px, rgba(255,255,255,0.8), transparent)
          `,
          backgroundRepeat: "repeat",
          backgroundSize: "1200px 600px",
        }}
      />

      {/* Extra star layer */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 40px 60px, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 180px 200px, rgba(255,255,255,0.7), transparent),
            radial-gradient(1px 1px at 320px 100px, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 500px 240px, rgba(255,255,255,0.7), transparent),
            radial-gradient(1px 1px at 760px 140px, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 980px 90px, rgba(255,255,255,0.7), transparent)
          `,
          backgroundRepeat: "repeat",
          backgroundSize: "1000px 500px",
        }}
      />

      {/* Yellow glow */}
      <div className="absolute top-[-80px] left-[-80px] w-[420px] h-[420px] rounded-full bg-yellow-400/20 blur-3xl" />

      {/* Blue glow */}
      <div className="absolute top-[20%] right-[-120px] w-[500px] h-[500px] rounded-full bg-blue-500/20 blur-3xl" />

      {/* Purple glow */}
      <div className="absolute bottom-[-100px] left-[25%] w-[460px] h-[460px] rounded-full bg-purple-500/20 blur-3xl" />

      {/* Nebula streak 1 */}
      <div className="absolute left-[5%] top-[18%] w-[600px] h-[180px] rotate-[-12deg] bg-gradient-to-r from-transparent via-blue-400/10 to-transparent blur-3xl rounded-full" />

      {/* Nebula streak 2 */}
      <div className="absolute right-[8%] top-[30%] w-[520px] h-[180px] rotate-[18deg] bg-gradient-to-r from-transparent via-purple-400/10 to-transparent blur-3xl rounded-full" />

      {/* Nebula streak 3 */}
      <div className="absolute left-[20%] bottom-[10%] w-[650px] h-[220px] rotate-[8deg] bg-gradient-to-r from-transparent via-indigo-400/10 to-transparent blur-3xl rounded-full" />

      {/* Light vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.45)_100%)]" />
    </div>
  );
}
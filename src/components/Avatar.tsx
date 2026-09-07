import { useMemo } from 'react';

interface AvatarProps {
  seed: string;
  className?: string;
}

export default function Avatar({ seed, className = "" }: AvatarProps) {
  const { colors, pixels } = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Simple seeded random
    const random = () => {
        const x = Math.sin(hash++) * 10000;
        return x - Math.floor(x);
    };

    const palette = [
      `hsl(${Math.floor(random() * 360)}, 70%, 60%)`, // Main
      `hsl(${Math.floor(random() * 360)}, 70%, 50%)`, // Secondary
      `hsl(${Math.floor(random() * 360)}, 80%, 40%)`, // Accent
      `transparent` // Background (will be filled by container)
    ];

    const pixels = [];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 4; x++) { 
         // Bias towards transparent for a better shape, maybe 30% chance for background
         const isBg = random() < 0.3;
         pixels.push(isBg ? 3 : Math.floor(random() * 3));
      }
    }

    return { colors: palette, pixels };
  }, [seed]);

  return (
    <div className={`grid grid-cols-8 grid-rows-8 w-full h-full ${className}`}>
      {Array.from({ length: 64 }).map((_, i) => {
        const x = i % 8;
        const y = Math.floor(i / 8);
        const px = x < 4 ? x : 7 - x;
        const colorIndex = pixels[y * 4 + px];
        return (
          <div key={i} style={{ backgroundColor: colors[colorIndex] }} />
        );
      })}
    </div>
  );
}

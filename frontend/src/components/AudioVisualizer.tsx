import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';

interface AudioVisualizerProps {
  audio: HTMLAudioElement;
  analyser: AnalyserNode;
  color: string;
}

export default function AudioVisualizer({ audio, analyser, color }: AudioVisualizerProps) {
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(50));
  const animationFrameRef = useRef<number>(null);

  useEffect(() => {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateVisualization = () => {
      analyser.getByteFrequencyData(dataArray);

      // Take only first 50 values for visualization
      const visualData = new Uint8Array(50);
      for (let i = 0; i < 50; i++) {
        visualData[i] = dataArray[i];
      }

      setFrequencyData(visualData);
      animationFrameRef.current = requestAnimationFrame(updateVisualization);
    };

    updateVisualization();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audio, analyser]);

  return (
    <div className="mt-4 pt-4 border-t border-border/30">
      <div className="flex items-center gap-3">
        <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex-1 h-10 bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center gap-px px-1">
          {Array.from(frequencyData).map((value, i) => {
            // Normalize the value to a height between 4px and 32px
            const height = Math.max(4, (value / 255) * 32);
            return (
              <div
                key={i}
                className={`flex-1 rounded-full bg-gradient-to-t ${color} transition-all duration-75`}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';

export const CHART_HEIGHT = 256;

export const useChartSize = (height = CHART_HEIGHT) => {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const updateWidth = () => {
      const nextWidth = Math.floor(node.getBoundingClientRect().width);
      setWidth(nextWidth > 0 ? nextWidth : 0);
    };

    updateWidth();

    if (typeof window.ResizeObserver === 'function') {
      const observer = new window.ResizeObserver(updateWidth);
      observer.observe(node);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return { ref, width, height, isReady: width > 0 };
};

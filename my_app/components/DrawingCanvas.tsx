// components/DrawingCanvas.tsx
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, PanResponder, PanResponderInstance } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

type Point = { x: number; y: number };
const toPath = (pts: Point[]) =>
  pts.length ? `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') : '';

export type DrawingCanvasRef = {
  clear: () => void;
  getStrokes: () => Point[][];
  hasDrawing: () => boolean; // ✅ add this line
};


type Props = {
  size?: number;
  strokeWidth?: number;
  strokeColor?: string;
  onStrokeStart?: () => void; // 👈 we’ll use this to hide the guide
};

const DrawingCanvas = forwardRef<DrawingCanvasRef, Props>(
  ({ size = 300, strokeWidth = 12, strokeColor = '#000', onStrokeStart }, ref) => {
    const [strokes, setStrokes] = useState<Point[][]>([]);
    const activeIndex = useRef<number>(-1);

    useImperativeHandle(
      ref,
      () => ({
        clear: () => {
          setStrokes([]);
          activeIndex.current = -1;
        },
        getStrokes: () => strokes,

        // ✅ Add this new method
        hasDrawing: () => strokes.length > 0,
      }),
      [strokes]
    );


    const startPoint = (e: any) => ({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });

    const pan = useRef<PanResponderInstance>(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: (e) => {
          onStrokeStart?.(); // 👈 hide the guide when drawing starts
          const p = startPoint(e);
          setStrokes(prev => {
            const next = [...prev, [p]];
            activeIndex.current = next.length - 1;
            return next;
          });
        },

        onPanResponderMove: (e) => {
          const p = startPoint(e);
          setStrokes(prev => {
            const idx = activeIndex.current;
            if (idx < 0 || idx >= prev.length) return prev;
            const copy = prev.slice();
            copy[idx] = [...copy[idx], p];
            return copy;
          });
        },

        onPanResponderRelease: () => { activeIndex.current = -1; },
        onPanResponderTerminate: () => { activeIndex.current = -1; },
      })
    ).current;

    return (
      <View
        {...pan.panHandlers}
        collapsable={false}
        style={{
          width: size,
          height: size,
          // 👇 transparent so overlays below remain visible
          backgroundColor: 'transparent',
          borderRadius: 16,
          borderWidth: 0,     // border will be on wrapper
          overflow: 'hidden',
          alignSelf: 'center',
          zIndex: 1,
        }}
      >
        <Svg width="100%" height="100%">
          {strokes.map((pts, i) =>
            pts.length === 1 ? (
              <Circle key={i} cx={pts[0].x} cy={pts[0].y} r={strokeWidth / 2} fill={strokeColor} />
            ) : (
              <Path
                key={i}
                d={toPath(pts)}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )
          )}
        </Svg>
      </View>
    );
  }
);

export default DrawingCanvas;

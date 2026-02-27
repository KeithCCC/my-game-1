import { Canvas, Group as SkiaGroup, RoundedRect } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ActiveAnimation } from '../state/types';
import type { Board, Group, Pos } from '../core';

type BoardCanvasSkiaProps = {
  board: Board;
  sourceBoard: Board;
  palette: string[];
  selectedGroup: Group | null;
  animation: ActiveAnimation | null;
  onTapCell: (pos: Pos) => void;
};

const alphaHex = (hex: string, alpha: number): string => {
  const normalized = Math.max(0, Math.min(1, alpha));
  const a = Math.round(normalized * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
};

export const BoardCanvasSkia = ({
  board,
  sourceBoard,
  palette,
  selectedGroup,
  animation,
  onTapCell,
}: BoardCanvasSkiaProps) => {
  const [size, setSize] = useState(0);
  const cellSize = size > 0 ? size / board.cols : 0;

  const selectedSet = useMemo(() => {
    const set = new Set<string>();
    if (selectedGroup) {
      for (const p of selectedGroup.positions) {
        set.add(`${p.row},${p.col}`);
      }
    }
    return set;
  }, [selectedGroup]);

  const sourcePosById = useMemo(() => {
    const map = new Map<string, { row: number; col: number; color: number }>();
    for (let row = 0; row < sourceBoard.rows; row += 1) {
      for (let col = 0; col < sourceBoard.cols; col += 1) {
        const cell = sourceBoard.cells[row * sourceBoard.cols + col];
        if (cell) {
          map.set(cell.id, { row, col, color: cell.color });
        }
      }
    }
    return map;
  }, [sourceBoard]);

  const fallById = useMemo(() => {
    const map = new Map<string, { fromRow: number; toRow: number }>();
    if (!animation) {
      return map;
    }
    for (const f of animation.plan.falls) {
      map.set(f.id, { fromRow: f.fromRow, toRow: f.toRow });
    }
    return map;
  }, [animation]);

  const shiftById = useMemo(() => {
    const map = new Map<string, { fromCol: number; toCol: number }>();
    if (!animation) {
      return map;
    }
    for (const s of animation.plan.shifts) {
      map.set(s.id, { fromCol: s.fromCol, toCol: s.toCol });
    }
    return map;
  }, [animation]);

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const nextSize = Math.min(e.nativeEvent.layout.width, e.nativeEvent.layout.height);
        setSize(nextSize);
      }}
    >
      <Pressable
        style={{ width: size, height: size }}
        onPress={(e) => {
          if (!cellSize) {
            return;
          }
          const row = Math.floor(e.nativeEvent.locationY / cellSize);
          const col = Math.floor(e.nativeEvent.locationX / cellSize);
          if (row >= 0 && row < board.rows && col >= 0 && col < board.cols) {
            onTapCell({ row, col });
          }
        }}
      >
        <Canvas style={{ width: size, height: size }}>
          {board.cells.map((cell, index) => {
            if (!cell) {
              return null;
            }
            const row = Math.floor(index / board.cols);
            const col = index % board.cols;
            const baseX = col * cellSize;
            const baseY = row * cellSize;
            const radius = Math.max(4, cellSize * 0.2);
            const inset = Math.max(2, cellSize * 0.08);

            let x = baseX + inset;
            let y = baseY + inset;
            let scale = 1;

            if (animation?.kind === 'moving') {
              const fall = fallById.get(cell.id);
              const shift = shiftById.get(cell.id);
              const fromRow = fall ? fall.fromRow : row;
              const fromCol = shift ? shift.fromCol : col;
              const p = animation.progress;
              x = (fromCol + (col - fromCol) * p) * cellSize + inset;
              y = (fromRow + (row - fromRow) * p) * cellSize + inset;
            }

            const isSelected = selectedSet.has(`${row},${col}`);
            const fill = palette[cell.color % palette.length] ?? '#cccccc';

            if (animation?.kind === 'clearing' && animation.plan.clearedIds.includes(cell.id)) {
              return null;
            }

            return (
              <SkiaGroup
                key={cell.id}
                transform={[
                  { translateX: x + ((cellSize - inset * 2) * (1 - scale)) / 2 },
                  { translateY: y + ((cellSize - inset * 2) * (1 - scale)) / 2 },
                  { scale },
                  { translateX: -(x + ((cellSize - inset * 2) * (1 - scale)) / 2) },
                  { translateY: -(y + ((cellSize - inset * 2) * (1 - scale)) / 2) },
                ]}
              >
                <RoundedRect
                  x={x}
                  y={y}
                  width={cellSize - inset * 2}
                  height={cellSize - inset * 2}
                  r={radius}
                  color={fill}
                />
                {isSelected ? (
                  <RoundedRect
                    x={x + 2}
                    y={y + 2}
                    width={cellSize - inset * 2 - 4}
                    height={cellSize - inset * 2 - 4}
                    r={Math.max(2, radius - 2)}
                    color={alphaHex('#FFFFFF', 0.2)}
                  />
                ) : null}
              </SkiaGroup>
            );
          })}

          {animation?.kind === 'clearing'
            ? animation.plan.clearedIds.map((id) => {
                const pos = sourcePosById.get(id);
                if (!pos) {
                  return null;
                }
                const p = animation.progress;
                const inset = Math.max(2, cellSize * 0.08);
                const radius = Math.max(4, cellSize * 0.2);
                const baseX = pos.col * cellSize + inset;
                const baseY = pos.row * cellSize + inset;
                const w = (cellSize - inset * 2) * (1 - p * 0.45);
                const h = (cellSize - inset * 2) * (1 - p * 0.45);
                const x = baseX + ((cellSize - inset * 2) - w) / 2;
                const y = baseY + ((cellSize - inset * 2) - h) / 2;

                return (
                  <RoundedRect
                    key={`cleared-${id}`}
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    r={radius}
                    color={alphaHex(palette[pos.color % palette.length] ?? '#cccccc', 1 - p)}
                  />
                );
              })
            : null}
        </Canvas>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: '#1D1D2C',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

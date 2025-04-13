import React, { useMemo } from "react";
import { FixedSizeGrid, FixedSizeList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";

type VirtualizedGridProps<T> = {
  items: T[];
  renderItem: (item: T, index: number, isLastItem: boolean) => React.ReactNode;
  columnCount: number;
  rowHeight: number;
  className?: string;
  lastItemRef?: (node: HTMLDivElement | null) => void;
  viewMode?: "grid" | "compact-grid" | "list";
};

function VirtualizedGrid<T>({
  items,
  renderItem,
  columnCount,
  rowHeight,
  className = "",
  lastItemRef,
  viewMode = "grid",
}: VirtualizedGridProps<T>) {
  const rowCount = useMemo(
    () => Math.ceil(items.length / columnCount),
    [items.length, columnCount],
  );

  // For list view, use FixedSizeList instead of grid
  if (viewMode === "list") {
    return (
      <div className={`h-full w-full ${className}`} style={{ height: "80vh" }}>
        <AutoSizer>
          {({ height, width }) => (
            <FixedSizeList
              height={height}
              width={width}
              itemCount={items.length}
              itemSize={84} // Height of a list item (adjust as needed)
              overscanCount={5}
            >
              {({ index, style }) => {
                const item = items[index];
                const isLastItem = index === items.length - 1;
                return (
                  <div style={style} ref={isLastItem ? lastItemRef : null}>
                    {renderItem(item, index, isLastItem)}
                  </div>
                );
              }}
            </FixedSizeList>
          )}
        </AutoSizer>
      </div>
    );
  }

  // Grid view (default and compact)
  return (
    <div className={`h-full w-full ${className}`} style={{ height: "80vh" }}>
      <AutoSizer>
        {({ height, width }) => {
          const columnWidth = width / columnCount;

          return (
            <FixedSizeGrid
              columnCount={columnCount}
              columnWidth={columnWidth}
              height={height}
              rowCount={rowCount}
              rowHeight={rowHeight}
              width={width}
              overscanRowCount={2}
            >
              {({ columnIndex, rowIndex, style }) => {
                const itemIndex = rowIndex * columnCount + columnIndex;
                if (itemIndex >= items.length) {
                  return null;
                }

                const item = items[itemIndex];
                const isLastItem = itemIndex === items.length - 1;

                return (
                  <div style={style}>
                    <div
                      ref={isLastItem ? lastItemRef : null}
                      className="h-full w-full p-2"
                    >
                      {renderItem(item, itemIndex, isLastItem)}
                    </div>
                  </div>
                );
              }}
            </FixedSizeGrid>
          );
        }}
      </AutoSizer>
    </div>
  );
}

export default VirtualizedGrid;

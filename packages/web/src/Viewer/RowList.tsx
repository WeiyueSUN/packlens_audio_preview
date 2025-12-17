import { notUndefined, useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import "react18-json-view/src/style.css";
import "react18-json-view/src/dark.css";
import styled from "@emotion/styled";
import { PageState } from "../Host/PageState";
import Row from "./Row";

const Container = styled.div`
  height: 100%;
  max-height: 100%;
  width: 100%;
  display: flex;
  overflow: auto;
`;

const RowIndex = styled.code`
  min-width: 3rem;
  padding-left: 1rem;
`;

export interface RowListProps {
  pageState: PageState;
  totalEntities: number;
  loadData: (index: number) => void;
  collapsed: number | boolean;
}

export default function RowList({
  pageState,
  totalEntities,
  loadData,
  collapsed,
}: RowListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: totalEntities,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
  });
  const virtualItems = virtualizer.getVirtualItems();

  // Load previous page of data when the first item is visible
  useEffect(() => {
    const firstItem = virtualItems[0];
    if (!firstItem || firstItem.index === 0) {
      return;
    }

    if (
      firstItem.index - 10 < pageState.minIndex &&
      pageState.hasPreviousPage
    ) {
      loadData(pageState.minPage - 1);
    }
  }, [
    pageState.hasPreviousPage,
    loadData,
    pageState.minIndex,
    pageState.minPage,
    virtualItems,
  ]);

  // Load next page of data when the last item is visible
  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];

    if (!lastItem) {
      return;
    }

    if (lastItem.index + 10 >= pageState.maxIndex && pageState.hasNextPage) {
      loadData(pageState.maxPage + 1);
    }
  }, [
    pageState.hasNextPage,
    loadData,
    pageState.maxIndex,
    pageState.maxPage,
    virtualItems,
  ]);

  const [before, after] =
    totalEntities > 0 && virtualItems.length > 0
      ? [
          notUndefined(virtualItems[0]).start -
            virtualizer.options.scrollMargin,
          virtualizer.getTotalSize() -
            notUndefined(virtualItems[virtualItems.length - 1]).end,
        ]
      : [0, 0];

  return (
    <Container ref={parentRef}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        <div style={{ height: `${before}px` }} />
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.index}
            ref={virtualizer.measureElement}
            data-index={virtualItem.index}
            style={{ display: "flex", minHeight: "32px" }}
          >
            <RowIndex>{virtualItem.index + 1}</RowIndex>
            <Row
              key={virtualItem.key}
              data={pageState.data.get(virtualItem.index)!}
              collapsed={collapsed}
            />
          </div>
        ))}
        <div style={{ height: `${after}px` }} />
      </div>
    </Container>
  );
}

import { useRef, useState } from "react";

const RECORD_BATCH_SIZE = 10;

export default function useInfiniteScroll(
  records,
  label,
  batchSize = RECORD_BATCH_SIZE,
) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const scrollRef = useRef(null);
  const loadedAtCount = useRef(0);
  const lastLoadAt = useRef(0);

  function loadNextBatch() {
    const now = Date.now();
    if (
      visibleCount >= records.length ||
      loadedAtCount.current === visibleCount ||
      now - lastLoadAt.current < 300
    )
      return;

    loadedAtCount.current = visibleCount;
    lastLoadAt.current = now;
    setVisibleCount((count) => Math.min(count + batchSize, records.length));
  }

  function handleScroll(event) {
    const container = event.currentTarget;
    const reachedBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <=
      2;
    if (reachedBottom) loadNextBatch();
  }

  function handleWheel(event) {
    const container = event.currentTarget;
    const hasVerticalOverflow =
      container.scrollHeight > container.clientHeight + 1;
    const bottomIsVisible =
      container.getBoundingClientRect().bottom <= window.innerHeight + 2;

    if (!hasVerticalOverflow && event.deltaY > 0 && bottomIsVisible) {
      loadNextBatch();
    }
  }

  function reset() {
    loadedAtCount.current = 0;
    lastLoadAt.current = 0;
    setVisibleCount(batchSize);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  return {
    rows: records.slice(0, visibleCount),
    reset,
    scrollProps: {
      ref: scrollRef,
      role: "region",
      tabIndex: 0,
      "aria-label": label,
      onScroll: handleScroll,
      onWheel: handleWheel,
    },
  };
}

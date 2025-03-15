import React, { useEffect, useState, useCallback, useRef } from "react";
import { AlbumCard, AlbumCardList } from "@/components/ui/album";
import AlbumView from "@/components/ui/album-view";
import Spinner from "@/components/ui/spinner";

export default function Albums() {
  const [albums, setAlbums] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [view, setView] = useState<"grid" | "list" | "compact">("grid"); // New state for view type
  const [sortBy, setSortBy] = useState("name"); // New state for sort criteria
  const [sortOrder, setSortOrder] = useState("asc"); // New state for sort order
  const observer = useRef<IntersectionObserver | null>(null);

  const sortAlbums = (albums, sortBy, sortOrder) => {
    return [...albums].sort((a, b) => {
      if (a[sortBy] < b[sortBy]) return sortOrder === "asc" ? -1 : 1;
      if (a[sortBy] > b[sortBy]) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  };

  const loadAlbums = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    if (page > 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    try {
      const newAlbums = await window.ipc.invoke("getAlbums", page);
      if (newAlbums.length === 0) {
        setHasMore(false);
      } else {
        setAlbums((prevAlbums) => {
          const updatedAlbums = [...prevAlbums, ...newAlbums];
          return sortAlbums(updatedAlbums, sortBy, sortOrder);
        });
        setPage((prevPage) => prevPage + 1);
      }
    } catch (error) {
      console.error("Error loading albums:", error);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, sortBy, sortOrder]);

  useEffect(() => {
    loadAlbums();
  }, [sortBy, sortOrder]);

  const handleSortChange = (newSortBy) => {
    setAlbums((prevAlbums) => {
      let newSortOrder = "asc";
      if (sortBy === newSortBy) {
        newSortOrder = sortOrder === "asc" ? "desc" : "asc";
        setSortOrder(newSortOrder);
      } else {
        setSortBy(newSortBy);
        setSortOrder("asc");
      }
      return sortAlbums(prevAlbums, newSortBy, newSortOrder);
    });
  };

  const lastAlbumElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadAlbums();
        }
      });
      if (node) observer.current.observe(node);
    },
    [loadAlbums, hasMore, loading],
  );

  const renderAlbums = () => {
    if (view === "grid") {
      return (
        <div className="grid w-full grid-cols-5 gap-8">
          {albums.map((album, index) => (
            <div
              key={album.id}
              ref={index === albums.length - 1 ? lastAlbumElementRef : null}
            >
              <AlbumCard album={album} />
            </div>
          ))}
        </div>
      );
    } else if (view === "list") {
      return (
        <div className="flex w-full flex-col gap-4">
          <div className="ml-16 flex items-center justify-between p-3">
            <button onClick={() => handleSortChange("name")}>
              Album Name{" "}
              {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
            </button>
            <button onClick={() => handleSortChange("artist")}>
              Artist {sortBy === "artist" && (sortOrder === "asc" ? "↑" : "↓")}
            </button>
            <div className=""># of Songs</div>
            <button onClick={() => handleSortChange("duration")}>
              Duration{" "}
              {sortBy === "duration" && (sortOrder === "asc" ? "↑" : "↓")}
            </button>
          </div>
          {albums.map((album, index) => (
            <div
              key={album.id}
              ref={index === albums.length - 1 ? lastAlbumElementRef : null}
              className="w-full"
            >
              <AlbumCardList album={album} />
            </div>
          ))}
        </div>
      );
    } else if (view === "compact") {
      return (
        <div className="grid w-full grid-cols-8 gap-4">
          {albums.map((album, index) => (
            <div
              key={album.id}
              ref={index === albums.length - 1 ? lastAlbumElementRef : null}
            >
              <AlbumCard album={album} />
            </div>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="mt-4 text-lg font-medium leading-6">Albums</div>
          <div className="opacity-50">All of your albums in one place.</div>
        </div>
        <AlbumView onViewChange={setView} currentView={view} />
      </div>
      {renderAlbums()}
      {loading && (
        <div className="flex w-full items-center justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}

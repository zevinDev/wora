// Global album cache to persist album data between page navigations
interface Album {
  id: number;
  name: string;
  artist: string;
  cover: string | null;
  year: number | null;
  duration?: number; // Adding optional duration property
}

// Define the type for our global album cache
interface AlbumCacheStore {
  allAlbums: Album[];
  filteredAlbums: Album[];
  searchResults: Album[];
  lastSearchQuery: string;
  sortBy: string;
  sortOrder: string;
  viewMode: "grid" | "compact-grid" | "list";
  page: number;
  hasMore: boolean;
  lastFetchTime: number; // To determine if cache is stale
  isInitialized: boolean;
  albumsWithSongs: Record<number, any>; // Cache for albums with songs
}

// Default initial state
const initialState: AlbumCacheStore = {
  allAlbums: [],
  filteredAlbums: [],
  searchResults: [],
  lastSearchQuery: "",
  sortBy: "name",
  sortOrder: "asc",
  viewMode: "grid",
  page: 1,
  hasMore: true,
  lastFetchTime: 0,
  isInitialized: false,
  albumsWithSongs: {},
};

// Cache invalidation interval (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

class AlbumCache {
  private static instance: AlbumCache;
  private store: AlbumCacheStore = { ...initialState };

  private constructor() {
    // Initialize with saved cache if available
    if (typeof window !== "undefined") {
      const savedCache = localStorage.getItem("albumCache");
      if (savedCache) {
        try {
          const parsedCache = JSON.parse(savedCache);
          // Only restore if the cache isn't stale
          if (Date.now() - parsedCache.lastFetchTime < CACHE_TTL) {
            this.store = parsedCache;
          }
        } catch (error) {
          console.error("Error parsing album cache from localStorage:", error);
        }
      }
    }
  }

  // Get singleton instance
  public static getInstance(): AlbumCache {
    if (!AlbumCache.instance) {
      AlbumCache.instance = new AlbumCache();
    }
    return AlbumCache.instance;
  }

  // Function to sort albums
  public sortAlbums(
    albums: Album[],
    sortBy: string,
    sortOrder: string,
  ): Album[] {
    return [...albums].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "artist":
          comparison = a.artist.localeCompare(b.artist);
          break;
        case "year":
          // Handle null years by considering them as "0" for sorting purposes
          const yearA = a.year || 0;
          const yearB = b.year || 0;
          comparison = yearA - yearB;
          break;
        case "duration":
          // First check if the album objects have duration properties
          if (a.duration && b.duration) {
            comparison = a.duration - b.duration;
            break;
          }

          // Fall back to calculating duration from songs if not available directly
          // Get album durations from cache
          const albumWithSongsA = this.store.albumsWithSongs[a.id];
          const albumWithSongsB = this.store.albumsWithSongs[b.id];

          // Calculate total duration for each album
          const durationA =
            a.duration ||
            albumWithSongsA?.songs?.reduce(
              (total, song) => total + (song.duration || 0),
              0,
            ) ||
            0;
          const durationB =
            b.duration ||
            albumWithSongsB?.songs?.reduce(
              (total, song) => total + (song.duration || 0),
              0,
            ) ||
            0;

          comparison = durationA - durationB;
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }

  // Get all albums
  public getAllAlbums(): Album[] {
    return this.store.allAlbums;
  }

  // Get filtered albums
  public getFilteredAlbums(): Album[] {
    return this.store.filteredAlbums;
  }

  // Get search results
  public getSearchResults(): Album[] {
    return this.store.searchResults;
  }

  // Get current pagination page
  public getPage(): number {
    return this.store.page;
  }

  // Check if cache has been initialized
  public isInitialized(): boolean {
    return this.store.isInitialized;
  }

  // Check if there are more albums to load
  public hasMore(): boolean {
    return this.store.hasMore;
  }

  // Get current sort settings
  public getSortSettings(): { sortBy: string; sortOrder: string } {
    return {
      sortBy: this.store.sortBy,
      sortOrder: this.store.sortOrder,
    };
  }

  // Get current view mode
  public getViewMode(): "grid" | "compact-grid" | "list" {
    return this.store.viewMode;
  }

  // Get last search query
  public getLastSearchQuery(): string {
    return this.store.lastSearchQuery;
  }

  // Check if the cache is stale
  public isStale(): boolean {
    return Date.now() - this.store.lastFetchTime > CACHE_TTL;
  }

  // Set all albums
  public setAllAlbums(albums: Album[]): void {
    this.store.allAlbums = albums;
    this.store.lastFetchTime = Date.now();
    this.saveToLocalStorage();
  }

  // Add more albums to the existing collection (for pagination)
  public addAlbums(newAlbums: Album[]): void {
    // Filter out duplicates based on album ID
    const existingIds = new Set(this.store.allAlbums.map((album) => album.id));
    const uniqueNewAlbums = newAlbums.filter(
      (album) => !existingIds.has(album.id),
    );

    this.store.allAlbums = [...this.store.allAlbums, ...uniqueNewAlbums];
    this.store.lastFetchTime = Date.now();
    this.saveToLocalStorage();
  }

  // Set filtered albums
  public setFilteredAlbums(albums: Album[]): void {
    this.store.filteredAlbums = albums;
    this.saveToLocalStorage();
  }

  // Set search results
  public setSearchResults(albums: Album[], query: string): void {
    this.store.searchResults = albums;
    this.store.lastSearchQuery = query;
    this.saveToLocalStorage();
  }

  // Update pagination state
  public updatePagination(page: number, hasMore: boolean): void {
    this.store.page = page;
    this.store.hasMore = hasMore;
    this.saveToLocalStorage();
  }

  // Update sort settings
  public updateSortSettings(sortBy: string, sortOrder: string): void {
    this.store.sortBy = sortBy;
    this.store.sortOrder = sortOrder;
    this.saveToLocalStorage();
  }

  // Update view mode
  public updateViewMode(viewMode: "grid" | "compact-grid" | "list"): void {
    this.store.viewMode = viewMode;
    this.saveToLocalStorage();
  }

  // Get album with songs (for duration calculation)
  public async getAlbumWithSongs(albumId: number): Promise<any> {
    if (this.store.albumsWithSongs[albumId]) {
      return this.store.albumsWithSongs[albumId];
    }

    try {
      // Fetch album with songs from the main process
      const albumWithSongs = await window.ipc.invoke(
        "getAlbumWithSongs",
        albumId,
      );

      // Cache the result
      this.store.albumsWithSongs[albumId] = albumWithSongs;
      this.saveToLocalStorage();

      return albumWithSongs;
    } catch (error) {
      console.error(
        `Error fetching album with songs for ID ${albumId}:`,
        error,
      );
      return null;
    }
  }

  // Mark cache as initialized
  public setInitialized(): void {
    this.store.isInitialized = true;
    this.saveToLocalStorage();
  }

  // Reset cache
  public resetCache(): void {
    this.store = { ...initialState };
    if (typeof window !== "undefined") {
      localStorage.removeItem("albumCache");
    }
  }

  // Reset state with specific values (for page resets)
  public resetState(resetData: Partial<AlbumCacheStore>): void {
    // Apply default values from initial state and then override with any provided resetData
    const currentAlbums = this.store.allAlbums; // Keep the albums data

    // Reset specific fields while preserving album data
    this.store = {
      ...initialState,
      allAlbums: currentAlbums,
      filteredAlbums: currentAlbums,
      viewMode: resetData.viewMode || initialState.viewMode,
      sortBy: resetData.sortBy || initialState.sortBy,
      sortOrder: resetData.sortOrder || initialState.sortOrder,
      page: resetData.page || initialState.page,
      lastFetchTime: Date.now(),
      isInitialized: true, // Keep initialized status
      albumsWithSongs: this.store.albumsWithSongs, // Keep album details
    };

    // If reset includes specific sort options, apply sorting to filtered albums
    if (currentAlbums.length > 0) {
      this.store.filteredAlbums = this.sortAlbums(
        currentAlbums,
        this.store.sortBy,
        this.store.sortOrder,
      );
    }

    // Clear localStorage to ensure values are truly reset
    if (typeof window !== "undefined") {
      localStorage.removeItem("albumCache");
      // Save the new state
      this.saveToLocalStorage();
    }

    console.log("Album cache reset successfully with settings:", {
      viewMode: this.store.viewMode,
      sortBy: this.store.sortBy,
      sortOrder: this.store.sortOrder,
      page: this.store.page,
    });
  }

  // Save cache to localStorage
  private saveToLocalStorage(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("albumCache", JSON.stringify(this.store));
      } catch (error) {
        console.error("Error saving album cache to localStorage:", error);
      }
    }
  }
}

export const albumCache = AlbumCache.getInstance();
export default albumCache;

// Global song cache to persist song data between page navigations
import { Song } from "@/context/playerContext";

// Define the type for our global song cache
interface SongCacheStore {
  allSongs: Song[]; // Complete song library (when fetched)
  filteredSongs: Song[]; // Current filtered/sorted view
  searchResults: Song[]; // Recent search results
  lastSearchQuery: string;
  sortBy: string;
  sortOrder: string;
  page: number;
  hasMore: boolean;
  lastFetchTime: number; // To determine if cache is stale
  isInitialized: boolean;
}

// Default initial state
const initialState: SongCacheStore = {
  allSongs: [],
  filteredSongs: [],
  searchResults: [],
  lastSearchQuery: "",
  sortBy: "name",
  sortOrder: "asc",
  page: 1,
  hasMore: true,
  lastFetchTime: 0,
  isInitialized: false,
};

// Cache invalidation interval (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

class SongCache {
  private static instance: SongCache;
  private store: SongCacheStore = { ...initialState };

  private constructor() {
    // Initialize with saved cache if available
    if (typeof window !== "undefined") {
      const savedCache = localStorage.getItem("songCache");
      if (savedCache) {
        try {
          const parsedCache = JSON.parse(savedCache);
          // Only restore if the cache isn't stale
          if (Date.now() - parsedCache.lastFetchTime < CACHE_TTL) {
            this.store = parsedCache;
          }
        } catch (error) {
          console.error("Error parsing song cache from localStorage:", error);
        }
      }
    }
  }

  // Get singleton instance
  public static getInstance(): SongCache {
    if (!SongCache.instance) {
      SongCache.instance = new SongCache();
    }
    return SongCache.instance;
  }

  // Function to sort songs
  public sortSongs(songs: Song[], sortBy: string, sortOrder: string): Song[] {
    return [...songs].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "artist":
          comparison = a.artist.localeCompare(b.artist);
          break;
        case "album":
          comparison = a.album.name.localeCompare(b.album.name);
          break;
        case "duration":
          comparison = a.duration - b.duration;
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }

  // Get all songs
  public getAllSongs(): Song[] {
    return this.store.allSongs;
  }

  // Get filtered songs
  public getFilteredSongs(): Song[] {
    return this.store.filteredSongs;
  }

  // Get search results
  public getSearchResults(): Song[] {
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

  // Check if there are more songs to load
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

  // Get last search query
  public getLastSearchQuery(): string {
    return this.store.lastSearchQuery;
  }

  // Check if the cache is stale
  public isStale(): boolean {
    return Date.now() - this.store.lastFetchTime > CACHE_TTL;
  }

  // Set all songs
  public setAllSongs(songs: Song[]): void {
    this.store.allSongs = songs;
    this.store.lastFetchTime = Date.now();
    this.saveToLocalStorage();
  }

  // Add more songs to the existing collection (for pagination)
  public addSongs(newSongs: Song[]): void {
    // Filter out duplicates based on song ID
    const existingIds = new Set(this.store.allSongs.map((song) => song.id));
    const uniqueNewSongs = newSongs.filter((song) => !existingIds.has(song.id));

    this.store.allSongs = [...this.store.allSongs, ...uniqueNewSongs];
    this.store.lastFetchTime = Date.now();
    this.saveToLocalStorage();
  }

  // Set filtered songs
  public setFilteredSongs(songs: Song[]): void {
    this.store.filteredSongs = songs;
    this.saveToLocalStorage();
  }

  // Set search results
  public setSearchResults(songs: Song[], query: string): void {
    this.store.searchResults = songs;
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

  // Mark cache as initialized
  public setInitialized(): void {
    this.store.isInitialized = true;
    this.saveToLocalStorage();
  }

  // Reset cache
  public resetCache(): void {
    this.store = { ...initialState };
    if (typeof window !== "undefined") {
      localStorage.removeItem("songCache");
    }
  }

  // Reset state with specific values (for page resets)
  public resetState(resetData: Partial<SongCacheStore>): void {
    // Apply default values from initial state and then override with any provided resetData
    const currentSongs = this.store.allSongs; // Keep the songs data

    // Reset specific fields while preserving song data
    this.store = {
      ...initialState,
      allSongs: currentSongs,
      filteredSongs: currentSongs,
      sortBy: resetData.sortBy || initialState.sortBy,
      sortOrder: resetData.sortOrder || initialState.sortOrder,
      page: resetData.page || initialState.page,
      lastFetchTime: Date.now(),
      isInitialized: true, // Keep initialized status
    };

    // If reset includes specific sort options, apply sorting to filtered songs
    if (currentSongs.length > 0) {
      this.store.filteredSongs = this.sortSongs(
        currentSongs,
        this.store.sortBy,
        this.store.sortOrder,
      );
    }

    // Clear localStorage to ensure values are truly reset
    if (typeof window !== "undefined") {
      localStorage.removeItem("songCache");
      // Save the new state
      this.saveToLocalStorage();
    }

    console.log("Song cache reset successfully with settings:", {
      sortBy: this.store.sortBy,
      sortOrder: this.store.sortOrder,
      page: this.store.page,
    });
  }

  // Save cache to localStorage
  private saveToLocalStorage(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("songCache", JSON.stringify(this.store));
      } catch (error) {
        console.error("Error saving song cache to localStorage:", error);
      }
    }
  }
}

export const songCache = SongCache.getInstance();
export default songCache;

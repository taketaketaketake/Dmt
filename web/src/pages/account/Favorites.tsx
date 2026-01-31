import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Portrait } from "../../components/ui";
import { favorites as favoritesApi, type FavoriteItem } from "../../lib/api";
import { usePageTitle } from "../../hooks/usePageTitle";
import styles from "./Favorites.module.css";

export function FavoritesPage() {
  usePageTitle("Favorites");
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    favoritesApi
      .list()
      .then((data) => {
        setFavorites(data.favorites);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load favorites");
        setIsLoading(false);
      });
  }, []);

  const removeFavorite = useCallback(async (profileId: string) => {
    setRemovingIds((prev) => new Set(prev).add(profileId));
    setRemoveError(null);
    try {
      await favoritesApi.remove(profileId);
      setFavorites((prev) => prev.filter((f) => f.profile.id !== profileId));
    } catch {
      setRemoveError("Failed to remove favorite. Please try again.");
      setTimeout(() => setRemoveError(null), 3000);
    }
    setRemovingIds((prev) => {
      const next = new Set(prev);
      next.delete(profileId);
      return next;
    });
  }, []);

  if (isLoading) {
    return (
      <div>
        <header className={styles.header}>
          <h1 className={styles.title}>Favorites</h1>
        </header>
        <p className={styles.message}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <header className={styles.header}>
          <h1 className={styles.title}>Favorites</h1>
        </header>
        <p className={styles.message}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>Favorites</h1>
        <p className={styles.subtitle}>
          {favorites.length} {favorites.length === 1 ? "person" : "people"} saved
        </p>
      </header>

      {removeError && <p className={styles.error}>{removeError}</p>}

      {favorites.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyText}>
            No favorites yet. Browse the directory and save people you want to remember.
          </p>
          <Link to="/people" className={styles.browseLink}>
            Browse directory
          </Link>
        </div>
      ) : (
        <div className={styles.list}>
          {favorites.map((favorite) => (
            <div key={favorite.id} className={styles.card}>
              <Link
                to={`/people/${favorite.profile.handle}`}
                className={styles.profileLink}
              >
                <Portrait
                  src={favorite.profile.portraitUrl}
                  alt={favorite.profile.name}
                  size="md"
                />
                <div className={styles.profileInfo}>
                  <p className={styles.name}>{favorite.profile.name}</p>
                  <p className={styles.handle}>@{favorite.profile.handle}</p>
                </div>
              </Link>

              <button
                className={styles.removeButton}
                onClick={() => removeFavorite(favorite.profile.id)}
                disabled={removingIds.has(favorite.profile.id)}
              >
                {removingIds.has(favorite.profile.id) ? "Removing..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

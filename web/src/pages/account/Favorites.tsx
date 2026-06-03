import { useCallback } from "react";
import { Link } from "react-router-dom";
import { Portrait } from "../../components/ui";
import { useFavoritesList, useRemoveFavorite } from "../../hooks/queries";
import { usePageTitle } from "../../hooks/usePageTitle";
import styles from "./Favorites.module.css";

export function FavoritesPage() {
  usePageTitle("Favorites");
  const { data: favorites = [], isPending, error } = useFavoritesList();
  const removeMutation = useRemoveFavorite();
  // The profile id currently being removed, for per-row button state.
  const removingId = removeMutation.isPending ? removeMutation.variables : undefined;
  const removeError = removeMutation.isError;

  const removeFavorite = useCallback(
    (profileId: string) => {
      removeMutation.mutate(profileId);
    },
    [removeMutation]
  );

  if (isPending) {
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
        <p className={styles.message}>{error.message || "Failed to load favorites"}</p>
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

      {removeError && (
        <p className={styles.error}>Failed to remove favorite. Please try again.</p>
      )}

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
                disabled={removingId === favorite.profile.id}
              >
                {removingId === favorite.profile.id ? "Removing..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

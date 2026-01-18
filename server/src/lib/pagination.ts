// =============================================================================
// PAGINATION
// Consistent pagination for collection endpoints
// =============================================================================

/**
 * Default and maximum limits for pagination
 */
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

/**
 * Parse and validate pagination parameters from query string
 */
export function parsePagination(query: {
  limit?: string;
  offset?: string;
}): { limit: number; offset: number } {
  let limit = parseInt(query.limit || "", 10);
  let offset = parseInt(query.offset || "", 10);

  // Apply defaults and bounds
  if (isNaN(limit) || limit < 1) {
    limit = PAGINATION.DEFAULT_LIMIT;
  } else if (limit > PAGINATION.MAX_LIMIT) {
    limit = PAGINATION.MAX_LIMIT;
  }

  if (isNaN(offset) || offset < 0) {
    offset = 0;
  }

  return { limit, offset };
}

/**
 * Build pagination metadata for response
 */
export function paginationMeta(
  total: number,
  limit: number,
  offset: number
): {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
} {
  return {
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}

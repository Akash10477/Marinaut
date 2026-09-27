// ?page=2&limit=10 -> { page, limit, skip }
const getPagination = (query, defaultLimit = 10) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const paginated = (items, total, page, limit) => ({
  items,
  pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 }
});

// escape special characters before building a regex from user input
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = { getPagination, paginated, escapeRegex };

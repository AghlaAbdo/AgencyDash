'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface Agency {
  id: string;
  name: string;
  state: string;
  state_code: string;
  type: string;
  population: number | null;
  website: string | null;
  county: string | null;
  created_at: string;
  updated_at: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export default function AgenciesPage() {
  const searchParams = useSearchParams();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [filters, setFilters] = useState({
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10'),
    state: searchParams.get('state') || '',
    type: searchParams.get('type') || '',
    search: searchParams.get('search') || '',
    sortBy: searchParams.get('sortBy') || 'name',
    sortOrder: searchParams.get('sortOrder') || 'asc',
  });

  useEffect(() => {
    fetchAgencies();
  }, [filters]);

  const fetchAgencies = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('page', filters.page.toString());
      params.append('limit', filters.limit.toString());

      if (filters.state) params.append('state', filters.state);
      if (filters.type) params.append('type', filters.type);
      if (filters.search) params.append('search', filters.search);
      params.append('sortBy', filters.sortBy);
      params.append('sortOrder', filters.sortOrder);

      const response = await fetch(`/api/agencies?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch agencies');
      }

      const result = await response.json();
      setAgencies(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching agencies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handleSort = (sortBy: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy,
      sortOrder:
        prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (filters.sortBy !== column) return <span className="text-gray-400">⇅</span>;
    return filters.sortOrder === 'asc' ? <span>↑</span> : <span>↓</span>;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Agencies</h1>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                placeholder="Agency name or county..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* State Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                placeholder="e.g., CA"
                value={filters.state}
                onChange={(e) =>
                  handleFilterChange('state', e.target.value.toUpperCase())
                }
                maxLength={2}
                className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="City">City</option>
                <option value="County">County</option>
              </select>
            </div>

            {/* Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Per Page
              </label>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                className="w-full px-3 text-gray-600 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Reset */}
            <div className="flex items-end">
              <button
                onClick={() =>
                  setFilters({
                    page: 1,
                    limit: 10,
                    state: '',
                    type: '',
                    search: '',
                    sortBy: 'name',
                    sortOrder: 'asc',
                  })
                }
                className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Loading agencies...</p>
          </div>
        )}

        {/* Table */}
        {!loading && agencies.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" style={{ tableLayout: 'fixed', minWidth: '1400px' }}>
                <thead className="bg-gray-100 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="w-[18%] px-4 py-3 text-left whitespace-nowrap">
                      <button
                        onClick={() => handleSort('name')}
                        className="font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-2"
                      >
                        Name <SortIcon column="name" />
                      </button>
                    </th>
                    <th className="w-[12%] px-4 py-3 text-left whitespace-nowrap">
                      <button
                        onClick={() => handleSort('state')}
                        className="font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-2"
                      >
                        State <SortIcon column="state" />
                      </button>
                    </th>
                    <th className="w-[6%] px-4 py-3 text-left whitespace-nowrap">
                      <button
                        onClick={() => handleSort('type')}
                        className="font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-2"
                      >
                        Type <SortIcon column="type" />
                      </button>
                    </th>
                    <th className="w-[12%] px-4 py-3 text-left whitespace-nowrap font-semibold text-gray-700">
                      County
                    </th>
                    <th className="w-[12%] px-4 py-3 text-left whitespace-nowrap">
                      <button
                        onClick={() => handleSort('population')}
                        className="font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-2"
                      >
                        Population <SortIcon column="population" />
                      </button>
                    </th>
                    <th className="w-[14%] px-4 py-3 text-left whitespace-nowrap font-semibold text-gray-700">
                      Website
                    </th>
                    <th className="w-[8%] px-4 py-3 text-left whitespace-nowrap font-semibold text-gray-700">
                      Created
                    </th>
                    <th className="w-[8%] px-4 py-3 text-left whitespace-nowrap font-semibold text-gray-700">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {agencies.map((agency) => (
                    <tr
                      key={agency.id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="w-[18%] px-4 py-4 font-medium text-gray-900 break-words">
                        {agency.name}
                      </td>
                      <td className="w-[12%] px-4 py-4 text-gray-600 break-words">
                        {agency.state} ({agency.state_code})
                      </td>
                      <td className="w-[10%] px-4 py-4 break-words">
                        <span className="inline-block px-2 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded">
                          {agency.type}
                        </span>
                      </td>
                      <td className="w-[12%] px-4 py-4 text-gray-600 break-words">
                        {agency.county || '-'}
                      </td>
                      <td className="w-[12%] px-4 py-4 text-gray-600 break-words">
                        {agency.population
                          ? agency.population.toLocaleString()
                          : '-'}
                      </td>
                      <td className="w-[14%] px-4 py-4 break-words">
                        {agency.website ? (
                          <a
                            href={agency.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            {agency.website}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="w-[11%] px-4 py-4 text-gray-600 break-words">
                        {formatDate(agency.created_at)}
                      </td>
                      <td className="w-[11%] px-4 py-4 text-gray-600 break-words">
                        {formatDate(agency.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing{' '}
                  <span className="font-medium">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}
                  </span>{' '}
                  of <span className="font-medium">{pagination.total}</span>{' '}
                  results
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPreviousPage}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition"
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from(
                      { length: pagination.totalPages },
                      (_, i) => i + 1
                    )
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === pagination.totalPages ||
                          Math.abs(p - pagination.page) <= 1
                      )
                      .map((p, i, arr) => (
                        <div key={p}>
                          {i > 0 && arr[i - 1] !== p - 1 && (
                            <span className="px-2">...</span>
                          )}
                          <button
                            onClick={() => handlePageChange(p)}
                            className={`px-3 py-2 rounded ${
                              pagination.page === p
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            } transition`}
                          >
                            {p}
                          </button>
                        </div>
                      ))}
                  </div>

                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNextPage}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && agencies.length === 0 && !error && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No agencies found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

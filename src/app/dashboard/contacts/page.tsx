'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  title: string | null;
  email_type: string | null;
  department: string | null;
  contact_form_url: string | null;
  agency_id: string | null;
  agency_name: string | null;
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

export default function ContactsPage() {
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewedToday, setViewedToday] = useState(0);
  const [remaining, setRemaining] = useState(50);
  const [limitExceeded, setLimitExceeded] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10'),
    agencyName: searchParams.get('agencyName') || '',
    search: searchParams.get('search') || '',
    sortBy: searchParams.get('sortBy') || 'last_name',
    sortOrder: searchParams.get('sortOrder') || 'asc',
  });

  useEffect(() => {
    // Only fetch if limit is not exceeded
    if (!limitExceeded) {
      fetchContacts();
    }
  }, [filters]);

  const fetchContacts = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('page', filters.page.toString());
      params.append('limit', filters.limit.toString());

      if (filters.agencyName) params.append('agencyName', filters.agencyName);
      if (filters.search) params.append('search', filters.search);
      params.append('sortBy', filters.sortBy);
      params.append('sortOrder', filters.sortOrder);

      const response = await fetch(`/api/contacts?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }

      const result = await response.json();
      setContacts(result.data);
      setPagination(result.pagination);
      setViewedToday(result.viewedToday);
      setRemaining(result.remaining);
      setLimitExceeded(result.limitExceeded);
      console.log("result:", result);
      if (result.limitExceeded) {
        setFilters({
            page: 1,
            limit: 10,
            agencyName: '',
            search: '',
            sortBy: 'last_name',
            sortOrder: 'asc',
        });
      }

      if (result.limitExceeded) {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string | number) => {
    // Prevent filter changes when limit is exceeded
    if (limitExceeded) {
      setError('You have reached your daily limit. Please upgrade to continue searching.');
      return;
    }

    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handleSort = (sortBy: string) => {
    // Prevent sorting when limit is exceeded
    if (limitExceeded) {
      setError('You have reached your daily limit. Please upgrade to continue searching.');
      return;
    }

    setFilters((prev) => ({
      ...prev,
      sortBy,
      sortOrder:
        prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };

  const handlePageChange = (newPage: number) => {
    // Prevent pagination when limit is exceeded
    if (limitExceeded) {
      setError('You have reached your daily limit. Please upgrade to continue viewing.');
      return;
    }

    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleUpgradePlan = async () => {
    try {
      const response = await fetch('/api/contacts/reset-limit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to reset daily limit');
      }

      // Reset UI state
      setViewedToday(0);
      setRemaining(50);
      setLimitExceeded(false);
      setError(null);

      // Reset filters and fetch contacts again
      setFilters({
        page: 1,
        limit: 10,
        agencyName: '',
        search: '',
        sortBy: 'last_name',
        sortOrder: 'asc',
      });

      // Fetch contacts again
      await fetchContacts();
    } catch (err) {
      console.error('Error resetting limit:', err);
      setError('Failed to reset daily limit. Please try again.');
    }
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contacts</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{viewedToday}</span> / 50 viewed today
            </div>
            <div className="w-48 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  remaining > 25
                    ? 'bg-green-500'
                    : remaining > 10
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${(viewedToday / 50) * 100}%` }}
              />
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{remaining}</span> remaining
            </div>
          </div>
        </div>

        {/* Limit Exceeded Banner */}
        {limitExceeded && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-red-500 text-xl">⚠️</div>
              <div>
                <h3 className="font-semibold text-red-800">Daily Limit Reached</h3>
                <p className="text-red-700 text-sm mt-1">
                  You have viewed 50 contacts today. Upgrade your plan to view more contacts.
                </p>
                <button 
                  onClick={handleUpgradePlan}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm font-medium"
                >
                  Upgrade Plan
                </button>
              </div>
            </div>
          </div>
        )}

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
                placeholder="Name, email..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                disabled={limitExceeded}
                className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Agency Name Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agency Name
              </label>
              <input
                type="text"
                placeholder="Filter by agency name..."
                value={filters.agencyName}
                onChange={(e) => handleFilterChange('agencyName', e.target.value)}
                disabled={limitExceeded}
                className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Per Page
              </label>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                disabled={limitExceeded}
                className="w-full px-3 text-gray-600 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Reset */}
            <div className="flex items-end lg:col-span-2">
              <button
                onClick={() => {
                  if (limitExceeded) {
                    setError('You have reached your daily limit. Please upgrade to reset filters.');
                    return;
                  }
                  setFilters({
                    page: 1,
                    limit: 10,
                    agencyName: '',
                    search: '',
                    sortBy: 'last_name',
                    sortOrder: 'asc',
                  });
                }}
                disabled={limitExceeded}
                className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && !limitExceeded && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Loading contacts...</p>
          </div>
        )}

        {/* Table */}
        {!loading && contacts.length > 0 && !limitExceeded && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" style={{ tableLayout: 'fixed' }}>
                <thead className="bg-gray-100 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="w-[8%] px-4 py-3 text-left whitespace-nowrap">
                      <button
                        onClick={() => handleSort('first_name')}
                        className="font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-2"
                      >
                        First Name <SortIcon column="first_name" />
                      </button>
                    </th>
                    <th className="w-[8%] px-4 py-3 text-left whitespace-nowrap">
                      <button
                        onClick={() => handleSort('last_name')}
                        className="font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-2"
                      >
                        Last Name <SortIcon column="last_name" />
                      </button>
                    </th>
                    <th className="w-[12%] px-4 py-3 text-left whitespace-nowrap">
                      <button
                        onClick={() => handleSort('email')}
                        className="font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-2"
                      >
                        Email <SortIcon column="email" />
                      </button>
                    </th>
                    <th className="w-[10%] px-4 py-3 text-left whitespace-nowrap">
                      <button
                        onClick={() => handleSort('phone')}
                        className="font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-2"
                      >
                        Phone <SortIcon column="phone" />
                      </button>
                    </th>
                    <th className="w-[10%] px-4 py-3 text-left whitespace-nowrap font-semibold text-gray-700">
                      Title
                    </th>
                    <th className="w-[10%] px-4 py-3 text-left whitespace-nowrap font-semibold text-gray-700">
                      Department
                    </th>
                    <th className="w-[10%] px-4 py-3 text-left whitespace-nowrap font-semibold text-gray-700">
                      Agency
                    </th>
                    <th className="w-[12%] px-4 py-3 text-left whitespace-nowrap font-semibold text-gray-700">
                      Contact Form URL
                    </th>
                    <th className="w-[9%] px-4 py-3 text-left whitespace-nowrap font-semibold text-gray-700">
                      Created
                    </th>
                    <th className="w-[11%] px-4 py-3 text-left whitespace-nowrap font-semibold text-gray-700">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="w-[8%] px-4 py-4 font-medium text-gray-900 wrap-break-word">
                        {contact.first_name || '-'}
                      </td>
                      <td className="w-[8%] px-4 py-4 font-medium text-gray-900 wrap-break-word">
                        {contact.last_name || '-'}
                      </td>
                      <td className="w-[12%] px-4 py-4 text-gray-600 wrap-break-word">
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {contact.email || '-'}
                        </a>
                      </td>
                      <td className="w-[10%] px-4 py-4 text-gray-600 wrap-break-word">
                        {contact.phone ? (
                          <a
                            href={`tel:${contact.phone}`}
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            {contact.phone}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="w-[10%] px-4 py-4 text-gray-600 wrap-break-word">
                        {contact.title || '-'}
                      </td>
                      <td className="w-[10%] px-4 py-4 text-gray-600 wrap-break-word">
                        {contact.department || '-'}
                      </td>
                      <td className="w-[10%] px-4 py-4 text-gray-600 wrap-break-word">
                        {contact.agency_name || '-'}
                      </td>
                      <td className="w-[12%] px-4 py-4 text-gray-600 wrap-break-word">
                        {contact.contact_form_url ? (
                          <a
                            href={contact.contact_form_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                            title={contact.contact_form_url}
                          >
                            {contact.contact_form_url}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="w-[9%] px-4 py-4 text-gray-600 wrap-break-word">
                        {formatDate(contact.created_at)}
                      </td>
                      <td className="w-[11%] px-4 py-4 text-gray-600 wrap-break-word">
                        {formatDate(contact.updated_at)}
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
                            } transition disabled:opacity-50 disabled:cursor-not-allowed`}
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
        {!loading && contacts.length === 0 && !error && !limitExceeded && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No contacts found matching your filters.</p>
          </div>
        )}

        {/* Limit Exceeded Empty State */}
        {!loading && limitExceeded && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">You have reached your daily contact viewing limit.</p>
          </div>
        )}
      </div>
    </div>
  );
}

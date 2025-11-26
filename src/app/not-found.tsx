import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="h-[calc(100vh-64px)] bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Page Not Found</h2>
          <p className="text-gray-600 mb-8">
            Sorry, the page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/dashboard/agencies"
            className="inline-block w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Go to Agencies
          </Link>
          <Link
            href="/dashboard/contacts"
            className="inline-block w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
          >
            Go to Contacts
          </Link>
        </div>

      </div>
    </div>
  );
}

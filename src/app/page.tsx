import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Agency & Contacts Dashboard
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Manage and explore agencies and their contact information with ease.
              Access comprehensive data about agencies across different states and view detailed contact information.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Agencies Card */}
          <div className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition">
            <div className="mb-6">
              <div className="inline-block p-3 bg-blue-100 rounded-lg mb-4">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5.5m0 0H9m0 0H3.5m0 0H1m5.5 0a2.5 2.5 0 005 0m-5 0a2.5 2.5 0 015 0m-5 0v2m5-2v2"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Agencies</h2>
              <p className="text-gray-600 mb-6">
                Explore and filter agencies across different states. View detailed information including population, location type, and official websites.
              </p>
            </div>
            <Link
              href="/dashboard/agencies"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              View Agencies →
            </Link>
          </div>

          {/* Contacts Card */}
          <div className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition">
            <div className="mb-6">
              <div className="inline-block p-3 bg-green-100 rounded-lg mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM6 20h12a6 6 0 00-6-6 6 6 0 00-6 6z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Contacts</h2>
              <p className="text-gray-600 mb-6">
                Search and manage contacts with a daily limit of 50 views. Filter by agency name, search by name or email, and sort by various fields.
              </p>
            </div>
            <Link
              href="/dashboard/contacts"
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
            >
              View Contacts →
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 bg-white rounded-lg shadow-md p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Key Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">922+</div>
              <p className="text-gray-600">Agencies to explore</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">1000+</div>
              <p className="text-gray-600">Contacts available</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">50/Day</div>
              <p className="text-gray-600">Contact view limit</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

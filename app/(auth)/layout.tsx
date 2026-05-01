import Link from 'next/link';
import { TestTube2 } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-10 text-white lg:flex">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <TestTube2 className="h-6 w-6" />
          Test Sphere
        </Link>
        <div className="space-y-6">
          <h2 className="text-3xl font-semibold leading-tight">
            Plan, execute and ship quality software with confidence.
          </h2>
          <p className="max-w-md text-white/80">
            Test Sphere helps QA teams write reusable test cases, run release-ready
            test plans and link defects directly to failed executions, all in one
            collaborative workspace.
          </p>
          <ul className="grid gap-3 text-sm text-white/85">
            <li>· Reusable test suites with versioned cases</li>
            <li>· Execution sessions with pass / fail / blocked tracking</li>
            <li>· Bugs linked to the exact failing test result</li>
            <li>· Project-level role-based access control</li>
          </ul>
        </div>
        <p className="text-xs text-white/60">© Test Sphere · A QA workspace</p>
      </div>
      <div className="flex flex-col items-center justify-center px-6 py-10">
        <div className="mb-6 flex items-center gap-2 text-base font-semibold lg:hidden">
          <TestTube2 className="h-5 w-5" />
          Test Sphere
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

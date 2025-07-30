"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const isAuthenticated = !!session;

  return (
    <nav className="bg-gray-800 text-white px-4 py-2 flex gap-4 items-center">
      <Link href="/" className="font-bold text-lg">EventApp</Link>
      <Link href="/events">Events</Link>
      <Link href="/friends">Friends</Link>
      <Link href="/groups">Groups</Link>
      <Link href="/profile">Profile</Link>
      <div className="ml-auto flex gap-4 items-center">
        {!isAuthenticated && status !== "loading" && (
          <>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </>
        )}
        {isAuthenticated && (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="bg-red-600 px-3 py-1 rounded text-white hover:bg-red-700"
          >
            Sign Out
          </button>
        )}
      </div>
    </nav>
  );
} 
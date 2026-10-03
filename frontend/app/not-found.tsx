import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-bold">That page doesn't exist</h1>
      <Link href="/" className="btn-primary mt-5">
        Start a new quote
      </Link>
    </div>
  );
}

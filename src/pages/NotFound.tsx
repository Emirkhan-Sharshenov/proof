export default function NotFound({ message = "This page doesn't exist." }: { message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
      <p className="font-display text-2xl font-bold">Not found</p>
      <p className="text-muted">{message}</p>
    </div>
  );
}

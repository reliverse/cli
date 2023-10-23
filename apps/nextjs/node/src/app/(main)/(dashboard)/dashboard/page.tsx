export default function DashboardPage(): JSX.Element {
  return (
    <main className="flex h-screen flex-col items-center bg-zinc-950">
      <div className="container mt-12 flex flex-col items-center justify-center gap-4 py-8">
        <h1 className="text-5xl font-extrabold tracking-tight">
          Reliverse: Open-Source Superapp
        </h1>
        <p className="p-4 text-center text-sm text-pink-400">
          Build a Site, Build an App, Build a Game, Build Anything
        </p>
      </div>
      <div className="h-[40vh] w-full max-w-2xl overflow-y-scroll">
        Dashboard Will Be Here Soon
      </div>
    </main>
  );
}

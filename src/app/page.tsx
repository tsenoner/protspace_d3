import Scatterplot from '@/components/Scatterplot/Scatterplot';

export default function Home() {
  return (
    <div className="flex flex-col items-center min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">ProtSpace Visualization</h1>
      <Scatterplot />
    </div>
  );
}
